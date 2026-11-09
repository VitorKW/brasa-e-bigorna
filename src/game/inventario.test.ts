import { describe, expect, it } from 'vitest'
import { contarPorQualidade, venderItem, venderPorQualidade } from './inventario.ts'
import type { Item, Qualidade } from './items.ts'
import { estadoInicial } from './state.ts'

const item = (id: number, qualidade: Qualidade, valor: number): Item => ({
  id,
  tipo: 'espada',
  material: 'ferro',
  qualidade,
  ferreiro: 'Você',
  valor,
  pontuacao: 0,
})

const base = () => ({
  ...estadoInicial(0),
  moedas: 0,
  itens: [item(1, 'comum', 25), item(2, 'raro', 62.5), item(3, 'comum', 25), item(4, 'epico', 100)],
})

describe('inventário', () => {
  it('vende um item e soma moedas e moedasGanhas', () => {
    const { estado, ganho } = venderItem(base(), 2)
    expect(ganho).toBe(62.5)
    expect(estado.moedas).toBe(62.5)
    expect(estado.moedasGanhas).toBe(62.5)
    expect(estado.itens.map((i) => i.id)).toEqual([1, 3, 4])
  })

  it('id inexistente não faz nada', () => {
    const s = base()
    expect(venderItem(s, 99).estado).toBe(s)
  })

  it('venda em massa por qualidade só leva aquela qualidade', () => {
    const { estado, ganho } = venderPorQualidade(base(), 'comum')
    expect(ganho).toBe(50)
    expect(estado.itens.map((i) => i.qualidade)).toEqual(['raro', 'epico'])
  })

  it("'todas' esvazia o inventário", () => {
    const { estado, ganho } = venderPorQualidade(base(), 'todas')
    expect(ganho).toBe(212.5)
    expect(estado.itens).toHaveLength(0)
  })

  it('conta por qualidade', () => {
    expect(contarPorQualidade(base().itens)).toEqual({ comum: 2, incomum: 0, raro: 1, epico: 1, lendario: 0 })
  })
})
