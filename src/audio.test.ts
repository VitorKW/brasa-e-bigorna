import { describe, expect, it } from 'vitest'
import { NOTAS, tocar, type SomId } from './audio.ts'

describe('som opcional', () => {
  it('todo som é curto (menos de meio segundo), baixo e com frequências audíveis', () => {
    for (const id of Object.keys(NOTAS) as SomId[]) {
      const notas = NOTAS[id]
      expect(notas.length).toBeGreaterThan(0)
      const fim = Math.max(...notas.map((n) => n.t + n.d))
      expect(fim, id).toBeLessThan(0.5)
      for (const n of notas) {
        expect(n.f).toBeGreaterThan(80)
        expect(n.f).toBeLessThan(4000)
        expect(n.v ?? 0.08).toBeLessThanOrEqual(0.2)
      }
    }
  })

  it('sem Web Audio (Node, navegador antigo) tocar não lança erro', () => {
    expect(() => tocar('moeda')).not.toThrow()
    expect(() => tocar('conquista')).not.toThrow()
  })
})
