import { describe, expect, it } from 'vitest'
import { QUALIDADES } from '../game/items.ts'
import { COR_QUALIDADE, FUNDOS_PAINEL, contraste } from './qualidade.ts'

describe('cores de qualidade', () => {
  it('calculadora de contraste confere com valores conhecidos', () => {
    expect(contraste('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contraste('#777777', '#ffffff')).toBeCloseTo(4.48, 1)
  })

  it('cada cor tem contraste >= 4,5:1 (texto) contra os fundos de painel', () => {
    for (const q of QUALIDADES) {
      for (const fundo of FUNDOS_PAINEL) {
        expect(contraste(COR_QUALIDADE[q], fundo), `${q} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('as cinco cores são diferentes entre si', () => {
    expect(new Set(Object.values(COR_QUALIDADE)).size).toBe(5)
  })
})
