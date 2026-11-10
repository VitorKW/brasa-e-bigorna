import { describe, expect, it } from 'vitest'
import { DURACAO_REPLAY_MS, passoDoReplay } from './CombateReplay.tsx'

describe('tempo do replay', () => {
  it('dura cerca de 6 s, não importa quantos golpes teve o combate', () => {
    for (const golpes of [10, 40, 60, 90, 120, 150]) {
      const total = 500 + passoDoReplay(golpes) * golpes
      expect(total, `${golpes} golpes`).toBeLessThanOrEqual(DURACAO_REPLAY_MS + 1)
      expect(total).toBeGreaterThan(DURACAO_REPLAY_MS * 0.5)
    }
  })

  it('combates muito curtos não ficam lentos demais e longos não ficam rápidos demais para ler', () => {
    expect(passoDoReplay(2)).toBeLessThanOrEqual(450)
    expect(passoDoReplay(500)).toBeGreaterThanOrEqual(35)
    expect(passoDoReplay(0)).toBeGreaterThan(0)
  })
})
