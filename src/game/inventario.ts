// Venda de itens (individual e em massa por qualidade).
import { multVenda } from './bonus.ts'
import { itensDeEncomendas } from './encomendas.ts'
import { SLOTS, SLOT_DO_TIPO, atributosItem, poderDe, type Item, type Qualidade } from './items.ts'
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

// ---------------------------------------------------------------------------
// Venda automática (fatia 5)
// ---------------------------------------------------------------------------

const notaDoItem = (i: Pick<Item, 'tipo' | 'material' | 'qualidade'>): number => poderDe(atributosItem(i))

/**
 * Ids do inventário que valem a pena guardar para os heróis: em cada espaço, os N melhores (N = heróis,
 * no mínimo 1 depois que a bigorna existe) entre o inventário e o que já está equipado. No empate o
 * equipado fica (evita trocas inúteis).
 */
export function itensReservados(s: GameState): Set<number> {
  const guardar = new Set<number>()
  if (s.niveis.bigorna < 1) return guardar
  const n = Math.max(1, s.herois.length)
  for (const slot of SLOTS) {
    const candidatos: { id: number; nota: number; equipado: boolean }[] = []
    for (const i of s.itens) {
      if (SLOT_DO_TIPO[i.tipo] === slot) candidatos.push({ id: i.id, nota: notaDoItem(i), equipado: false })
    }
    for (const h of s.herois) {
      const e = h.equipamento[slot]
      if (e) candidatos.push({ id: e.id, nota: notaDoItem(e), equipado: true })
    }
    candidatos.sort((a, b) => b.nota - a.nota || Number(b.equipado) - Number(a.equipado))
    for (const c of candidatos.slice(0, n)) if (!c.equipado) guardar.add(c.id)
  }
  return guardar
}

/** Itens que a venda automática poupa: o kit dos heróis e o que as encomendas abertas pedem. */
export function itensUteis(s: GameState): Set<number> {
  const uteis = itensReservados(s)
  for (const id of itensDeEncomendas(s)) uteis.add(id)
  return uteis
}

/** Vende tudo que não é útil agora (não melhora nenhum herói e não serve a uma encomenda). */
export function venderInuteis(s: GameState): { estado: GameState; vendidos: number; ganho: number } {
  const uteis = itensUteis(s)
  const inuteis = s.itens.filter((i) => !uteis.has(i.id))
  if (inuteis.length === 0) return { estado: s, vendidos: 0, ganho: 0 }
  const r = aplicarVenda(s, inuteis)
  return { estado: r.estado, vendidos: inuteis.length, ganho: r.ganho }
}
