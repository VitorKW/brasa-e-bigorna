import { describe, expect, it } from 'vitest'
import { formatar, formatarCusto, formatarDuracao, formatarTaxa } from './format.ts'

describe('formatar', () => {
  it('abaixo de mil, inteiro', () => {
    expect(formatar(0)).toBe('0')
    expect(formatar(999)).toBe('999')
    expect(formatar(999.9)).toBe('999')
  })
  it('sufixos pt-BR com vírgula decimal', () => {
    expect(formatar(1000)).toBe('1 K')
    expect(formatar(1234)).toBe('1,2 K')
    expect(formatar(3_400_000)).toBe('3,4 M')
    expect(formatar(5_600_000_000)).toBe('5,6 B')
    expect(formatar(7_800_000_000_000)).toBe('7,8 T')
  })
  it('trunca em vez de arredondar para cima na virada', () => {
    expect(formatar(999_999)).toBe('999,9 K')
  })
  it('valores estranhos', () => {
    expect(formatar(NaN)).toBe('0')
    expect(formatar(-1234)).toBe('-1,2 K')
    expect(formatar(Infinity)).toBe('∞')
  })
})

describe('formatarTaxa e formatarDuracao', () => {
  it('taxas pequenas mostram decimal', () => {
    expect(formatarTaxa(0.25)).toBe('0,25')
    expect(formatarTaxa(0.2875)).toBe('0,28')
    expect(formatarTaxa(0.5)).toBe('0,5')
    expect(formatarTaxa(20)).toBe('20')
    expect(formatarTaxa(12.34)).toBe('12,3')
    expect(formatarTaxa(1.175)).toBe('1,17')
    expect(formatarTaxa(1234)).toBe('1,2 K')
    expect(formatarTaxa(0)).toBe('0')
  })
  it('custos arredondam para cima', () => {
    expect(formatarCusto(11.5)).toBe('12')
    expect(formatarCusto(10)).toBe('10')
    expect(formatarCusto(1201)).toBe('1,3 K')
    expect(formatarCusto(2000)).toBe('2 K')
  })
  it('durações', () => {
    expect(formatarDuracao(45)).toBe('45 s')
    expect(formatarDuracao(720)).toBe('12 min')
    expect(formatarDuracao(4800)).toBe('1 h 20 min')
    expect(formatarDuracao(7200)).toBe('2 h')
  })
})
