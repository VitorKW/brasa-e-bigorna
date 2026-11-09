import { OFFLINE } from './constants.ts'
import type { GameState } from './state.ts'
import { PRODUZIDO_ZERO, tickDetalhado, type Produzido } from './tick.ts'

export interface ResumoOffline {
  /** Tempo real que passou desde o último tick (>= 0). */
  segundosAusente: number
  /** Tempo efetivamente simulado (limitado pelo teto). */
  segundosSimulados: number
  limitadoPeloTeto: boolean
  /** Total bruto produzido (minério/carvão produzidos; lingotes fundidos). */
  produzido: Produzido
}

/**
 * Simula o tempo em que o app ficou fechado, em passos de 10 s para respeitar
 * gargalos. Relógio que voltou (intervalo negativo) é ignorado sem punição.
 */
export function applyOffline(
  s: GameState,
  now: number,
): { estado: GameState; resumo: ResumoOffline } {
  const bruto = (now - s.lastTick) / 1000
  const segundosAusente = Number.isFinite(bruto) && bruto > 0 ? bruto : 0
  const segundosSimulados = Math.min(segundosAusente, OFFLINE.tetoSegundos)

  let estado = s
  const produzido: Produzido = { ...PRODUZIDO_ZERO }
  let restante = segundosSimulados
  while (restante > 1e-9) {
    const dt = Math.min(OFFLINE.passoSegundos, restante)
    const r = tickDetalhado(estado, dt)
    estado = r.estado
    produzido.minerio += r.produzido.minerio
    produzido.carvao += r.produzido.carvao
    produzido.lingote += r.produzido.lingote
    restante -= dt
  }

  return {
    estado: { ...estado, lastTick: now },
    resumo: {
      segundosAusente,
      segundosSimulados,
      limitadoPeloTeto: segundosAusente > OFFLINE.tetoSegundos,
      produzido,
    },
  }
}
