// Venda de itens (individual e em massa por qualidade).
import { multVenda } from './bonus.ts'
import type { Qualidade } from './items.ts'
import type { GameState } from './state.ts'

function aplicarVenda(s: GameState, vendidos: GameState['itens']): { estado: GameState; ganho: number } {
  if (vendidos.length === 0) return { estado: s, ganho: 0 }
  const ids = new Set(vendidos.map((i) => i.id))
  const ganho = vendidos.reduce((t, i) => t + i.valor, 0) * multVenda(s)
  return {
    estado: {
      ...s,
      itens: s.itens.filter((i) => !ids.has(i.id)),
      moedas: s.moedas + ganho,
      moedasGanhas: s.moedasGanhas + ganho,
    },
    ganho,
  }
}

export function venderItem(s: GameState, id: number): { estado: GameState; ganho: number } {
  return aplicarVenda(s, s.itens.filter((i) => i.id === id))
}

/** Vende todos os itens da qualidade (ou 'todas'). */
export function venderPorQualidade(
  s: GameState,
  qualidade: Qualidade | 'todas',
): { estado: GameState; ganho: number } {
  return aplicarVenda(s, qualidade === 'todas' ? s.itens : s.itens.filter((i) => i.qualidade === qualidade))
}

export function contarPorQualidade(
  itens: readonly { qualidade: Qualidade }[],
): Record<Qualidade, number> {
  const r: Record<Qualidade, number> = { comum: 0, incomum: 0, raro: 0, epico: 0, lendario: 0 }
  for (const i of itens) r[i.qualidade]++
  return r
}
