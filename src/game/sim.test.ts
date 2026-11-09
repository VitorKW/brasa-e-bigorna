import { describe, expect, it } from 'vitest'
import { simular } from './sim.ts'

// Metas do GDD §4.4 que se aplicam às fatias 1 e 2. A sim roda uma vez (leva alguns segundos).
describe('ritmo (simulação gulosa de 2 h)', () => {
  const r = simular(2)

  it('primeira compra em menos de 15 s', () => {
    expect(r.primeiraCompra).not.toBeNull()
    expect(r.primeiraCompra!).toBeLessThan(15)
  })

  it('nunca mais de 10 min sem comprar nas primeiras 2 h', () => {
    expect(r.maiorIntervaloEntreCompras.duracao).toBeLessThanOrEqual(10 * 60)
  })

  it('nunca mais de 10 min sem nada comprável (upgrade ou ferreiro) nas primeiras 2 h', () => {
    expect(r.maiorIntervaloSemComprar.duracao).toBeLessThanOrEqual(10 * 60)
  })

  it('nenhum valor passa de 1e15 (limite do number)', () => {
    expect(r.maiorValor).toBeLessThan(1e15)
  })

  it('as três estações chegam ao nível 10 dentro de 2 h', () => {
    for (const t of Object.values(r.nivel10)) expect(t).not.toBeNull()
  })

  it('bigorna desbloqueada entre 3 e 8 min (meta: ~5 min)', () => {
    expect(r.bigornaDesbloqueada).not.toBeNull()
    expect(r.bigornaDesbloqueada!).toBeGreaterThanOrEqual(3 * 60)
    expect(r.bigornaDesbloqueada!).toBeLessThanOrEqual(8 * 60)
  })

  it('contrata ferreiro e forja itens de qualidade crescente', () => {
    expect(r.primeiroFerreiro).not.toBeNull()
    expect(r.itensForjados).toBeGreaterThan(100)
    expect(r.primeiraQualidade.incomum).not.toBeNull()
    expect(r.primeiraQualidade.raro).not.toBeNull()
    expect(r.primeiraQualidade.epico).not.toBeNull()
  })

  it('é determinística (mesma semente, mesmo resultado)', () => {
    const a = simular(0.25)
    const b = simular(0.25)
    expect(b.itensPorQualidade).toEqual(a.itensPorQualidade)
    expect(b.compras).toEqual(a.compras)
  })
})
