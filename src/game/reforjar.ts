// Reforjar (prestígio, GDD §4.2). Zera a economia do ciclo e paga em Brasas Ancestrais.
// Funções puras: o relógio entra por parâmetro (as expedições que já voltaram são coletadas antes).
//
// O que ZERA: estações (voltam ao nível 1; bigorna e forno de aço a 0), moedas, recursos, itens
// (inclusive os equipados), forja e fila, nível e XP dos ferreiros e o nível/equipamento dos heróis.
// O que FICA: brasas e talentos, heróis (nível 1, sem equipamento), ferreiros contratados (nível 1,
// no mesmo posto), reputação, construções, chefes derrotados (regiões abertas) e fragmentos.
// Expedições em andamento BLOQUEIAM o Reforjar; as que já voltaram são coletadas na hora.
import { MOEDAS_INICIAIS } from './constants.ts'
import { temConstrucao } from './construcoes.ts'
import { coletarTodas } from './expedicoes.ts'
import { FERREIROS } from './ferreiros.ts'
import { equipamentoVazio } from './herois.ts'
import { EFEITO, aplicarPiso } from './talentos.ts'
import type { GameState } from './state.ts'

export const REFORJAR = {
  /** Brasas = floor(sqrt(moedasDoCiclo / 1 000 000)). */
  divisorMoedas: 1_000_000,
} as const

/** Brasas que o ciclo atual rende. */
export function brasasDoCiclo(moedasDoCiclo: number): number {
  if (!(moedasDoCiclo > 0) || !Number.isFinite(moedasDoCiclo)) return 0
  return Math.floor(Math.sqrt(moedasDoCiclo / REFORJAR.divisorMoedas))
}

/** Moedas do ciclo, contando o loot de expedições que já voltaram e ainda não foi coletado. */
export function moedasDoCicloComPendentes(s: GameState, now: number): number {
  return s.moedasGanhas + s.expedicoes.filter((e) => now >= e.fim).reduce((t, e) => t + e.moedas, 0)
}

export type MotivoNaoReforjar = 'muralha' | 'expedicao' | 'sem-brasas'

export function motivoNaoReforjar(s: GameState, now: number): MotivoNaoReforjar | null {
  if (!temConstrucao(s, 'muralha')) return 'muralha'
  // Só bloqueia o que ainda está na estrada; quem já voltou é coletado no próprio Reforjar.
  if (s.expedicoes.some((e) => now < e.fim)) return 'expedicao'
  if (brasasDoCiclo(moedasDoCicloComPendentes(s, now)) < 1) return 'sem-brasas'
  return null
}

export const PERDE: readonly string[] = [
  'Mina, carvoaria, fornalha, bigorna e forno de aço voltam ao começo.',
  'Moedas, minério, carvão e lingotes.',
  'Todos os itens, inclusive os que os heróis vestem.',
  'Nível dos heróis (voltam ao 1) e nível dos ferreiros.',
]

export const FICA: readonly string[] = [
  'Brasas Ancestrais e talentos.',
  'Heróis e vagas do grupo, ferreiros contratados.',
  'Reputação, construções e chefes derrotados.',
  'Fragmentos rúnicos.',
]

export interface PreviaReforjar {
  /** Brasas que este ciclo rende. */
  brasasGanhas: number
  /** Brasas não gastas hoje e depois do Reforjar. */
  brasasAntes: number
  brasasDepois: number
  /** Bônus passivo de produção (em %) hoje e depois. */
  bonusAntes: number
  bonusDepois: number
  moedasDoCiclo: number
  /** Expedições ainda na estrada (bloqueiam). */
  expedicoesEmAndamento: number
  /** Quantas já voltaram e serão coletadas junto. */
  expedicoesParaColetar: number
  motivo: MotivoNaoReforjar | null
  perde: readonly string[]
  fica: readonly string[]
}

export function previaReforjar(s: GameState, now: number): PreviaReforjar {
  const moedasDoCiclo = moedasDoCicloComPendentes(s, now)
  const brasasGanhas = brasasDoCiclo(moedasDoCiclo)
  const pct = (b: number) => Math.round(EFEITO.brasaPassiva * b * 100)
  return {
    brasasGanhas,
    brasasAntes: s.brasas,
    brasasDepois: s.brasas + brasasGanhas,
    bonusAntes: pct(s.brasas),
    bonusDepois: pct(s.brasas + brasasGanhas),
    moedasDoCiclo,
    expedicoesEmAndamento: s.expedicoes.filter((e) => now < e.fim).length,
    expedicoesParaColetar: s.expedicoes.filter((e) => now >= e.fim).length,
    motivo: motivoNaoReforjar(s, now),
    perde: PERDE,
    fica: FICA,
  }
}

/** Reforja. Qualquer pendência (sem Muralha, expedição na estrada, 0 brasas) devolve o MESMO estado. */
export function reforjar(s: GameState, now: number): GameState {
  if (motivoNaoReforjar(s, now) !== null) return s
  // Quem já voltou entrega o que trouxe: reputação e fragmentos ficam (as moedas, não).
  const { estado: e } = coletarTodas(s, now)
  const ganhas = brasasDoCiclo(e.moedasGanhas)

  const ferreiros = { ...e.ferreiros }
  for (const id of FERREIROS) ferreiros[id] = { ...e.ferreiros[id], nivel: 1, xp: 0 }

  const novo: GameState = {
    ...e,
    niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 0, forno: 0 },
    recursos: { minerio: 0, carvao: 0, lingote: 0, aco: 0 },
    moedas: MOEDAS_INICIAIS,
    moedasGanhas: 0,
    itens: [],
    ferreiros,
    forja: null,
    fila: [],
    automatico: false,
    ultimaReceita: null,
    ultimoMaterial: 'ferro',
    herois: e.herois.map((h) => ({ ...h, nivel: 1, xp: 0, equipamento: equipamentoVazio() })),
    expedicoes: [],
    brasas: e.brasas + ganhas,
    reforjas: e.reforjas + 1,
  }
  return aplicarPiso(novo)
}
