import { describe, expect, it } from 'vitest'
import { OFFLINE } from './constants.ts'
import { applyOffline } from './offline.ts'
import { estadoInicial } from './state.ts'
import { tick } from './tick.ts'

describe('applyOffline', () => {
  it('simula o tempo ausente e devolve resumo', () => {
    const s = estadoInicial(0)
    const { estado, resumo } = applyOffline(s, 60_000)
    expect(resumo.segundosAusente).toBe(60)
    expect(resumo.segundosSimulados).toBe(60)
    expect(resumo.limitadoPeloTeto).toBe(false)
    expect(resumo.produzido.minerio).toBeCloseTo(60, 6)
    expect(resumo.produzido.carvao).toBeCloseTo(30, 6)
    expect(resumo.produzido.lingote).toBeCloseTo(15, 6)
    expect(estado.recursos.lingote).toBeCloseTo(15, 6)
    expect(estado.lastTick).toBe(60_000)
  })

  it('respeita o teto de 2 h', () => {
    const s = estadoInicial(0)
    const { resumo, estado } = applyOffline(s, 10 * 3600 * 1000)
    expect(resumo.segundosAusente).toBe(10 * 3600)
    expect(resumo.segundosSimulados).toBe(OFFLINE.tetoSegundos)
    expect(resumo.limitadoPeloTeto).toBe(true)
    expect(resumo.produzido.minerio).toBeCloseTo(OFFLINE.tetoSegundos, 3)
    expect(estado.lastTick).toBe(10 * 3600 * 1000)
  })

  it('relógio que voltou: não produz, não pune e realinha lastTick', () => {
    const s = { ...estadoInicial(1_000_000), moedas: 77 }
    const { estado, resumo } = applyOffline(s, 500_000)
    expect(resumo.segundosAusente).toBe(0)
    expect(resumo.produzido).toEqual({ minerio: 0, carvao: 0, lingote: 0 })
    expect(estado.recursos).toEqual(s.recursos)
    expect(estado.moedas).toBe(77)
    expect(estado.lastTick).toBe(500_000)
  })

  it('passos de 10 s concordam com tick contínuo', () => {
    const s = estadoInicial(0)
    const off = applyOffline(s, 600_000).estado
    let cont = s
    for (let i = 0; i < 6000; i++) cont = tick(cont, 0.1)
    expect(off.recursos.lingote).toBeCloseTo(cont.recursos.lingote, 3)
    expect(off.recursos.minerio).toBeCloseTo(cont.recursos.minerio, 3)
  })

  it('trata passo final parcial (95 s = 9 passos de 10 + 5)', () => {
    const { resumo } = applyOffline(estadoInicial(0), 95_000)
    expect(resumo.produzido.minerio).toBeCloseTo(95, 6)
  })

  it('gargalo vale offline: mina fraca limita lingotes', () => {
    const s = { ...estadoInicial(0), niveis: { mina: 1, carvoaria: 10, fornalha: 10 } }
    const { resumo } = applyOffline(s, 100_000)
    expect(resumo.produzido.lingote).toBeCloseTo(50, 3) // 100 minério / 2
  })
})
