// Minigame da batida (GDD §3). A regra é pura: recebe onde o jogador tocou
// (0..1) e as zonas, e devolve o resultado. O marcador em si é só UI, mas a
// função de posição vive aqui para ser testável.
import type { ResultadoBatida } from './items.ts'

export const BATIDA = {
  duracaoSegundos: 3,
  /** Meia-largura das zonas, em fração da barra. */
  meiaPerfeito: 0.05,
  meiaBom: 0.15,
  /** Ida e volta completa do marcador, em segundos. */
  periodo: 1.4,
  /** prefers-reduced-motion: marcador bem mais lento (ver README). */
  periodoReduzido: 3.6,
  /** O alvo fica longe das pontas para a zona caber inteira. */
  alvoMin: 0.2,
  alvoMax: 0.8,
} as const

export interface ZonasBatida {
  alvo: number
  meiaPerfeito: number
  meiaBom: number
}

export function zonasDe(alvo: number): ZonasBatida {
  return { alvo, meiaPerfeito: BATIDA.meiaPerfeito, meiaBom: BATIDA.meiaBom }
}

/** Alvo (0,2..0,8) a partir de um número em [0, 1). */
export function alvoDe(sorteio: number): number {
  return BATIDA.alvoMin + (BATIDA.alvoMax - BATIDA.alvoMin) * sorteio
}

/** `posicao` nulo = o tempo acabou sem toque. Nunca devolve "automatico". */
export function avaliarBatida(
  posicao: number | null,
  zonas: ZonasBatida,
): Exclude<ResultadoBatida, 'automatico'> {
  if (posicao === null || !Number.isFinite(posicao)) return 'errou'
  const d = Math.abs(posicao - zonas.alvo)
  // Pequena tolerância para não perder por erro de ponto flutuante na borda.
  if (d <= zonas.meiaPerfeito + 1e-9) return 'perfeito'
  if (d <= zonas.meiaBom + 1e-9) return 'bom'
  return 'errou'
}

/** Onda triangular: 0 -> 1 -> 0 a cada `periodo` segundos, começando em 0. */
export function posicaoMarcador(tSegundos: number, reduzido = false): number {
  const periodo = reduzido ? BATIDA.periodoReduzido : BATIDA.periodo
  const fase = (((tSegundos / periodo) % 1) + 1) % 1
  return fase < 0.5 ? fase * 2 : 2 - fase * 2
}
