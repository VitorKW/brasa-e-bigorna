import { describe, expect, it } from 'vitest'
import { BIGORNA, custoUpgrade, tempoForjaBase } from './constants.ts'
import {
  RECEITAS,
  calcularQ,
  nomeItem,
  nomeQualidade,
  qualidadeDe,
  valorItem,
} from './items.ts'

describe('qualidade', () => {
  it('faixas do GDD §4.2 (limites exatos)', () => {
    expect(qualidadeDe(0)).toBe('comum')
    expect(qualidadeDe(29)).toBe('comum')
    expect(qualidadeDe(30)).toBe('incomum')
    expect(qualidadeDe(49)).toBe('incomum')
    expect(qualidadeDe(50)).toBe('raro')
    expect(qualidadeDe(69)).toBe('raro')
    expect(qualidadeDe(70)).toBe('epico')
    expect(qualidadeDe(89)).toBe('epico')
    expect(qualidadeDe(90)).toBe('lendario')
    expect(qualidadeDe(500)).toBe('lendario')
  })

  it('Q = 2 × ferreiro + bigorna + material + batida + aleatório', () => {
    const base = { nivelFerreiro: 3, nivelBigorna: 4, material: 'ferro', batida: 'automatico', aleatorio: 7 } as const
    expect(calcularQ(base)).toBe(6 + 4 + 0 + 5 + 7)
    expect(calcularQ({ ...base, material: 'aco' })).toBe(6 + 4 + 10 + 5 + 7)
    expect(calcularQ({ ...base, batida: 'perfeito' })).toBe(6 + 4 + 20 + 7)
    expect(calcularQ({ ...base, batida: 'bom' })).toBe(6 + 4 + 10 + 7)
  })

  it('errou nunca é pior que o automático', () => {
    const base = { nivelFerreiro: 1, nivelBigorna: 1, material: 'ferro', aleatorio: 0 } as const
    expect(calcularQ({ ...base, batida: 'errou' })).toBe(calcularQ({ ...base, batida: 'automatico' }))
  })

  it('passivas: bônus fixo e multiplicador', () => {
    const base = { nivelFerreiro: 0, nivelBigorna: 1, material: 'ferro', batida: 'automatico', aleatorio: 4 } as const
    expect(calcularQ({ ...base, bonusFixo: 10 })).toBe(20)
    expect(calcularQ({ ...base, multiplicador: 1.1 })).toBe(11) // floor(10 × 1,1)
  })

  it('valor = base × qualidade × material', () => {
    expect(valorItem('espada', 'ferro', 'comum')).toBe(25)
    expect(valorItem('escudo', 'ferro', 'incomum')).toBe(45)
    expect(valorItem('armadura', 'ferro', 'lendario')).toBe(350)
    expect(valorItem('espada', 'aco', 'raro')).toBe(25 * 2.5 * 4)
  })

  it('receitas do GDD §4.2', () => {
    expect(RECEITAS.espada).toMatchObject({ lingotes: 3, segundos: 10, valorBase: 25 })
    expect(RECEITAS.escudo).toMatchObject({ lingotes: 4, segundos: 12, valorBase: 30 })
    expect(RECEITAS.armadura).toMatchObject({ lingotes: 6, segundos: 20, valorBase: 50 })
    expect(RECEITAS.machado.lingotes).toBe(3)
    expect(RECEITAS.elmo.segundos).toBe(12)
  })

  it('nomes concordam em gênero', () => {
    expect(nomeQualidade('raro', 'espada')).toBe('rara')
    expect(nomeQualidade('raro', 'machado')).toBe('raro')
    expect(nomeQualidade('lendario', 'armadura')).toBe('lendária')
    expect(nomeItem({ tipo: 'elmo', material: 'aco' })).toBe('Elmo de aço')
  })
})

describe('bigorna: curvas', () => {
  it('custo de nível 200 × 1,2^n (n >= 1) e desbloqueio próprio', () => {
    expect(custoUpgrade('bigorna', 1)).toBeCloseTo(240, 6)
    expect(custoUpgrade('bigorna', 5)).toBeCloseTo(200 * 1.2 ** 5, 6)
    expect(custoUpgrade('bigorna', 0)).toBe(BIGORNA.custoDesbloqueio)
  })

  it('tempo de forja = base × 0,92^(n−1)', () => {
    expect(tempoForjaBase(10, 1)).toBe(10)
    expect(tempoForjaBase(10, 2)).toBeCloseTo(9.2, 9)
    expect(tempoForjaBase(20, 11)).toBeCloseTo(20 * 0.92 ** 10, 9)
  })
})
