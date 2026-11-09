import { describe, expect, it } from 'vitest'
import {
  custoUpgrade,
  marco,
  producaoCarvoaria,
  producaoMina,
  velocidadeFornalha,
} from './constants.ts'

describe('curvas do GDD §4.2', () => {
  it('marco(n) dobra a cada marco e é acumulativo', () => {
    expect(marco(1)).toBe(1)
    expect(marco(9)).toBe(1)
    expect(marco(10)).toBe(2)
    expect(marco(24)).toBe(2)
    expect(marco(25)).toBe(4)
    expect(marco(50)).toBe(8)
    expect(marco(100)).toBe(16)
  })

  it('custos batem com a tabela §4.3', () => {
    expect(custoUpgrade('mina', 1)).toBeCloseTo(11.5, 1)
    expect(custoUpgrade('mina', 10)).toBeCloseTo(40.5, 1)
    expect(custoUpgrade('carvoaria', 1)).toBeCloseTo(17.25, 2)
    expect(custoUpgrade('carvoaria', 10)).toBeCloseTo(60.7, 1)
    expect(custoUpgrade('fornalha', 1)).toBeCloseTo(59, 0)
    expect(custoUpgrade('fornalha', 10)).toBeCloseTo(262, 0)
  })

  it('produção bate com a tabela §4.3', () => {
    expect(producaoMina(1)).toBe(1)
    expect(producaoMina(9)).toBe(9)
    expect(producaoMina(10)).toBe(20)
    expect(producaoCarvoaria(5)).toBe(2.5)
    expect(producaoCarvoaria(10)).toBe(10)
    expect(velocidadeFornalha(1)).toBe(0.25)
    expect(velocidadeFornalha(5)).toBeCloseTo(0.4, 5)
    expect(velocidadeFornalha(10)).toBeCloseTo(1.175, 5)
  })
})
