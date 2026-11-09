// RNG determinístico (mulberry32). O estado é um inteiro de 32 bits guardado no
// GameState: as regras nunca chamam Math.random, então sim e testes se repetem
// e o sorteio de uma forja fica gravado no save (anti-trapaça, GDD §4.5).

export interface Sorteio<T> {
  valor: T
  /** Novo estado do gerador: guarde-o no GameState. */
  rng: number
}

/** Próximo número em [0, 1). */
export function proximo(rng: number): Sorteio<number> {
  const a = (rng + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return { valor: ((t ^ (t >>> 14)) >>> 0) / 4294967296, rng: a }
}

/** Inteiro uniforme em [0, max], inclusive. */
export function inteiro(rng: number, max: number): Sorteio<number> {
  const r = proximo(rng)
  return { valor: Math.floor(r.valor * (max + 1)), rng: r.rng }
}

/** Semente (inteiro de 32 bits) a partir de qualquer número, como um timestamp. */
export function semente(n: number): number {
  return Math.trunc(Number.isFinite(n) ? n : 0) | 0
}
