import { describe, expect, it } from 'vitest'
import { inteiro, proximo, semente } from './rng.ts'

describe('rng (mulberry32)', () => {
  it('é determinístico: mesma semente, mesma sequência', () => {
    const seq = (seed: number) => {
      let r = seed
      const out: number[] = []
      for (let i = 0; i < 5; i++) {
        const s = proximo(r)
        out.push(s.valor)
        r = s.rng
      }
      return out
    }
    expect(seq(42)).toEqual(seq(42))
    expect(seq(42)).not.toEqual(seq(43))
  })

  it('valores em [0, 1) e distribuição razoável', () => {
    let r = 7
    let soma = 0
    for (let i = 0; i < 10_000; i++) {
      const s = proximo(r)
      expect(s.valor).toBeGreaterThanOrEqual(0)
      expect(s.valor).toBeLessThan(1)
      soma += s.valor
      r = s.rng
    }
    expect(soma / 10_000).toBeGreaterThan(0.47)
    expect(soma / 10_000).toBeLessThan(0.53)
  })

  it('inteiro() cobre 0..max inclusive e nada fora', () => {
    let r = 99
    const vistos = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const s = inteiro(r, 20)
      vistos.add(s.valor)
      r = s.rng
    }
    expect(Math.min(...vistos)).toBe(0)
    expect(Math.max(...vistos)).toBe(20)
    expect(vistos.size).toBe(21)
  })

  it('semente() devolve inteiro de 32 bits', () => {
    expect(semente(1.9)).toBe(1)
    expect(semente(NaN)).toBe(0)
    expect(Number.isInteger(semente(1_700_000_000_000))).toBe(true)
  })
})
