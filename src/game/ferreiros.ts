// Ferreiros (GDD §5): contratação, alocação, XP e passivas.
import type { EstacaoId } from './constants.ts'
import type { GameState } from './state.ts'

export const FERREIROS = ['tito', 'cida', 'bene', 'iara', 'odair'] as const
export type FerreiroId = (typeof FERREIROS)[number]

export interface Ferreiro {
  contratado: boolean
  nivel: number
  xp: number
  estacao: EstacaoId | null
}

export interface DefFerreiro {
  nome: string
  /** Estações em que ele pode trabalhar. */
  estacoes: readonly EstacaoId[]
  passiva: string
}

export const FERREIROS_DEF: Record<FerreiroId, DefFerreiro> = {
  tito: { nome: 'Tito, aprendiz', estacoes: ['fornalha'], passiva: '+15 % de velocidade na fornalha' },
  cida: { nome: 'Dona Cida', estacoes: ['bigorna'], passiva: '+10 de qualidade ao forjar' },
  bene: { nome: 'Benê Carvoeiro', estacoes: ['carvoaria'], passiva: '+25 % de produção na carvoaria' },
  iara: { nome: 'Iara do Malho', estacoes: ['bigorna'], passiva: '10 % de chance de forjar 2 itens' },
  odair: {
    nome: 'Mestre Odair',
    estacoes: ['mina', 'carvoaria', 'fornalha', 'bigorna'],
    passiva: '+5 % em tudo da estação (+10 % no nível 10)',
  },
}

export const FERREIRO = {
  custoBase: 100,
  custoTaxa: 4,
  xpBase: 10,
  xpTaxa: 1.65, // ajustado pelo sim: com 1,3 o épico saía aos 33 min
  /** Nível máximo do ferreiro (GDD §4.2: níveis 1–20). */
  nivelMax: 20,
  bonusTito: 0.15,
  bonusBene: 0.25,
  bonusCidaQ: 10,
  chanceDuplo: 0.1,
  bonusOdair: 0.05,
  bonusOdairMax: 0.1,
  nivelOdairMax: 10,
} as const

/**
 * Divisor de XP por estação `[suposição]`: 1 XP por item na bigorna; nas demais, 1 XP a cada
 * N unidades produzidas, para o ferreiro subir num ritmo parecido ao da bigorna (~1 XP/10 s).
 */
export const XP_DIVISOR = { mina: 40, carvoaria: 20, fornalha: 10 } as const

export function quantosContratados(s: GameState): number {
  return FERREIROS.filter((id) => s.ferreiros[id].contratado).length
}

/** Custo de contratar o próximo: 100 × 4^k, k = já contratados. */
export function custoContratar(s: GameState): number {
  return FERREIRO.custoBase * Math.pow(FERREIRO.custoTaxa, quantosContratados(s))
}

export function contratar(s: GameState, id: FerreiroId): GameState {
  if (s.ferreiros[id].contratado) return s
  const custo = custoContratar(s)
  if (s.moedas < custo) return s
  return {
    ...s,
    moedas: s.moedas - custo,
    ferreiros: { ...s.ferreiros, [id]: { ...s.ferreiros[id], contratado: true } },
  }
}

export function ferreiroEm(s: GameState, estacao: EstacaoId): FerreiroId | null {
  for (const id of FERREIROS) {
    const f = s.ferreiros[id]
    if (f.contratado && f.estacao === estacao) return id
  }
  return null
}

export function podeAlocar(id: FerreiroId, estacao: EstacaoId): boolean {
  return FERREIROS_DEF[id].estacoes.includes(estacao)
}

/**
 * Aloca (ou, com `null`, libera). Uma estação tem 1 ferreiro: quem estava nela fica sem
 * posto. Inválido (não contratado, estação incompatível) devolve o mesmo estado.
 */
export function alocar(s: GameState, id: FerreiroId, estacao: EstacaoId | null): GameState {
  if (!s.ferreiros[id].contratado) return s
  if (estacao !== null && !podeAlocar(id, estacao)) return s
  const novos = { ...s.ferreiros }
  if (estacao !== null) {
    const ocupante = ferreiroEm(s, estacao)
    if (ocupante && ocupante !== id) novos[ocupante] = { ...novos[ocupante], estacao: null }
  }
  novos[id] = { ...novos[id], estacao }
  return { ...s, ferreiros: novos }
}

/** Nível do ferreiro que está na estação (0 se não há ninguém). */
export function nivelFerreiroEm(s: GameState, estacao: EstacaoId): number {
  const id = ferreiroEm(s, estacao)
  return id ? s.ferreiros[id].nivel : 0
}

export function bonusOdair(nivel: number): number {
  return nivel >= FERREIRO.nivelOdairMax ? FERREIRO.bonusOdairMax : FERREIRO.bonusOdair
}

/** Multiplicador de produção/velocidade da estação (Tito, Benê, Odair). */
export function multiplicadorEstacao(s: GameState, estacao: EstacaoId): number {
  const id = ferreiroEm(s, estacao)
  if (!id) return 1
  if (id === 'tito') return 1 + FERREIRO.bonusTito
  if (id === 'bene') return 1 + FERREIRO.bonusBene
  if (id === 'odair') return 1 + bonusOdair(s.ferreiros.odair.nivel)
  return 1
}

/** Passivas que mexem na qualidade, só na bigorna. */
export function passivasBigorna(s: GameState): {
  bonusFixo: number
  multiplicador: number
  chanceDuplo: number
} {
  const id = ferreiroEm(s, 'bigorna')
  return {
    bonusFixo: id === 'cida' ? FERREIRO.bonusCidaQ : 0,
    multiplicador: id === 'odair' ? 1 + bonusOdair(s.ferreiros.odair.nivel) : 1,
    chanceDuplo: id === 'iara' ? FERREIRO.chanceDuplo : 0,
  }
}

/** XP para sair do nível n: 10 × 1,65^(n−1). */
export function xpParaProximo(n: number): number {
  return FERREIRO.xpBase * Math.pow(FERREIRO.xpTaxa, n - 1)
}

/** Dá XP ao ferreiro da estação (se houver), subindo quantos níveis couberem. */
export function darXp(s: GameState, estacao: EstacaoId, xp: number): GameState {
  if (!(xp > 0)) return s
  const id = ferreiroEm(s, estacao)
  if (!id) return s
  let { nivel, xp: atual } = s.ferreiros[id]
  atual += xp
  for (;;) {
    if (nivel >= FERREIRO.nivelMax) {
      atual = 0
      break
    }
    const precisa = xpParaProximo(nivel)
    if (atual < precisa) break
    atual -= precisa
    nivel++
  }
  return { ...s, ferreiros: { ...s.ferreiros, [id]: { ...s.ferreiros[id], nivel, xp: atual } } }
}
