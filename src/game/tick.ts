import { RECEITA_LINGOTE, type RecursoId } from './constants.ts'
import { avancarBigorna, type Forjado } from './bigorna.ts'
import { taxas } from './chain.ts'
import { XP_DIVISOR, darXp } from './ferreiros.ts'
import type { GameState } from './state.ts'

export type Produzido = Record<RecursoId, number>

export const PRODUZIDO_ZERO: Readonly<Produzido> = { minerio: 0, carvao: 0, lingote: 0 }

/**
 * Com a bigorna ativa, passos grandes (offline: 10 s) são fatiados em até 1 s, para que a
 * bigorna não perca tempo esperando lingotes que chegariam no meio do passo.
 */
const SUBPASSO_SEGUNDOS = 1

export interface ResultadoTick {
  estado: GameState
  produzido: Produzido
  /** Itens concluídos neste intervalo, na ordem. */
  forjados: Forjado[]
}

/** Um passo sem fatiar: mina/carvoaria/fornalha, XP dos ferreiros e bigorna. */
function passo(s: GameState, dt: number): ResultadoTick {
  const t = taxas(s)
  const minerioProd = t.minerio * dt
  const carvaoProd = t.carvao * dt
  const minerio = s.recursos.minerio + minerioProd
  const carvao = s.recursos.carvao + carvaoProd

  const lingotes = Math.min(
    t.fornalha * dt,
    minerio / RECEITA_LINGOTE.minerio,
    carvao / RECEITA_LINGOTE.carvao,
  )

  let estado: GameState = {
    ...s,
    recursos: {
      minerio: minerio - lingotes * RECEITA_LINGOTE.minerio,
      carvao: carvao - lingotes * RECEITA_LINGOTE.carvao,
      lingote: s.recursos.lingote + lingotes,
    },
  }
  estado = darXp(estado, 'mina', minerioProd / XP_DIVISOR.mina)
  estado = darXp(estado, 'carvoaria', carvaoProd / XP_DIVISOR.carvoaria)
  estado = darXp(estado, 'fornalha', lingotes / XP_DIVISOR.fornalha)

  const b = avancarBigorna(estado, dt)
  return {
    estado: b.estado,
    produzido: { minerio: minerioProd, carvao: carvaoProd, lingote: lingotes },
    forjados: b.forjados,
  }
}

/**
 * Avança `dt` segundos. Mina e carvoaria produzem; a fornalha converte
 * 2 minério + 1 carvão por lingote, limitada pela velocidade e pelo estoque
 * (gargalo: sem insumo, ela simplesmente não produz). A bigorna consome lingotes.
 * Não mexe em `lastTick`: quem chama decide o relógio.
 */
export function tickDetalhado(s: GameState, dtSeconds: number): ResultadoTick {
  if (!(dtSeconds > 0) || !Number.isFinite(dtSeconds)) {
    return { estado: s, produzido: { ...PRODUZIDO_ZERO }, forjados: [] }
  }
  if (s.niveis.bigorna < 1 || dtSeconds <= SUBPASSO_SEGUNDOS) return passo(s, dtSeconds)

  let estado = s
  const produzido: Produzido = { ...PRODUZIDO_ZERO }
  const forjados: Forjado[] = []
  let restante = dtSeconds
  while (restante > 1e-9) {
    const r = passo(estado, Math.min(SUBPASSO_SEGUNDOS, restante))
    estado = r.estado
    produzido.minerio += r.produzido.minerio
    produzido.carvao += r.produzido.carvao
    produzido.lingote += r.produzido.lingote
    forjados.push(...r.forjados)
    restante -= SUBPASSO_SEGUNDOS
  }
  return { estado, produzido, forjados }
}

export function tick(s: GameState, dtSeconds: number): GameState {
  return tickDetalhado(s, dtSeconds).estado
}
