import { describe, expect, it } from 'vitest'
import { comprarUpgrade, custoProximoNivel, podeComprar, vender } from './economy.ts'
import { estadoInicial } from './state.ts'

describe('comprar upgrade', () => {
  it('custo = base x taxa^n', () => {
    const s = estadoInicial(0)
    expect(custoProximoNivel(s, 'mina')).toBeCloseTo(10 * 1.15, 9)
    expect(custoProximoNivel({ ...s, niveis: { ...s.niveis, fornalha: 3 } }, 'fornalha')).toBeCloseTo(
      50 * 1.18 ** 3,
      9,
    )
  })

  it('compra e debita o custo', () => {
    const s = { ...estadoInicial(0), moedas: 100 }
    const r = comprarUpgrade(s, 'mina')
    expect(r.niveis.mina).toBe(2)
    expect(r.moedas).toBeCloseTo(100 - 11.5, 9)
  })

  it('não deixa comprar sem moeda (mesmo estado, sem efeito)', () => {
    const s = { ...estadoInicial(0), moedas: 11 }
    expect(podeComprar(s, 'mina')).toBe(false)
    expect(comprarUpgrade(s, 'mina')).toBe(s)
  })

  it('moeda igual ao custo compra', () => {
    const s = { ...estadoInicial(0), moedas: 50 * 1.18 }
    expect(comprarUpgrade(s, 'fornalha').niveis.fornalha).toBe(2)
  })
})

describe('vender', () => {
  const com = { ...estadoInicial(0), recursos: { minerio: 10, carvao: 10, lingote: 3, aco: 0 }, moedas: 0 }

  it('vende tudo pelos preços do GDD', () => {
    expect(vender(com, 'minerio').ganho).toBeCloseTo(2, 9)
    expect(vender(com, 'carvao').ganho).toBeCloseTo(3, 9)
    const r = vender(com, 'lingote', 'tudo')
    expect(r.ganho).toBe(6)
    expect(r.estado.moedas).toBe(6)
    expect(r.estado.moedasGanhas).toBe(6)
    expect(r.estado.recursos.lingote).toBe(0)
  })

  it('vende quantidade parcial e limita ao estoque', () => {
    expect(vender(com, 'lingote', 1).estado.recursos.lingote).toBe(2)
    expect(vender(com, 'lingote', 99).ganho).toBe(6)
  })

  it('quantidade <= 0 ou estoque vazio não faz nada', () => {
    expect(vender(com, 'lingote', 0).estado).toBe(com)
    expect(vender(com, 'lingote', -2).estado).toBe(com)
    expect(vender(estadoInicial(0), 'minerio').estado.moedas).toBe(10)
  })
})
