import { describe, expect, it } from 'vitest'
import { SONS, crepitar, duracaoDe, tocar, type SomId } from './audio.ts'

const IDS = Object.keys(SONS) as SomId[]

describe('som sintetizado', () => {
  it('todo som é curto (menos de 0,9 s), baixo e com frequências audíveis', () => {
    for (const id of IDS) {
      const som = SONS[id]
      expect(som.notas.length, id).toBeGreaterThan(0)
      expect(duracaoDe(id), id).toBeLessThan(0.9)
      for (const n of som.notas) {
        for (const f of [n.f, n.ate ?? n.f]) {
          expect(f, id).toBeGreaterThan(60)
          expect(f, id).toBeLessThan(4000)
        }
        expect(n.v ?? 0.08, id).toBeLessThanOrEqual(0.2)
        expect(n.d, id).toBeGreaterThan(0)
      }
      for (const r of som.ruidos ?? []) {
        expect(r.v, id).toBeLessThanOrEqual(0.15)
        expect(r.d, id).toBeLessThanOrEqual(0.25)
      }
    }
  })

  it('os sons de toque (que repetem muito) são os mais curtos', () => {
    for (const id of ['picareta', 'carvao', 'martelo', 'negado', 'aba', 'golpe'] as const) {
      expect(duracaoDe(id), id).toBeLessThanOrEqual(0.2)
    }
  })

  it('sem Web Audio (Node, navegador antigo) nada lança erro', () => {
    for (const id of IDS) expect(() => tocar(id)).not.toThrow()
    expect(() => crepitar(true)).not.toThrow()
    expect(() => crepitar(false)).not.toThrow()
  })
})
