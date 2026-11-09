import { RECEITA_LINGOTE, type RecursoId } from './constants.ts'
import { taxas } from './chain.ts'
import type { GameState } from './state.ts'

export type Produzido = Record<RecursoId, number>

export const PRODUZIDO_ZERO: Readonly<Produzido> = { minerio: 0, carvao: 0, lingote: 0 }

/**
 * Avança `dt` segundos. Mina e carvoaria produzem; a fornalha converte
 * 2 minério + 1 carvão por lingote, limitada pela velocidade e pelo estoque
 * (gargalo: sem insumo, ela simplesmente não produz).
 * Não mexe em `lastTick`: quem chama decide o relógio.
 */
export function tickDetalhado(
  s: GameState,
  dtSeconds: number,
): { estado: GameState; produzido: Produzido } {
  if (!(dtSeconds > 0) || !Number.isFinite(dtSeconds)) {
    return { estado: s, produzido: { ...PRODUZIDO_ZERO } }
  }
  const t = taxas(s)
  const minerioProd = t.minerio * dtSeconds
  const carvaoProd = t.carvao * dtSeconds
  const minerio = s.recursos.minerio + minerioProd
  const carvao = s.recursos.carvao + carvaoProd

  const lingotes = Math.min(
    t.fornalha * dtSeconds,
    minerio / RECEITA_LINGOTE.minerio,
    carvao / RECEITA_LINGOTE.carvao,
  )

  return {
    estado: {
      ...s,
      recursos: {
        minerio: minerio - lingotes * RECEITA_LINGOTE.minerio,
        carvao: carvao - lingotes * RECEITA_LINGOTE.carvao,
        lingote: s.recursos.lingote + lingotes,
      },
    },
    produzido: { minerio: minerioProd, carvao: carvaoProd, lingote: lingotes },
  }
}

export function tick(s: GameState, dtSeconds: number): GameState {
  return tickDetalhado(s, dtSeconds).estado
}
