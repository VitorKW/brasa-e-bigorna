// Simulador de ritmo (GDD §4.4). Puro: sem relógio, sem I/O. A tabela é
// impressa por scripts/sim.ts; os testes de ritmo chamam simular() direto.
import { taxas } from './chain.ts'
import { ESTACOES, PRECO_VENDA, RECEITA_LINGOTE, type EstacaoId } from './constants.ts'
import { comprarUpgrade, custoProximoNivel, vender } from './economy.ts'
import { estadoInicial, type GameState } from './state.ts'
import { tick } from './tick.ts'

export interface Compra {
  t: number
  estacao: EstacaoId
  nivel: number
  custo: number
}

export interface ResultadoSim {
  horas: number
  compras: Compra[]
  primeiraCompra: number | null
  /** Primeiro instante em que cada estação chegou ao nível 10. */
  nivel10: Record<EstacaoId, number | null>
  /** Maior intervalo entre compras consecutivas (inclui o intervalo final até o fim da sim). */
  maiorIntervaloEntreCompras: { duracao: number; inicio: number }
  /** Maior período seguido com moedas < upgrade mais barato (nada comprável). */
  maiorIntervaloSemComprar: { duracao: number; inicio: number }
  /** Moedas/s de venda, média do minuto que termina em cada marco. */
  moedasPorSegundo: { rotulo: string; t: number; valor: number | null }[]
  niveisFinais: Record<EstacaoId, number>
  /** Maior valor numérico visto (monitor do limite de 1e15, GDD §4.5). */
  maiorValor: number
}

/** Moedas/s em regime estável (vendendo tudo que sobra). Base da decisão gulosa. */
export function rendaEstavel(s: GameState): number {
  const t = taxas(s)
  const minerioLivre = Math.max(0, t.minerio - RECEITA_LINGOTE.minerio * t.lingote)
  const carvaoLivre = Math.max(0, t.carvao - RECEITA_LINGOTE.carvao * t.lingote)
  return (
    t.lingote * PRECO_VENDA.lingote +
    minerioLivre * PRECO_VENDA.minerio +
    carvaoLivre * PRECO_VENDA.carvao
  )
}

/** Upgrade com maior (ganho de renda / custo). Empate: o mais barato. */
export function melhorUpgrade(s: GameState): EstacaoId {
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
  return melhor
}

/** Vende todos os lingotes e o minério/carvão acima de ~2 s de consumo da fornalha. */
function venderExcedente(s: GameState): GameState {
  const t = taxas(s)
  let r = vender(s, 'lingote', 'tudo').estado
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
  )
}

export function simular(horas: number, passo = 0.25): ResultadoSim {
  const fim = horas * 3600
  let s = estadoInicial(0)
  const compras: Compra[] = []
  const nivel10: Record<EstacaoId, number | null> = { mina: null, carvoaria: null, fornalha: null }

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

  const passos = Math.round(fim / passo)
  for (let i = 1; i <= passos; i++) {
    const t = i * passo
    s = tick(s, passo)
    s = venderExcedente(s)

    // Compra gulosa: espera juntar para o melhor retorno por moeda.
    for (;;) {
      const alvo = melhorUpgrade(s)
      const custo = custoProximoNivel(s, alvo)
      if (s.moedas < custo) break
      s = comprarUpgrade(s, alvo)
      compras.push({ t, estacao: alvo, nivel: s.niveis[alvo], custo })
      if (s.niveis[alvo] >= 10 && nivel10[alvo] === null) nivel10[alvo] = t
      if (t - ultimaCompra > maiorEntre.duracao) maiorEntre = { duracao: t - ultimaCompra, inicio: ultimaCompra }
      ultimaCompra = t
    }

    // Intervalo "sem nada comprável": moedas abaixo do upgrade mais barato.
    const maisBarato = Math.min(...ESTACOES.map((e) => custoProximoNivel(s, e)))
    if (s.moedas < maisBarato) {
      if (inicioSemComprar === null) inicioSemComprar = t - passo
      if (t - inicioSemComprar > maiorSem.duracao) maiorSem = { duracao: t - inicioSemComprar, inicio: inicioSemComprar }
    } else {
      inicioSemComprar = null
    }

    if (Math.floor(t) > ganhasPorSegundo.length - 1) ganhasPorSegundo[Math.floor(t)] = s.moedasGanhas
    for (const r of rendas) {
      if (r.valor === null && t >= r.t) {
        const inicio = ganhasPorSegundo[Math.max(0, Math.floor(r.t) - 60)] ?? 0
        r.valor = (s.moedasGanhas - inicio) / 60
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
  }
}
