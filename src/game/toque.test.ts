import { describe, expect, it } from 'vitest'
import { forjar } from './bigorna.ts'
import { taxas } from './chain.ts'
import { estadoInicial, type GameState } from './state.ts'
import { TOQUE, tocar } from './toque.ts'

const base = (): GameState => estadoInicial(0, 1)

describe('toque na cena', () => {
  it('mina: no começo rende o piso (1 minério), mais tarde 1/4 s de produção', () => {
    const s = base()
    const r = tocar(s, 'mina')
    expect(r.ganho).toBe(TOQUE.pisoMina)
    expect(r.estado.recursos.minerio).toBe(s.recursos.minerio + 1)
    const forte = { ...s, niveis: { ...s.niveis, mina: 80 } }
    const r2 = tocar(forte, 'mina')
    expect(r2.ganho).toBeCloseTo(taxas(forte).minerio * TOQUE.segundos)
  })

  it('carvoaria rende carvão e não mexe no resto', () => {
    const s = base()
    const r = tocar(s, 'carvoaria')
    expect(r.ganho).toBeGreaterThan(0)
    expect(r.estado.recursos.carvao).toBeCloseTo(s.recursos.carvao + r.ganho)
    expect(r.estado.recursos.minerio).toBe(s.recursos.minerio)
  })

  it('fornalha funde com o estoque (2 minérios e 1 carvão por lingote); sem insumo, não faz nada', () => {
    const vazio = { ...base(), recursos: { minerio: 0, carvao: 0, lingote: 0, aco: 0 } }
    expect(tocar(vazio, 'fornalha').ganho).toBe(0)
    const cheio = { ...base(), recursos: { minerio: 10, carvao: 10, lingote: 0, aco: 0 } }
    const r = tocar(cheio, 'fornalha')
    expect(r.ganho).toBeGreaterThan(0)
    expect(r.estado.recursos.lingote).toBeCloseTo(r.ganho)
    expect(r.estado.recursos.minerio).toBeCloseTo(10 - 2 * r.ganho)
    expect(r.estado.recursos.carvao).toBeCloseTo(10 - r.ganho)
    expect(r.estado.stats.lingotesFundidos).toBeCloseTo(r.ganho)
  })

  it('bigorna adianta a peça em andamento, mas nunca a termina sozinha', () => {
    const parada = { ...base(), niveis: { ...base().niveis, bigorna: 1 } }
    expect(tocar(parada, 'bigorna').ganho).toBe(0)
    const s = forjar({ ...parada, recursos: { ...parada.recursos, lingote: 20 } }, 'espada')
    const antes = s.forja!.progresso
    const r = tocar(s, 'bigorna')
    expect(r.estado.forja!.progresso).toBeCloseTo(antes + TOQUE.avancoBigorna)
    let x = r.estado
    for (let i = 0; i < 50; i++) x = tocar(x, 'bigorna').estado
    expect(x.forja!.progresso).toBeLessThan(1)
  })

  it('não altera o estado recebido', () => {
    const s = base()
    const copia = structuredClone(s)
    tocar(s, 'mina')
    tocar(s, 'fornalha')
    expect(s).toEqual(copia)
  })
})
