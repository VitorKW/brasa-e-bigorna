import { describe, expect, it } from 'vitest'
import { OFFLINE } from './constants.ts'
import { applyOffline } from './offline.ts'
import { alternarAutomatico, forjar } from './bigorna.ts'
import { estadoInicial, type GameState } from './state.ts'
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
    const s = { ...estadoInicial(0), niveis: { mina: 1, carvoaria: 10, fornalha: 10, bigorna: 0 } }
    const { resumo } = applyOffline(s, 100_000)
    expect(resumo.produzido.lingote).toBeCloseTo(50, 3) // 100 minério / 2
  })

  it('bigorna automática forja offline; resumo conta por qualidade (sem minigame)', () => {
    let s: GameState = {
      ...estadoInicial(0, 5),
      limiteInventario: 100,
      niveis: { mina: 10, carvoaria: 10, fornalha: 10, bigorna: 1 },
      recursos: { minerio: 0, carvao: 0, lingote: 30 },
    }
    s = alternarAutomatico(forjar(s, 'espada'))
    const { estado, resumo } = applyOffline(s, 600_000)
    expect(resumo.totalForjados).toBeGreaterThan(30)
    expect(Object.values(resumo.forjados).reduce((a, b) => a + b, 0)).toBe(resumo.totalForjados)
    expect(estado.itens).toHaveLength(resumo.totalForjados)
    expect(resumo.inventarioCheio).toBe(false)
  })

  it('bigorna parada (manual) não forja nada offline além da tarefa em curso', () => {
    const s: GameState = {
      ...estadoInicial(0),
      niveis: { mina: 10, carvoaria: 10, fornalha: 10, bigorna: 1 },
      recursos: { minerio: 0, carvao: 0, lingote: 30 },
    }
    expect(applyOffline(s, 600_000).resumo.totalForjados).toBe(0)
  })

  it('inventário cheio para a bigorna e o resumo avisa', () => {
    let s: GameState = {
      ...estadoInicial(0),
      limiteInventario: 5,
      niveis: { mina: 10, carvoaria: 10, fornalha: 10, bigorna: 1 },
      recursos: { minerio: 0, carvao: 0, lingote: 1000 },
    }
    s = alternarAutomatico(forjar(s, 'espada'))
    const { estado, resumo } = applyOffline(s, 3_600_000)
    expect(estado.itens).toHaveLength(5)
    expect(resumo.totalForjados).toBe(5)
    expect(resumo.inventarioCheio).toBe(true)
  })

  it('minigame que ficou aberto vale o automático e não rerrola', () => {
    let s: GameState = {
      ...estadoInicial(0),
      niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1 },
      recursos: { minerio: 0, carvao: 0, lingote: 10 },
    }
    s = forjar(s, 'espada', true)
    const sorteio = s.forja!.aleatorio
    const { estado } = applyOffline(s, 60_000)
    expect(estado.itens).toHaveLength(1)
    // 5 (automático) + 1 (bigorna) + sorteio gravado, sem ferreiro
    expect(estado.itens[0]!.pontuacao).toBe(5 + 1 + sorteio)
  })

  it('online (passos de 0,2 s) e offline (passos de 10 s) concordam na quantidade de itens', () => {
    let s: GameState = {
      ...estadoInicial(0, 8),
      niveis: { mina: 10, carvoaria: 10, fornalha: 10, bigorna: 2 },
      recursos: { minerio: 0, carvao: 0, lingote: 60 },
    }
    s = alternarAutomatico(forjar(s, 'espada'))
    let online = s
    for (let i = 0; i < 3000; i++) online = tick(online, 0.2)
    const off = applyOffline(s, 600_000).estado
    expect(Math.abs(off.itens.length - online.itens.length)).toBeLessThanOrEqual(1)
  })
})
