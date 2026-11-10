// Som opcional (GDD §6): tons curtos gerados com Web Audio, sem arquivo de terceiros, desligado por
// padrão. O contexto só nasce no primeiro toque do jogador (celulares bloqueiam áudio antes disso).
// Cada som dura menos de meio segundo e fica baixo; falha em silêncio se o navegador não tiver Web Audio.

export type SomId = 'moeda' | 'batida' | 'perfeito' | 'entrega' | 'conquista'

interface Nota {
  /** Frequência em Hz. */
  f: number
  /** Início em segundos a partir de agora. */
  t: number
  /** Duração em segundos. */
  d: number
  tipo?: OscillatorType
  /** Volume de pico (0..1). */
  v?: number
}

export const NOTAS: Record<SomId, readonly Nota[]> = {
  moeda: [
    { f: 988, t: 0, d: 0.07, tipo: 'square', v: 0.05 },
    { f: 1319, t: 0.07, d: 0.12, tipo: 'square', v: 0.05 },
  ],
  batida: [{ f: 150, t: 0, d: 0.09, tipo: 'triangle', v: 0.18 }],
  perfeito: [
    { f: 180, t: 0, d: 0.08, tipo: 'triangle', v: 0.18 },
    { f: 1568, t: 0.04, d: 0.18, tipo: 'sine', v: 0.08 },
  ],
  entrega: [
    { f: 523, t: 0, d: 0.08, tipo: 'triangle', v: 0.09 },
    { f: 659, t: 0.08, d: 0.08, tipo: 'triangle', v: 0.09 },
    { f: 784, t: 0.16, d: 0.16, tipo: 'triangle', v: 0.09 },
  ],
  conquista: [
    { f: 659, t: 0, d: 0.1, tipo: 'sine', v: 0.09 },
    { f: 880, t: 0.1, d: 0.1, tipo: 'sine', v: 0.09 },
    { f: 1175, t: 0.2, d: 0.22, tipo: 'sine', v: 0.09 },
  ],
}

let contexto: AudioContext | null = null

function obterContexto(): AudioContext | null {
  if (contexto) return contexto
  const Ctor: typeof AudioContext | undefined =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctor) return null
  try {
    contexto = new Ctor()
  } catch {
    contexto = null
  }
  return contexto
}

/** Toca o som, se o navegador deixar. Nunca lança erro. */
export function tocar(id: SomId): void {
  try {
    const ctx = obterContexto()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    const agora = ctx.currentTime
    for (const n of NOTAS[id]) {
      const osc = ctx.createOscillator()
      const ganho = ctx.createGain()
      osc.type = n.tipo ?? 'sine'
      osc.frequency.value = n.f
      const inicio = agora + n.t
      // Envelope curto: sobe rápido e cai a zero, para não estalar.
      ganho.gain.setValueAtTime(0.0001, inicio)
      ganho.gain.exponentialRampToValueAtTime(n.v ?? 0.08, inicio + 0.01)
      ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + n.d)
      osc.connect(ganho).connect(ctx.destination)
      osc.start(inicio)
      osc.stop(inicio + n.d + 0.02)
    }
  } catch {
    /* sem áudio: segue o jogo em silêncio */
  }
}
