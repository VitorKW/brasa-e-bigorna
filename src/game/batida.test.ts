import { describe, expect, it } from 'vitest'
import { BATIDA, alvoDe, avaliarBatida, posicaoMarcador, zonasDe } from './batida.ts'

describe('minigame da batida', () => {
  const z = zonasDe(0.5)

  it('perfeito no centro e na borda da zona', () => {
    expect(avaliarBatida(0.5, z)).toBe('perfeito')
    expect(avaliarBatida(0.5 + BATIDA.meiaPerfeito, z)).toBe('perfeito')
    expect(avaliarBatida(0.5 - BATIDA.meiaPerfeito, z)).toBe('perfeito')
  })

  it('bom entre as zonas', () => {
    expect(avaliarBatida(0.5 + BATIDA.meiaPerfeito + 0.01, z)).toBe('bom')
    expect(avaliarBatida(0.5 - BATIDA.meiaBom, z)).toBe('bom')
  })

  it('errou fora da zona, sem toque e com valor inválido', () => {
    expect(avaliarBatida(0.5 + BATIDA.meiaBom + 0.01, z)).toBe('errou')
    expect(avaliarBatida(0, z)).toBe('errou')
    expect(avaliarBatida(null, z)).toBe('errou')
    expect(avaliarBatida(NaN, z)).toBe('errou')
  })

  it('alvo fica entre 0,2 e 0,8', () => {
    expect(alvoDe(0)).toBeCloseTo(0.2, 9)
    expect(alvoDe(0.999)).toBeLessThanOrEqual(0.8)
  })

  it('marcador: onda triangular 0..1, começa em 0 e é periódica', () => {
    expect(posicaoMarcador(0)).toBe(0)
    expect(posicaoMarcador(BATIDA.periodo / 2)).toBeCloseTo(1, 9)
    expect(posicaoMarcador(BATIDA.periodo)).toBeCloseTo(0, 9)
    expect(posicaoMarcador(BATIDA.periodo / 4)).toBeCloseTo(0.5, 9)
    for (let t = 0; t < 3; t += 0.05) {
      const p = posicaoMarcador(t)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  it('movimento reduzido: bem mais lento', () => {
    expect(posicaoMarcador(0.35, true)).toBeLessThan(posicaoMarcador(0.35, false))
    expect(BATIDA.periodoReduzido).toBeGreaterThan(2 * BATIDA.periodo)
  })
})
