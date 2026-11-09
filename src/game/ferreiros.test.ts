import { describe, expect, it } from 'vitest'
import { taxas } from './chain.ts'
import {
  FERREIROS,
  alocar,
  bonusOdair,
  contratar,
  custoContratar,
  darXp,
  multiplicadorEstacao,
  passivasBigorna,
  xpParaProximo,
} from './ferreiros.ts'
import { estadoInicial, type GameState } from './state.ts'
import { tick } from './tick.ts'

const rico = (): GameState => ({ ...estadoInicial(0), moedas: 1e6 })

describe('contratar', () => {
  it('custo 100 × 4^k', () => {
    let s = rico()
    expect(custoContratar(s)).toBe(100)
    s = contratar(s, 'tito')
    expect(custoContratar(s)).toBe(400)
    s = contratar(s, 'cida')
    expect(custoContratar(s)).toBe(1600)
    expect(s.moedas).toBe(1e6 - 500)
  })

  it('sem moedas ou já contratado: nada muda', () => {
    const pobre = { ...estadoInicial(0), moedas: 99 }
    expect(contratar(pobre, 'tito')).toBe(pobre)
    const s = contratar(rico(), 'tito')
    expect(contratar(s, 'tito')).toBe(s)
  })

  it('existem exatamente os 5 ids do GDD', () => {
    expect([...FERREIROS]).toEqual(['tito', 'cida', 'bene', 'iara', 'odair'])
  })
})

describe('alocar', () => {
  it('só contratado e só em estação compatível', () => {
    const s = rico()
    expect(alocar(s, 'tito', 'fornalha')).toBe(s) // não contratado
    const c = contratar(s, 'tito')
    expect(alocar(c, 'tito', 'mina')).toBe(c) // incompatível
    expect(alocar(c, 'tito', 'fornalha').ferreiros.tito.estacao).toBe('fornalha')
  })

  it('1 por estação: o novo desaloca o anterior', () => {
    let s = contratar(contratar(rico(), 'cida'), 'iara')
    s = alocar(s, 'cida', 'bigorna')
    s = alocar(s, 'iara', 'bigorna')
    expect(s.ferreiros.iara.estacao).toBe('bigorna')
    expect(s.ferreiros.cida.estacao).toBeNull()
  })

  it('Odair vai em qualquer estação', () => {
    const s = contratar(rico(), 'odair')
    for (const e of ['mina', 'carvoaria', 'fornalha', 'bigorna'] as const) {
      expect(alocar(s, 'odair', e).ferreiros.odair.estacao).toBe(e)
    }
  })
})

describe('passivas', () => {
  it('Tito +15 % na fornalha, Benê +25 % na carvoaria (refletem em taxas)', () => {
    let s = contratar(contratar(rico(), 'tito'), 'bene')
    const antes = taxas(s)
    s = alocar(alocar(s, 'tito', 'fornalha'), 'bene', 'carvoaria')
    const depois = taxas(s)
    expect(depois.fornalha).toBeCloseTo(antes.fornalha * 1.15, 9)
    expect(depois.carvao).toBeCloseTo(antes.carvao * 1.25, 9)
    expect(multiplicadorEstacao(s, 'mina')).toBe(1)
  })

  it('Odair +5 %, dobra no nível 10', () => {
    expect(bonusOdair(1)).toBe(0.05)
    expect(bonusOdair(9)).toBe(0.05)
    expect(bonusOdair(10)).toBe(0.1)
    let s = alocar(contratar(rico(), 'odair'), 'odair', 'mina')
    expect(multiplicadorEstacao(s, 'mina')).toBeCloseTo(1.05, 9)
    s = { ...s, ferreiros: { ...s.ferreiros, odair: { ...s.ferreiros.odair, nivel: 10 } } }
    expect(multiplicadorEstacao(s, 'mina')).toBeCloseTo(1.1, 9)
  })

  it('Cida e Iara só valem na bigorna', () => {
    const s = alocar(contratar(rico(), 'cida'), 'cida', 'bigorna')
    expect(passivasBigorna(s).bonusFixo).toBe(10)
    const sem = contratar(rico(), 'cida')
    expect(passivasBigorna(sem).bonusFixo).toBe(0)
    const iara = alocar(contratar(rico(), 'iara'), 'iara', 'bigorna')
    expect(passivasBigorna(iara).chanceDuplo).toBe(0.1)
  })
})

describe('XP', () => {
  it('próximo nível em 10 × 1,3^(n−1)', () => {
    expect(xpParaProximo(1)).toBe(10)
    expect(xpParaProximo(2)).toBeCloseTo(13, 9)
    expect(xpParaProximo(5)).toBeCloseTo(10 * 1.3 ** 4, 9)
  })

  it('sobe de nível, guarda o resto e pode subir vários de uma vez', () => {
    const s = alocar(contratar(rico(), 'cida'), 'cida', 'bigorna')
    const a = darXp(s, 'bigorna', 10)
    expect(a.ferreiros.cida.nivel).toBe(2)
    expect(a.ferreiros.cida.xp).toBeCloseTo(0, 9)
    const b = darXp(s, 'bigorna', 10 + 13 + 5)
    expect(b.ferreiros.cida.nivel).toBe(3)
    expect(b.ferreiros.cida.xp).toBeCloseTo(5, 9)
  })

  it('sem ferreiro no posto, nada acontece', () => {
    const s = rico()
    expect(darXp(s, 'bigorna', 50)).toBe(s)
  })

  it('fornalha e carvoaria dão XP pelo que produzem (com divisor)', () => {
    let s = contratar(contratar(rico(), 'tito'), 'bene')
    s = alocar(alocar(s, 'tito', 'fornalha'), 'bene', 'carvoaria')
    s = tick(s, 100)
    // ~0,29 lingote/s × 100 s / 10 ≈ 2,9 XP: ainda nível 1 (não upa rápido demais)
    expect(s.ferreiros.tito.nivel).toBe(1)
    expect(s.ferreiros.tito.xp).toBeGreaterThan(2)
    expect(s.ferreiros.bene.xp).toBeGreaterThan(1)
  })
})
