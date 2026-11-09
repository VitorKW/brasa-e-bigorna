import { MOEDAS_INICIAIS, SAVE_VERSION, type EstacaoId, type RecursoId } from './constants.ts'

export interface GameState {
  version: number
  /** Timestamp (ms) da última simulação aplicada. */
  lastTick: number
  niveis: Record<EstacaoId, number>
  recursos: Record<RecursoId, number>
  moedas: number
  /** Total de moedas já ganhas em vendas (base do prestígio, GDD §4.2). */
  moedasGanhas: number
}

export function estadoInicial(now: number): GameState {
  return {
    version: SAVE_VERSION,
    lastTick: now,
    niveis: { mina: 1, carvoaria: 1, fornalha: 1 },
    recursos: { minerio: 0, carvao: 0, lingote: 0 },
    moedas: MOEDAS_INICIAIS,
    moedasGanhas: 0,
  }
}
