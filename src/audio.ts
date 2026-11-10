// Som do jogo: tudo sintetizado com Web Audio na hora, sem nenhum arquivo. Cada efeito é uma receita
// de notas (osciladores com envelope curto, com ou sem deslize de frequência) e de sopros de ruído
// filtrado (o "tchac" da picareta, o estalo do martelo, o fole). O contexto só nasce no primeiro som
// pedido, que sempre vem de um toque do jogador (celulares bloqueiam áudio antes disso). Falha em
// silêncio se o navegador não tiver Web Audio.

export type SomId =
  | 'moeda'
  | 'batida'
  | 'perfeito'
  | 'entrega'
  | 'conquista'
  | 'picareta'
  | 'carvao'
  | 'fole'
  | 'martelo'
  | 'negado'
  | 'melhorar'
  | 'marco'
  | 'raro'
  | 'construir'
  | 'equipar'
  | 'partir'
  | 'golpe'
  | 'vitoria'
  | 'derrota'
  | 'aba'

export interface Nota {
  /** Frequência em Hz. */
  f: number
  /** Se presente, a frequência desliza até aqui durante a nota. */
  ate?: number
  /** Início em segundos a partir de agora. */
  t: number
  /** Duração em segundos. */
  d: number
  tipo?: OscillatorType
  /** Volume de pico (0..1). */
  v?: number
}

export interface Ruido {
  t: number
  d: number
  v: number
  filtro: BiquadFilterType
  /** Frequência de corte ou central do filtro, em Hz. */
  f: number
}

export interface Som {
  notas: readonly Nota[]
  ruidos?: readonly Ruido[]
}

const arpejo = (fs: readonly number[], passo: number, d: number, tipo: OscillatorType, v: number): Nota[] =>
  fs.map((f, i) => ({ f, t: i * passo, d: i === fs.length - 1 ? d * 2 : d, tipo, v }))

export const SONS: Record<SomId, Som> = {
  moeda: { notas: [{ f: 988, t: 0, d: 0.07, tipo: 'square', v: 0.08 }, { f: 1319, t: 0.07, d: 0.14, tipo: 'square', v: 0.08 }] },
  batida: {
    notas: [{ f: 150, t: 0, d: 0.09, tipo: 'triangle', v: 0.18 }],
    ruidos: [{ t: 0, d: 0.05, v: 0.1, filtro: 'highpass', f: 2500 }],
  },
  perfeito: {
    notas: [
      { f: 180, t: 0, d: 0.08, tipo: 'triangle', v: 0.18 },
      { f: 1568, t: 0.03, d: 0.22, tipo: 'sine', v: 0.08 },
      { f: 2349, t: 0.06, d: 0.2, tipo: 'sine', v: 0.05 },
    ],
    ruidos: [{ t: 0, d: 0.05, v: 0.1, filtro: 'highpass', f: 3000 }],
  },
  entrega: { notas: arpejo([523, 659, 784], 0.08, 0.08, 'triangle', 0.09) },
  conquista: { notas: arpejo([659, 880, 1175], 0.1, 0.11, 'sine', 0.09) },

  // Toques na cena da forja.
  picareta: {
    notas: [{ f: 320, ate: 140, t: 0, d: 0.07, tipo: 'triangle', v: 0.14 }],
    ruidos: [{ t: 0, d: 0.045, v: 0.12, filtro: 'bandpass', f: 1800 }],
  },
  carvao: {
    notas: [{ f: 150, ate: 90, t: 0, d: 0.08, tipo: 'triangle', v: 0.13 }],
    ruidos: [{ t: 0, d: 0.07, v: 0.09, filtro: 'lowpass', f: 900 }],
  },
  fole: {
    notas: [{ f: 110, ate: 170, t: 0, d: 0.16, tipo: 'sine', v: 0.06 }],
    ruidos: [{ t: 0, d: 0.2, v: 0.1, filtro: 'bandpass', f: 700 }],
  },
  martelo: {
    // Metal: dois parciais desafinados entre si, mais o estalo do impacto.
    notas: [
      { f: 1245, t: 0, d: 0.16, tipo: 'sine', v: 0.09 },
      { f: 1870, t: 0, d: 0.1, tipo: 'sine', v: 0.06 },
      { f: 190, ate: 120, t: 0, d: 0.06, tipo: 'triangle', v: 0.14 },
    ],
    ruidos: [{ t: 0, d: 0.03, v: 0.12, filtro: 'highpass', f: 3500 }],
  },
  negado: { notas: [{ f: 160, ate: 120, t: 0, d: 0.1, tipo: 'square', v: 0.03 }] },

  // Progresso.
  melhorar: { notas: [{ f: 523, t: 0, d: 0.06, tipo: 'square', v: 0.075 }, { f: 784, t: 0.06, d: 0.1, tipo: 'square', v: 0.075 }] },
  marco: { notas: [...arpejo([523, 659, 784, 1047], 0.09, 0.1, 'square', 0.05), { f: 262, t: 0, d: 0.4, tipo: 'triangle', v: 0.08 }] },
  raro: { notas: arpejo([1047, 1319, 1568, 2093, 2637], 0.06, 0.09, 'sine', 0.1) },
  construir: {
    notas: [{ f: 110, ate: 70, t: 0, d: 0.16, tipo: 'triangle', v: 0.18 }, ...arpejo([392, 494, 587], 0.09, 0.1, 'triangle', 0.07).map((n) => ({ ...n, t: n.t + 0.12 }))],
    ruidos: [{ t: 0, d: 0.14, v: 0.12, filtro: 'lowpass', f: 500 }],
  },
  equipar: {
    notas: [{ f: 1568, t: 0, d: 0.07, tipo: 'sine', v: 0.06 }, { f: 2093, t: 0.05, d: 0.1, tipo: 'sine', v: 0.05 }],
    ruidos: [{ t: 0, d: 0.03, v: 0.07, filtro: 'highpass', f: 4000 }],
  },
  partir: { notas: [{ f: 392, t: 0, d: 0.1, tipo: 'triangle', v: 0.08 }, { f: 587, t: 0.1, d: 0.18, tipo: 'triangle', v: 0.08 }] },

  // Combate.
  golpe: {
    notas: [{ f: 220, ate: 90, t: 0, d: 0.1, tipo: 'sawtooth', v: 0.14 }],
    ruidos: [{ t: 0, d: 0.08, v: 0.15, filtro: 'lowpass', f: 1800 }],
  },
  vitoria: { notas: [...arpejo([523, 659, 784, 1047, 1319], 0.1, 0.11, 'square', 0.05), { f: 131, t: 0, d: 0.5, tipo: 'triangle', v: 0.09 }] },
  derrota: { notas: arpejo([392, 330, 262, 196], 0.13, 0.14, 'triangle', 0.08) },

  aba: { notas: [{ f: 660, t: 0, d: 0.04, tipo: 'sine', v: 0.04 }] },
}

/** Duração total de um som, em segundos. */
export function duracaoDe(id: SomId): number {
  const s = SONS[id]
  return Math.max(...s.notas.map((n) => n.t + n.d), ...(s.ruidos ?? []).map((r) => r.t + r.d))
}

/** O mesmo som não repete antes disso (toques em rajada, golpes do replay). */
export const INTERVALO_MIN_MS = 45

let contexto: AudioContext | null = null
let saida: GainNode | null = null
let ruidoBranco: AudioBuffer | null = null
const ultimaVez: Partial<Record<SomId, number>> = {}

function obterContexto(): AudioContext | null {
  if (contexto) return contexto
  const Ctor: typeof AudioContext | undefined =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctor) return null
  try {
    contexto = new Ctor()
    saida = contexto.createGain()
    // Volume geral. Medido com OfflineAudioContext: com 1,8 o efeito mais forte (martelo) chega a ~0,5 de 1,0.
    saida.gain.value = 1.8
    saida.connect(contexto.destination)
    // Meio segundo de ruído branco, reaproveitado por todos os sopros.
    ruidoBranco = contexto.createBuffer(1, Math.floor(contexto.sampleRate * 0.5), contexto.sampleRate)
    const dados = ruidoBranco.getChannelData(0)
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1
  } catch {
    contexto = null
  }
  return contexto
}

function envelope(ganho: GainNode, inicio: number, d: number, pico: number): void {
  // Sobe rápido e cai a zero, para não estalar.
  ganho.gain.setValueAtTime(0.0001, inicio)
  ganho.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), inicio + 0.008)
  ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + d)
}

/** Toca o som, se o navegador deixar. Nunca lança erro. `volume` multiplica o da receita. */
export function tocar(id: SomId, volume = 1): void {
  try {
    const ctx = obterContexto()
    if (!ctx || !saida) return
    const relogio = typeof performance === 'undefined' ? Date.now() : performance.now()
    if (relogio - (ultimaVez[id] ?? -1e9) < INTERVALO_MIN_MS) return
    ultimaVez[id] = relogio
    if (ctx.state === 'suspended') void ctx.resume()
    const agora = ctx.currentTime
    const som = SONS[id]

    for (const n of som.notas) {
      const osc = ctx.createOscillator()
      const ganho = ctx.createGain()
      osc.type = n.tipo ?? 'sine'
      const inicio = agora + n.t
      osc.frequency.setValueAtTime(n.f, inicio)
      if (n.ate) osc.frequency.exponentialRampToValueAtTime(n.ate, inicio + n.d)
      envelope(ganho, inicio, n.d, (n.v ?? 0.08) * volume)
      osc.connect(ganho).connect(saida)
      osc.start(inicio)
      osc.stop(inicio + n.d + 0.02)
    }

    for (const r of som.ruidos ?? []) {
      if (!ruidoBranco) break
      const fonte = ctx.createBufferSource()
      fonte.buffer = ruidoBranco
      const filtro = ctx.createBiquadFilter()
      filtro.type = r.filtro
      filtro.frequency.value = r.f
      const ganho = ctx.createGain()
      const inicio = agora + r.t
      envelope(ganho, inicio, r.d, r.v * volume)
      fonte.connect(filtro).connect(ganho).connect(saida)
      // Começa num ponto qualquer do ruído, para dois sopros seguidos não soarem idênticos.
      fonte.start(inicio, Math.random() * 0.2, r.d + 0.02)
    }
  } catch {
    /* sem áudio: segue o jogo em silêncio */
  }
}

// ---------- Ambiente: o crepitar da fornalha ----------
let crepitando: number | null = null

function estalo(): void {
  try {
    const ctx = contexto
    if (!ctx || !saida || !ruidoBranco || ctx.state !== 'running') return
    const fonte = ctx.createBufferSource()
    fonte.buffer = ruidoBranco
    const filtro = ctx.createBiquadFilter()
    filtro.type = 'bandpass'
    filtro.frequency.value = 1500 + Math.random() * 3500
    const ganho = ctx.createGain()
    const d = 0.012 + Math.random() * 0.03
    envelope(ganho, ctx.currentTime, d, 0.012 + Math.random() * 0.025)
    fonte.connect(filtro).connect(ganho).connect(saida)
    fonte.start(ctx.currentTime, Math.random() * 0.3, d + 0.02)
  } catch {
    /* silêncio */
  }
}

/** Liga ou desliga os estalos baixinhos do fogo. Só soa depois que algum som já destravou o áudio. */
export function crepitar(ligado: boolean): void {
  if (typeof window === 'undefined') return
  if (!ligado) {
    if (crepitando !== null) window.clearTimeout(crepitando)
    crepitando = null
    return
  }
  if (crepitando !== null) return
  const proximo = () => {
    estalo()
    if (Math.random() < 0.3) window.setTimeout(estalo, 40 + Math.random() * 60)
    crepitando = window.setTimeout(proximo, 120 + Math.random() * 520)
  }
  crepitando = window.setTimeout(proximo, 300)
}
