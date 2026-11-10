// Simulador de ritmo (GDD §4.4). Puro: sem relógio, sem I/O. A tabela é
// impressa por scripts/sim.ts; os testes de ritmo chamam simular() direto.
//
// Estratégia gulosa: a cada instante compra a melhor opção em (ganho de renda / custo),
// entre upgrades das estações e a contratação de ferreiros; a bigorna roda em modo
// automático com a receita de melhor valor por segundo; itens e excedentes são vendidos.
// O minigame NÃO é usado (o sim joga o caminho automático, o pior caso do GDD §9).
//
// Fatia 3: o sim também poupa e contrata o primeiro herói, guarda e equipa os melhores itens,
// manda expedições (a de melhor valor por hora com chance >= 70 %), luta com o Golem quando a
// previsão diz vitória, compra o Forno de aço e passa a forjar em aço quando há lingotes dele.
import { taxas } from './chain.ts'
import {
  ESTACOES,
  PRECO_VENDA,
  RECEITA_ACO,
  RECEITA_LINGOTE,
  type EstacaoId,
  type EstacaoProducao,
} from './constants.ts'
import { estoqueDe, faixaQ, tempoForjaAtual, valorEsperadoItem } from './bigorna.ts'
import { chefeDerrotado, lutarChefe, preverChefe } from './chefe.ts'
import { comprarUpgrade, custoProximoNivel, estacaoLiberada, vender } from './economy.ts'
import {
  EXPEDICOES,
  coletarTodas,
  expedicaoLiberada,
  horasDe,
  partir,
  preverExpedicao,
  type ExpedicaoId,
} from './expedicoes.ts'
import {
  FERREIROS,
  FERREIROS_DEF,
  contratar,
  custoContratar,
  type FerreiroId,
} from './ferreiros.ts'
import {
  CLASSES,
  DEF_CLASSE,
  RECRUTAMENTO,
  emExpedicao,
  equipar,
  poderHeroi,
  proximaVaga,
  recrutar,
  type ClasseId,
} from './herois.ts'
import { venderPorQualidade } from './inventario.ts'
import {
  MATERIAIS,
  QUALIDADES,
  RECEITAS,
  SLOTS,
  SLOT_DO_TIPO,
  TIPOS_ITEM,
  atributosItem,
  poderDe,
  qualidadeDe,
  type Item,
  type MaterialId,
  type Qualidade,
  type ReceitaId,
} from './items.ts'
import { estadoInicial, type GameState } from './state.ts'
import { tickDetalhado } from './tick.ts'

export interface Compra {
  t: number
  tipo: 'upgrade' | 'ferreiro' | 'heroi' | 'forno'
  /** Estação (upgrade) ou id do ferreiro. */
  alvo: string
  nivel: number
  custo: number
}

type PorQualidade = Record<Qualidade, number>
const zeroQualidades = (): PorQualidade => Object.fromEntries(QUALIDADES.map((q) => [q, 0])) as PorQualidade
const nuloQualidades = (): Record<Qualidade, number | null> =>
  Object.fromEntries(QUALIDADES.map((q) => [q, null])) as Record<Qualidade, number | null>

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
  /** Primeira vez que saiu um item de cada qualidade (qualquer material). */
  primeiraQualidade: Record<Qualidade, number | null>
  /** Idem, só itens de ferro e só itens de aço. */
  primeiraQualidadePorMaterial: Record<MaterialId, Record<Qualidade, number | null>>
  primeiroFerreiro: number | null
  itensForjados: number
  itensPorQualidade: Record<Qualidade, number>
  itensPorMaterial: Record<MaterialId, PorQualidade>
  ferreirosFinais: { id: FerreiroId; nivel: number; estacao: EstacaoId | null }[]

  // Fatia 3
  primeiroHeroi: number | null
  segundoHeroi: number | null
  terceiroHeroi: number | null
  primeiraExpedicao: number | null
  golemDerrotado: number | null
  fornoComprado: number | null
  primeiroAco: number | null
  expedicoes: { enviadas: number; sucessos: number; falhas: number }
  reputacaoFinal: number
  fragmentosFinais: number
  heroisFinais: { nome: string; classe: ClasseId; nivel: number; poder: number }[]
  /** Quantas vezes a previsão disse "vitória" (só uma, porque a sim luta na hora). */
  rodadasDoGolem: number | null
}

const pontuacaoItem = (i: Pick<Item, 'tipo' | 'material' | 'qualidade'>): number => poderDe(atributosItem(i))

/**
 * Receita de melhor valor por segundo, considerando o limite de lingotes do material
 * (empate: a de maior valor por lingote).
 */
export function escolherReceita(s: GameState, material: MaterialId = 'ferro'): ReceitaId {
  const t = taxas(s)
  const lingotesPorS = material === 'aco' ? t.aco : t.lingote
  let melhor: ReceitaId = 'espada'
  let melhorScore = -Infinity
  for (const r of TIPOS_ITEM) {
    const def = RECEITAS[r]
    const tempoEfetivo = Math.max(
      tempoForjaAtual(s, r),
      lingotesPorS > 0 ? def.lingotes / lingotesPorS : Infinity,
    )
    const v = valorEsperadoItem(s, r, material)
    // Desempate por valor por lingote (mais itens por lingote sobra).
    const score = v / tempoEfetivo + (v / def.lingotes) * 1e-6
    if (score > melhorScore) {
      melhor = r
      melhorScore = score
    }
  }
  return melhor
}

/**
 * Moedas/s em regime estável (vendendo tudo que sobra). Base da decisão gulosa.
 * Com o Forno de aço, a bigorna dá prioridade ao aço (valor ×4) e usa o resto do tempo e os
 * lingotes de ferro que sobram para itens de ferro.
 */
export function rendaEstavel(s: GameState): number {
  const t = taxas(s)
  const acoPorS = s.niveis.forno >= 1 ? t.aco : 0
  const ferroParaBigorna = t.lingote - acoPorS * RECEITA_ACO.lingote
  let ferroLivre = t.lingote - acoPorS * RECEITA_ACO.lingote
  let acoLivre = acoPorS
  let renda = 0

  if (s.niveis.bigorna >= 1) {
    let tempoLivre = 1 // fração do tempo da bigorna ainda disponível
    if (acoPorS > 0) {
      const r = escolherReceita(s, 'aco')
      const def = RECEITAS[r]
      const tempo = tempoForjaAtual(s, r)
      const itens = Math.min(acoPorS / def.lingotes, tempoLivre / tempo)
      renda += itens * valorEsperadoItem(s, r, 'aco')
      acoLivre = acoPorS - itens * def.lingotes
      tempoLivre -= itens * tempo
    }
    const r = escolherReceita(s, 'ferro')
    const def = RECEITAS[r]
    const tempo = tempoForjaAtual(s, r)
    const itens = Math.max(0, Math.min(ferroParaBigorna / def.lingotes, tempoLivre / tempo))
    renda += itens * valorEsperadoItem(s, r, 'ferro')
    ferroLivre = ferroParaBigorna - itens * def.lingotes
  }

  const minerioLivre = Math.max(0, t.minerio - RECEITA_LINGOTE.minerio * t.lingote)
  const carvaoLivre = Math.max(
    0,
    t.carvao - RECEITA_LINGOTE.carvao * t.lingote - RECEITA_ACO.carvao * acoPorS,
  )
  return (
    renda +
    Math.max(0, ferroLivre) * PRECO_VENDA.lingote +
    acoLivre * PRECO_VENDA.aco +
    minerioLivre * PRECO_VENDA.minerio +
    carvaoLivre * PRECO_VENDA.carvao
  )
}

/** Estações que o jogador pode comprar agora. */
const estacoesAbertas = (s: GameState): EstacaoId[] => ESTACOES.filter((e) => estacaoLiberada(s, e))

/** Upgrade com maior (ganho de renda / custo). Empate: o mais barato. */
export function melhorUpgrade(s: GameState): { estacao: EstacaoId; retorno: number; custo: number } {
  const base = rendaEstavel(s)
  let melhor: EstacaoId = 'mina'
  let melhorRetorno = -Infinity
  let melhorCusto = Infinity
  for (const e of estacoesAbertas(s)) {
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
      // O Forno de aço só tem posto depois de comprado.
      if (estacao === 'forno' && atual.niveis.forno < 1) continue
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

// ---------------------------------------------------------------------------
// Heróis: itens, equipamento, expedições e chefe
// ---------------------------------------------------------------------------

/**
 * Ids dos itens do inventário que valem a pena guardar: em cada espaço, os N melhores (N = heróis,
 * no mínimo 1 depois que a bigorna existe) entre o inventário e o que já está equipado.
 */
export function itensReservados(s: GameState): Set<number> {
  const guardar = new Set<number>()
  if (s.niveis.bigorna < 1) return guardar
  const n = Math.max(1, s.herois.length)
  for (const slot of SLOTS) {
    const candidatos: { id: number; nota: number; equipado: boolean }[] = []
    for (const i of s.itens) {
      if (SLOT_DO_TIPO[i.tipo] === slot) candidatos.push({ id: i.id, nota: pontuacaoItem(i), equipado: false })
    }
    for (const h of s.herois) {
      const e = h.equipamento[slot]
      if (e) candidatos.push({ id: e.id, nota: pontuacaoItem(e), equipado: true })
    }
    // No empate, o equipado fica (evita trocas inúteis).
    candidatos.sort((a, b) => b.nota - a.nota || Number(b.equipado) - Number(a.equipado))
    for (const c of candidatos.slice(0, n)) if (!c.equipado) guardar.add(c.id)
  }
  return guardar
}

/** Cada herói livre veste o melhor item do inventário de cada espaço, se for melhor que o atual. */
export function equiparMelhores(s: GameState): GameState {
  let estado = s
  for (const h of s.herois) {
    if (emExpedicao(estado, h.id)) continue
    for (const slot of SLOTS) {
      const atual = estado.herois.find((x) => x.id === h.id)!.equipamento[slot]
      let melhor: Item | null = null
      for (const i of estado.itens) {
        if (SLOT_DO_TIPO[i.tipo] !== slot) continue
        if (!melhor || pontuacaoItem(i) > pontuacaoItem(melhor)) melhor = i
      }
      if (melhor && (!atual || pontuacaoItem(melhor) > pontuacaoItem(atual))) {
        estado = equipar(estado, h.id, melhor.id)
      }
    }
  }
  return estado
}

/**
 * Receita que mais melhora o kit dos heróis: em cada espaço, compara o item típico que a bigorna
 * faz hoje com o N-ésimo melhor que já existe (N = heróis, no mínimo 1). Null = o kit não melhora.
 */
export function receitaParaKit(s: GameState, material: MaterialId): ReceitaId | null {
  const f = faixaQ(s, material)
  const qualidade = qualidadeDe((f.min + f.max) / 2)
  const n = Math.max(1, s.herois.length)
  let melhor: ReceitaId | null = null
  let melhorGanho = 0
  for (const slot of SLOTS) {
    const notas: number[] = []
    for (const i of s.itens) if (SLOT_DO_TIPO[i.tipo] === slot) notas.push(pontuacaoItem(i))
    for (const h of s.herois) if (h.equipamento[slot]) notas.push(pontuacaoItem(h.equipamento[slot]!))
    notas.sort((a, b) => b - a)
    const atual = notas.length >= n ? notas[n - 1]! : 0
    for (const tipo of TIPOS_ITEM) {
      if (SLOT_DO_TIPO[tipo] !== slot) continue
      const ganho = pontuacaoItem({ tipo, material, qualidade }) - atual
      if (ganho > melhorGanho + 1e-9) {
        melhorGanho = ganho
        melhor = tipo
      }
    }
  }
  return melhor
}

/** Classe do próximo herói: um grupo equilibrado (Guerreiro, Guardiã, Batedor, Guerreiro). */
function classeDoProximo(s: GameState): ClasseId {
  return CLASSES[s.herois.length % CLASSES.length]!
}

/** Melhor expedição para o herói: maior valor por hora entre as de chance >= 70 %. */
export function melhorExpedicao(s: GameState, heroiId: number): ExpedicaoId | null {
  const h = s.herois.find((x) => x.id === heroiId)
  if (!h) return null
  const poder = poderHeroi(h)
  const bonus = DEF_CLASSE[h.classe].bonusLoot
  let melhor: ExpedicaoId | null = null
  let melhorValor = -Infinity
  for (const tipo of EXPEDICOES) {
    if (!expedicaoLiberada(s, tipo)) continue
    const p = preverExpedicao(poder, bonus, tipo)
    if (p.chance < 0.7) continue
    const esperado = p.chance * p.moedas + (1 - p.chance) * 0.3 * p.moedas
    const porHora = esperado / horasDe(tipo)
    if (porHora > melhorValor) {
      melhor = tipo
      melhorValor = porHora
    }
  }
  return melhor
}

/** Vende o excedente: lingotes acima da reserva da bigorna e minério/carvão acima de ~2 s de consumo. */
function venderExcedente(s: GameState): GameState {
  const t = taxas(s)
  let r = s
  if (s.niveis.bigorna >= 1) {
    const reserva = (s.ultimaReceita ? RECEITAS[s.ultimaReceita].lingotes : 3) * 2
    // Com o forno, os lingotes de ferro que ele não aproveitou também podem virar item de ferro.
    const sobra = r.recursos.lingote - reserva
    if (sobra > 0) r = vender(r, 'lingote', sobra).estado
    const reservaAco = (s.ultimaReceita ? RECEITAS[s.ultimaReceita].lingotes : 3) * 2
    const sobraAco = r.recursos.aco - reservaAco
    if (sobraAco > 0) r = vender(r, 'aco', sobraAco).estado
  } else {
    r = vender(r, 'lingote', 'tudo').estado
  }
  const reservaMinerio = RECEITA_LINGOTE.minerio * t.fornalha * 2
  const reservaCarvao = (RECEITA_LINGOTE.carvao * t.fornalha + RECEITA_ACO.carvao * t.forno) * 2
  const sobraMinerio = r.recursos.minerio - reservaMinerio
  if (sobraMinerio > 0) r = vender(r, 'minerio', sobraMinerio).estado
  const sobraCarvao = r.recursos.carvao - reservaCarvao
  if (sobraCarvao > 0) r = vender(r, 'carvao', sobraCarvao).estado
  return r
}

function venderItensNaoReservados(s: GameState): GameState {
  const guardar = itensReservados(s)
  if (guardar.size === 0) return venderPorQualidade(s, 'todas').estado
  const vendaveis = s.itens.filter((i) => !guardar.has(i.id))
  if (vendaveis.length === 0) return s
  const ganho = vendaveis.reduce((total, i) => total + i.valor, 0)
  return {
    ...s,
    itens: s.itens.filter((i) => guardar.has(i.id)),
    moedas: s.moedas + ganho,
    moedasGanhas: s.moedasGanhas + ganho,
  }
}

function maiorValorDe(s: GameState): number {
  return Math.max(
    s.moedas,
    s.moedasGanhas,
    s.recursos.minerio,
    s.recursos.carvao,
    s.recursos.lingote,
    s.recursos.aco,
    ...estacoesAbertas(s).map((e) => custoProximoNivel(s, e)),
    ...s.itens.map((i) => i.valor),
  )
}

export function simular(horas: number, passo = 0.25): ResultadoSim {
  const fim = horas * 3600
  let s = estadoInicial(0)
  const compras: Compra[] = []
  const nivel10: Record<EstacaoProducao, number | null> = { mina: null, carvoaria: null, fornalha: null }
  const primeiraQualidade = nuloQualidades()
  const primeiraQualidadePorMaterial = Object.fromEntries(MATERIAIS.map((m) => [m, nuloQualidades()])) as Record<
    MaterialId,
    Record<Qualidade, number | null>
  >
  const itensPorQualidade = zeroQualidades()
  const itensPorMaterial = Object.fromEntries(MATERIAIS.map((m) => [m, zeroQualidades()])) as Record<
    MaterialId,
    PorQualidade
  >
  let bigornaDesbloqueada: number | null = null
  let primeiroFerreiro: number | null = null
  let itensForjados = 0

  const tempos: Record<'heroi1' | 'heroi2' | 'heroi3' | 'expedicao' | 'golem' | 'forno' | 'aco', number | null> = {
    heroi1: null,
    heroi2: null,
    heroi3: null,
    expedicao: null,
    golem: null,
    forno: null,
    aco: null,
  }
  const expedicoes = { enviadas: 0, sucessos: 0, falhas: 0 }
  let rodadasDoGolem: number | null = null

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

  /** Meta de poupança: o herói (depois da bigorna) e o Forno de aço (depois do Golem). */
  const metaAtual = (): { tipo: 'heroi' | 'forno'; custo: number } | null => {
    if (s.herois.length === 0 && s.niveis.bigorna >= 1) return { tipo: 'heroi', custo: RECRUTAMENTO.custoPrimeiro }
    if (chefeDerrotado(s, 'golem') && s.niveis.forno < 1) {
      return { tipo: 'forno', custo: custoProximoNivel(s, 'forno') }
    }
    return null
  }

  /**
   * Enquanto poupa para uma meta, só compra o que se paga antes de a meta ficar pronta
   * (retorno = ganho de renda / custo; tempo de retorno = 1 / retorno).
   */
  const vale = (retorno: number, custo: number): boolean => {
    const meta = metaAtual()
    if (!meta) return true
    if (s.moedas - custo >= meta.custo) return true
    const renda = Math.max(1e-9, rendaEstavel(s))
    const faltam = Math.max(0, meta.custo - s.moedas) / renda
    return retorno > 0 && 1 / retorno < faltam
  }

  const passos = Math.round(fim / passo)
  for (let i = 1; i <= passos; i++) {
    const t = i * passo
    const agora = t * 1000
    const r = tickDetalhado(s, passo)
    s = r.estado
    if (tempos.aco === null && r.produzido.aco > 0) tempos.aco = t
    for (const f of r.forjados) {
      itensForjados++
      const { qualidade, material } = f.item
      itensPorQualidade[qualidade]++
      itensPorMaterial[material][qualidade]++
      if (primeiraQualidade[qualidade] === null) primeiraQualidade[qualidade] = t
      if (primeiraQualidadePorMaterial[material][qualidade] === null) {
        primeiraQualidadePorMaterial[material][qualidade] = t
      }
    }

    // Heróis: coleta o que voltou, veste o melhor, tenta o Golem e manda os livres em expedição.
    if (s.herois.length > 0) {
      const col = coletarTodas(s, agora)
      s = col.estado
      expedicoes.sucessos += col.coleta.sucessos
      expedicoes.falhas += col.coleta.falhas
      s = equiparMelhores(s)
      if (!chefeDerrotado(s, 'golem')) {
        const livres = s.herois.filter((h) => !emExpedicao(s, h.id)).map((h) => h.id)
        if (livres.length > 0) {
          const previsao = preverChefe(s, 'golem', livres)
          if (previsao.vitoria) {
            s = lutarChefe(s, 'golem', livres).estado
            tempos.golem = t
            rodadasDoGolem = previsao.rodadas
          }
        }
      }
      for (const h of s.herois) {
        if (emExpedicao(s, h.id)) continue
        const tipo = melhorExpedicao(s, h.id)
        if (!tipo) continue
        s = partir(s, h.id, tipo, agora)
        expedicoes.enviadas++
        if (tempos.expedicao === null) tempos.expedicao = t
      }
    }

    // Heróis de graça: reputação (2º) e Golem (3º). Classe equilibrada.
    for (;;) {
      const vaga = proximaVaga(s)
      if (!vaga || !vaga.liberada || vaga.condicao.tipo === 'moedas') break
      s = recrutar(s, classeDoProximo(s))
      if (s.herois.length === 2) tempos.heroi2 = t
      if (s.herois.length === 3) tempos.heroi3 = t
    }

    s = venderItensNaoReservados(s)
    s = venderExcedente(s)

    if (s.niveis.bigorna >= 1) {
      // Aço quando há lingotes dele para a receita; senão ferro (a bigorna não fica parada).
      let material: MaterialId = 'ferro'
      if (s.niveis.forno >= 1) {
        const rAco = escolherReceita(s, 'aco')
        if (estoqueDe(s, 'aco') >= RECEITAS[rAco].lingotes) material = 'aco'
      }
      const receita = receitaParaKit(s, material) ?? escolherReceita(s, material)
      s = { ...s, automatico: true, ultimaReceita: receita, ultimoMaterial: material }
    }
    if (t >= proximaRealocacao) {
      proximaRealocacao = t + 300
      s = melhorAlocacao(s)
    }

    // Compra gulosa: espera juntar para o melhor retorno por moeda.
    for (;;) {
      // Metas de poupança: herói e forno.
      const meta = metaAtual()
      if (meta && s.moedas >= meta.custo) {
        if (meta.tipo === 'heroi') {
          s = recrutar(s, classeDoProximo(s))
          tempos.heroi1 = t
          registrar(t, { tipo: 'heroi', alvo: s.herois[0]!.classe, nivel: 1, custo: meta.custo })
        } else {
          s = comprarUpgrade(s, 'forno')
          tempos.forno = t
          registrar(t, { tipo: 'forno', alvo: 'forno', nivel: 1, custo: meta.custo })
          s = melhorAlocacao(s)
        }
        continue
      }

      if (t >= proximaAvaliacao) {
        contratacao = FERREIROS.some((id) => !s.ferreiros[id].contratado)
          ? melhorContratacao(s)
          : null
        proximaAvaliacao = t + 10
      }
      const up = melhorUpgrade(s)
      if (contratacao && contratacao.retorno > up.retorno) {
        if (s.moedas < contratacao.custo || !vale(contratacao.retorno, contratacao.custo)) break
        const custo = contratacao.custo
        const id = contratacao.id
        s = melhorAlocacao(contratar(s, id))
        contratacao = null
        if (primeiroFerreiro === null) primeiroFerreiro = t
        registrar(t, { tipo: 'ferreiro', alvo: id, nivel: 1, custo })
        continue
      }
      if (s.moedas < up.custo || !vale(up.retorno, up.custo)) break
      s = comprarUpgrade(s, up.estacao)
      registrar(t, { tipo: 'upgrade', alvo: up.estacao, nivel: s.niveis[up.estacao], custo: up.custo })
      if (up.estacao === 'bigorna' && bigornaDesbloqueada === null) bigornaDesbloqueada = t
      if (
        (up.estacao === 'mina' || up.estacao === 'carvoaria' || up.estacao === 'fornalha') &&
        s.niveis[up.estacao] >= 10 &&
        nivel10[up.estacao] === null
      ) {
        nivel10[up.estacao] = t
      }
      if (FERREIROS.some((id) => s.ferreiros[id].contratado)) s = melhorAlocacao(s)
    }

    // Intervalo "sem nada comprável": moedas abaixo da opção mais barata (upgrade ou ferreiro).
    let maisBarato = Math.min(...estacoesAbertas(s).map((e) => custoProximoNivel(s, e)))
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
    primeiraQualidadePorMaterial,
    primeiroFerreiro,
    itensForjados,
    itensPorQualidade,
    itensPorMaterial,
    ferreirosFinais: FERREIROS.filter((id) => s.ferreiros[id].contratado).map((id) => ({
      id,
      nivel: s.ferreiros[id].nivel,
      estacao: s.ferreiros[id].estacao,
    })),
    primeiroHeroi: tempos.heroi1,
    segundoHeroi: tempos.heroi2,
    terceiroHeroi: tempos.heroi3,
    primeiraExpedicao: tempos.expedicao,
    golemDerrotado: tempos.golem,
    fornoComprado: tempos.forno,
    primeiroAco: tempos.aco,
    expedicoes,
    reputacaoFinal: s.reputacao,
    fragmentosFinais: s.fragmentos,
    heroisFinais: s.herois.map((h) => ({ nome: h.nome, classe: h.classe, nivel: h.nivel, poder: poderHeroi(h) })),
    rodadasDoGolem,
  }
}
