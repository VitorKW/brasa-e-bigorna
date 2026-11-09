import { describe, expect, it } from 'vitest'
import { simular } from './sim.ts'

// Metas do GDD §4.4 que se aplicam à fatia 1.
describe('ritmo da fatia 1 (simulação gulosa de 2 h)', () => {
  const r = simular(2)

  it('primeira compra em menos de 15 s', () => {
    expect(r.primeiraCompra).not.toBeNull()
    expect(r.primeiraCompra!).toBeLessThan(15)
  })

  it('nunca mais de 10 min sem comprar nas primeiras 2 h', () => {
    expect(r.maiorIntervaloEntreCompras.duracao).toBeLessThanOrEqual(10 * 60)
  })

  it('nenhum valor passa de 1e15 (limite do number)', () => {
    expect(r.maiorValor).toBeLessThan(1e15)
  })

  it('as três estações chegam ao nível 10 dentro de 2 h', () => {
    for (const t of Object.values(r.nivel10)) expect(t).not.toBeNull()
  })
})
