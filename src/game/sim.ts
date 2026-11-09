// Simulador de ritmo (GDD §4.4). Puro: sem relógio, sem I/O. A tabela é
// impressa por scripts/sim.ts; os testes de ritmo chamam simular() direto.
//
// Estratégia gulosa: a cada instante compra a melhor opção em (ganho de renda / custo),
// entre upgrades das 4 estações e a contratação de ferreiros; a bigorna roda em modo
// automático com a receita de melhor valor por segundo; itens e excedentes são vendidos.
// O minigame NÃO é usado (o sim joga o caminho automático, o pior caso do GDD §9).
import { taxas } from './chain.ts'
import {
  ESTACOES,
  PRECO_VENDA,
  RECEITA_LINGOTE,
  type EstacaoId,
  type EstacaoProducao,
} from './constants.ts'
import { tempoForjaAtual, valorEsperadoItem } from './bigorna.ts'
import { comprarUpgrade, custoProximoNivel, vender } from './economy.ts'
import {
  FERREIROS,
  FERREIROS_DEF,
  contratar,
  custoContratar,
  type FerreiroId,
} from './ferreiros.ts'
import { venderPorQualidade } from './inventario.ts'
import { QUALIDADES, RECEITAS, TIPOS_ITEM, type Qualidade, type ReceitaId } from './items.ts'
import { estadoInicial, type GameState } from './state.ts'
import { tickDetalhado } from './tick.ts'

export interface Compra {
  t: number
  tipo: 'upgrade' | 'ferreiro'
  /** Estação (upgrade) ou id do ferreiro. */
  alvo: string
  nivel: number
  custo: number
}

export interface ResultadoSim {
  horas: number
  compras: Compra[]
  primeiraCompra: number | null
  /** Primeiro instante em que cada estação de produção chegou ao nível 10. */
  nivel10: Record<EstacaoProducao, number | null>
  /** Maior intervalo entre compras consecutivas (inclui o intervalo final até o fim da sim). */
  maiorIntervaloEntreCompras: { duracao: number; inicio: number }
  /** Maior período seguido com moedas < a opção mais barata (upgrade ou ferreiro). */
  maiorIntervaloSemComprar: { duracao: number; inicio: number }
  /** Moedas/s de venda, média do minuto que termina em cada marco. */
  moedasPorSegundo: { rotulo: string; t: number; valor: number | null }[]
  niveisFinais: Record<EstacaoId, number>
  /** Maior valor numérico visto (monitor do limite de 1e15, GDD §4.5). */
  maiorValor: number
  bigornaDesbloqueada: number | null
  /** Primeira vez que saiu um item de cada qualidade. */
  primeiraQualidade: Record<Qualidade, number | null>
  primeiroFerreiro: number | null
  itensForjados: number
  itensPorQualidade: Record<Qualidade, number>
  ferreirosFinais: { id: FerreiroId; nivel: number; estacao: EstacaoId | null }[]
}

/** Receita de melhor valor por segundo, considerando o limite de lingotes (empate: a de maior valor por lingote). */
export function escolherReceita(s: GameState): ReceitaId {
  const lingotesPorS = taxas(s).lingote
  let melhor: ReceitaId = 'espada'
  let melhorScore = -Infinity
  for (const r of TIPOS_ITEM) {
    const def = RECEITAS[r]
    const tempoEfetivo = Math.max(
      tempoForjaAtual(s, r),
      lingotesPorS > 0 ? def.lingotes / lingotesPorS : Infinity,
    )
    // Desempate por valor por lingote (mais itens por lingote sobra).
    const score = valorEsperadoItem(s, r) / tempoEfetivo + (valorEsperadoItem(s, r) / def.lingotes) * 1e-6
    if (score > melhorScore) {
      melhor = r
      melhorScore = score
    }
  }
  return melhor
}

/** Moedas/s em regime estável (vendendo tudo que sobra). Base da decisão gulosa. */
export function rendaEstavel(s: GameState): number {
  const t = taxas(s)
  let lingotesLivres = t.lingote
  let renda = 0
  if (s.niveis.bigorna >= 1) {
    const r = escolherReceita(s)
    const def = RECEITAS[r]
    const capacidade = def.lingotes / tempoForjaAtual(s, r) // lingotes/s que a bigorna aguenta
    const usado = Math.min(capacidade, t.lingote)
    renda += (usado / def.lingotes) * valorEsperadoItem(s, r)
    lingotesLivres = t.lingote - usado
  }
  const minerioLivre = Math.max(0, t.minerio - RECEITA_LINGOTE.minerio * t.lingote)
  const carvaoLivre = Math.max(0, t.carvao - RECEITA_LINGOTE.carvao * t.lingote)
  return (
    renda +
    lingotesLivres * PRECO_VENDA.lingote +
    minerioLivre * PRECO_VENDA.minerio +
    carvaoLivre * PRECO_VENDA.carvao
  )
}

/** Upgrade com maior (ganho de renda / custo). Empate: o mais barato. */
export function melhorUpgrade(s: GameState): { estacao: EstacaoId; retorno: number; custo: number } {
  const base = rendaEstavel(s)
  let melhor: EstacaoId = 'mina'
  let melhorRetorno = -Infinity
  let melhorCusto = Infinity
  for (const e of ESTACOES) {
    const custo = custoProximoNivel(s, e)
    const depois = comprarUpgrade({ ...s, moedas: custo }, e)
    const retorno = (rendaEstavel(depois) - base) / custo
    if (retorno > melhorRetorno + 1e-12 || (Math.abs(retorno - melhorRetorno) <= 1e-12 && custo < melhorCusto)) {
      melhor = e
      melhorRetorno = retorno
      melhorCusto = custo
    }
  }
  return { estacao: melhor, retorno: melhorRetorno, custo: melhorCusto }
}

/** Força bruta (no máximo ~80 combinações): a alocação dos contratados que maximiza a renda. */
export function melhorAlocacao(s: GameState): GameState {
  const contratados = FERREIROS.filter((id) => s.ferreiros[id].contratado)
  let melhor = s
  let melhorRenda = -Infinity

  const recursao = (i: number, atual: GameState, usadas: Set<EstacaoId>) => {
    if (i === contratados.length) {
      const r = rendaEstavel(atual)
      if (r > melhorRenda + 1e-12) {
        melhorRenda = r
        melhor = atual
      }
      return
    }
    const id = contratados[i]!
    for (const estacao of [...FERREIROS_DEF[id].estacoes, null]) {
      if (estacao !== null && usadas.has(estacao)) continue
      const prox: GameState = {
        ...atual,
        ferreiros: { ...atual.ferreiros, [id]: { ...atual.ferreiros[id], estacao } },
      }
      if (estacao !== null) usadas.add(estacao)
      recursao(i + 1, prox, usadas)
      if (estacao !== null) usadas.delete(estacao)
    }
  }
  recursao(0, s, new Set())
  return melhor
}

/** Melhor ferreiro para contratar agora (ignorando se dá para pagar): maior ganho / custo. */
export function melhorContratacao(s: GameState): { id: FerreiroId; retorno: number; custo: number } | null {
  const custo = custoContratar(s)
  const base = rendaEstavel(melhorAlocacao(s))
  let melhor: { id: FerreiroId; retorno: number; custo: number } | null = null
  for (const id of FERREIROS) {
    if (s.ferreiros[id].contratado) continue
    const com = melhorAlocacao({
      ...s,
      ferreiros: { ...s.ferreiros, [id]: { ...s.ferreiros[id], contratado: true } },
    })
    const retorno = (rendaEstavel(com) - base) / custo
    if (retorno > 0 && (!melhor || retorno > melhor.retorno)) melhor = { id, retorno, custo }
  }
  return melhor
}

/** Vende o excedente: lingotes acima da reserva da bigorna e minério/carvão acima de ~2 s de consumo. */
function venderExcedente(s: GameState): GameState {
  const t = taxas(s)
  let r = s
  if (s.niveis.bigorna >= 1) {
    const reserva = (s.ultimaReceita ? RECEITAS[s.ultimaReceita].lingotes : 3) * 2
    const sobra = r.recursos.lingote - reserva
    if (sobra > 0) r = vender(r, 'lingote', sobra).estado
  } else {
    r = vender(r, 'lingote', 'tudo').estado
  }
  const reservaMinerio = RECEITA_LINGOTE.minerio * t.fornalha * 2
  const reservaCarvao = RECEITA_LINGOTE.carvao * t.fornalha * 2
  const sobraMinerio = r.recursos.minerio - reservaMinerio
  if (sobraMinerio > 0) r = vender(r, 'minerio', sobraMinerio).estado
  const sobraCarvao = r.recursos.carvao - reservaCarvao
  if (sobraCarvao > 0) r = vender(r, 'carvao', sobraCarvao).estado
  return r
}

function maiorValorDe(s: GameState): number {
  return Math.max(
    s.moedas,
    s.moedasGanhas,
    s.recursos.minerio,
    s.recursos.carvao,
    s.recursos.lingote,
    ...ESTACOES.map((e) => custoProximoNivel(s, e)),
    ...s.itens.map((i) => i.valor),
  )
}

export function simular(horas: number, passo = 0.25): ResultadoSim {
  const fim = horas * 3600
  let s = estadoInicial(0)
  const compras: Compra[] = []
  const nivel10: Record<EstacaoProducao, number | null> = { mina: null, carvoaria: null, fornalha: null }
  const primeiraQualidade = Object.fromEntries(QUALIDADES.map((q) => [q, null])) as Record<Qualidade, number | null>
  const itensPorQualidade = Object.fromEntries(QUALIDADES.map((q) => [q, 0])) as Record<Qualidade, number>
  let bigornaDesbloqueada: number | null = null
  let primeiroFerreiro: number | null = null
  let itensForjados = 0

  const marcosRenda = [
    { rotulo: '5 min', t: 5 * 60 },
    { rotulo: '20 min', t: 20 * 60 },
    { rotulo: '1 h', t: 60 * 60 },
  ]
  const rendas: ResultadoSim['moedasPorSegundo'] = marcosRenda.map((m) => ({ ...m, valor: null }))
  // Histórico de moedasGanhas por segundo inteiro, para janelas de 60 s.
  const ganhasPorSegundo: number[] = [0]

  let ultimaCompra = 0
  let maiorEntre = { duracao: 0, inicio: 0 }
  let inicioSemComprar: number | null = null
  let maiorSem = { duracao: 0, inicio: 0 }
  let maiorValor = 0

  // Contratação: avaliada a cada 10 s (é a decisão mais cara) e logo após qualquer compra.
  let contratacao: ReturnType<typeof melhorContratacao> = null
  let proximaAvaliacao = 0
  let proximaRealocacao = 300

  const registrar = (t: number, c: Omit<Compra, 't'>) => {
    compras.push({ t, ...c })
    if (t - ultimaCompra > maiorEntre.duracao) maiorEntre = { duracao: t - ultimaCompra, inicio: ultimaCompra }
    ultimaCompra = t
    proximaAvaliacao = 0
  }

  const passos = Math.round(fim / passo)
  for (let i = 1; i <= passos; i++) {
    const t = i * passo
    const r = tickDetalhado(s, passo)
    s = r.estado
    for (const f of r.forjados) {
      itensForjados++
      itensPorQualidade[f.item.qualidade]++
      if (primeiraQualidade[f.item.qualidade] === null) primeiraQualidade[f.item.qualidade] = t
    }
    s = venderPorQualidade(s, 'todas').estado
    s = venderExcedente(s)

    if (s.niveis.bigorna >= 1) s = { ...s, automatico: true, ultimaReceita: escolherReceita(s) }
    if (t >= proximaRealocacao) {
      proximaRealocacao = t + 300
      s = melhorAlocacao(s)
    }

    // Compra gulosa: espera juntar para o melhor retorno por moeda.
    for (;;) {
      if (t >= proximaAvaliacao) {
        contratacao = FERREIROS.some((id) => !s.ferreiros[id].contratado)
          ? melhorContratacao(s)
          : null
        proximaAvaliacao = t + 10
      }
      const up = melhorUpgrade(s)
      if (contratacao && contratacao.retorno > up.retorno) {
        if (s.moedas < contratacao.custo) break
        const custo = contratacao.custo
        const id = contratacao.id
        s = melhorAlocacao(contratar(s, id))
        contratacao = null
        if (primeiroFerreiro === null) primeiroFerreiro = t
        registrar(t, { tipo: 'ferreiro', alvo: id, nivel: 1, custo })
        continue
      }
      if (s.moedas < up.custo) break
      s = comprarUpgrade(s, up.estacao)
      registrar(t, { tipo: 'upgrade', alvo: up.estacao, nivel: s.niveis[up.estacao], custo: up.custo })
      if (up.estacao === 'bigorna' && bigornaDesbloqueada === null) bigornaDesbloqueada = t
      if (up.estacao !== 'bigorna' && s.niveis[up.estacao] >= 10 && nivel10[up.estacao] === null) {
        nivel10[up.estacao] = t
      }
      if (FERREIROS.some((id) => s.ferreiros[id].contratado)) s = melhorAlocacao(s)
    }

    // Intervalo "sem nada comprável": moedas abaixo da opção mais barata (upgrade ou ferreiro).
    let maisBarato = Math.min(...ESTACOES.map((e) => custoProximoNivel(s, e)))
    if (FERREIROS.some((id) => !s.ferreiros[id].contratado)) maisBarato = Math.min(maisBarato, custoContratar(s))
    if (s.moedas < maisBarato) {
      if (inicioSemComprar === null) inicioSemComprar = t - passo
      if (t - inicioSemComprar > maiorSem.duracao) maiorSem = { duracao: t - inicioSemComprar, inicio: inicioSemComprar }
    } else {
      inicioSemComprar = null
    }

    if (Math.floor(t) > ganhasPorSegundo.length - 1) ganhasPorSegundo[Math.floor(t)] = s.moedasGanhas
    for (const m of rendas) {
      if (m.valor === null && t >= m.t) {
        const inicio = ganhasPorSegundo[Math.max(0, Math.floor(m.t) - 60)] ?? 0
        m.valor = (s.moedasGanhas - inicio) / 60
      }
    }
    maiorValor = Math.max(maiorValor, maiorValorDe(s))
  }

  if (fim - ultimaCompra > maiorEntre.duracao) maiorEntre = { duracao: fim - ultimaCompra, inicio: ultimaCompra }

  return {
    horas,
    compras,
    primeiraCompra: compras[0]?.t ?? null,
    nivel10,
    maiorIntervaloEntreCompras: maiorEntre,
    maiorIntervaloSemComprar: maiorSem,
    moedasPorSegundo: rendas,
    niveisFinais: { ...s.niveis },
    maiorValor,
    bigornaDesbloqueada,
    primeiraQualidade,
    primeiroFerreiro,
    itensForjados,
    itensPorQualidade,
    ferreirosFinais: FERREIROS.filter((id) => s.ferreiros[id].contratado).map((id) => ({
      id,
      nivel: s.ferreiros[id].nivel,
      estacao: s.ferreiros[id].estacao,
    })),
  }
}

