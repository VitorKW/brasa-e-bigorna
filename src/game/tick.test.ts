import { describe, expect, it } from 'vitest'
import { analisarCadeia, taxas } from './chain.ts'
import { estadoInicial, type GameState } from './state.ts'
import { tick } from './tick.ts'

const base = (mut: Partial<GameState> = {}): GameState => ({ ...estadoInicial(0), ...mut })

describe('tick', () => {
  it('mina e carvoaria produzem; fornalha converte 2 minério + 1 carvão em 1 lingote', () => {
    const s = tick(base(), 4) // minério 4, carvão 2, fornalha capaz de 1 lingote
    expect(s.recursos.lingote).toBeCloseTo(1, 9)
    expect(s.recursos.minerio).toBeCloseTo(4 - 2, 9)
    expect(s.recursos.carvao).toBeCloseTo(2 - 1, 9)
  })

  it('dt <= 0 ou inválido não altera o estado', () => {
    const s = base()
    expect(tick(s, 0)).toBe(s)
    expect(tick(s, -5)).toBe(s)
    expect(tick(s, NaN)).toBe(s)
  })

  it('não muta o estado de entrada', () => {
    const s = base()
    const copia = structuredClone(s)
    tick(s, 10)
    expect(s).toEqual(copia)
  })

  it('sem carvão suficiente a fornalha para (gargalo) e o minério sobra', () => {
    const s = tick(base({ niveis: { mina: 10, carvoaria: 1, fornalha: 10, bigorna: 0 } }), 10)
    expect(s.recursos.lingote).toBeCloseTo(5, 6) // carvão produzido: 0,5/s * 10 s
    expect(s.recursos.carvao).toBeCloseTo(0, 6)
    expect(s.recursos.minerio).toBeCloseTo(200 - 10, 6)
  })

  it('fornalha limitada pelo minério produz exatamente minério/2', () => {
    const s = tick(base({ niveis: { mina: 1, carvoaria: 10, fornalha: 10, bigorna: 0 } }), 10)
    expect(s.recursos.lingote).toBeCloseTo(5, 6) // 10 minério / 2
    expect(s.recursos.minerio).toBeCloseTo(0, 6)
  })
})

describe('cadeia e gargalo', () => {
  it('nível inicial: fornalha é o gargalo e trabalha', () => {
    const a = analisarCadeia(base())
    expect(a.gargalo).toBe('fornalha')
    expect(a.fornalha).toBe('trabalhando')
  })

  it('mina fraca: mina é o gargalo e a fornalha para sem minério', () => {
    const s = base({ niveis: { mina: 1, carvoaria: 10, fornalha: 10, bigorna: 0 } })
    expect(taxas(s).lingote).toBeCloseTo(0.5, 9)
    const a = analisarCadeia(s)
    expect(a.gargalo).toBe('mina')
    expect(a.fornalha).toBe('sem-minerio')
  })

  it('carvoaria fraca: sem carvão', () => {
    const s = base({ niveis: { mina: 10, carvoaria: 1, fornalha: 10, bigorna: 0 } })
    const a = analisarCadeia(s)
    expect(a.gargalo).toBe('carvoaria')
    expect(a.fornalha).toBe('sem-carvao')
  })

  it('estoque cobrindo a fornalha desliga o alerta', () => {
    const s = base({
      niveis: { mina: 1, carvoaria: 10, fornalha: 10, bigorna: 0 },
      recursos: { minerio: 100, carvao: 100, lingote: 0 },
    })
    expect(analisarCadeia(s).fornalha).toBe('trabalhando')
  })
})
