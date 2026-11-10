import { describe, expect, it } from 'vitest'
import { auraHeroi, camadasEstacao, camadasHeroi, estagio, nomeEstagio, proximoEstagio } from './visual.ts'
import type { Heroi } from './herois.ts'

type Equip = Heroi['equipamento']
const item = (tipo: string, material: 'ferro' | 'aco', qualidade = 'comum') =>
  ({ id: 1, tipo, material, qualidade, pontos: 10 }) as unknown as NonNullable<Equip['arma']>
const vazio = (): Equip => ({ arma: null, escudo: null, armadura: null, elmo: null })

describe('estágios das estações', () => {
  it('mudam nos mesmos marcos que dobram a produção', () => {
    expect([1, 9, 10, 24, 25, 49, 50, 99, 100, 300].map(estagio)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4])
  })

  it('as camadas são cumulativas e o nome acompanha', () => {
    expect(camadasEstacao('mina', 5)).toEqual([])
    expect(camadasEstacao('mina', 30)).toEqual(['mina_e1', 'mina_e2'])
    expect(camadasEstacao('bigorna', 100)).toEqual(['bigorna_e1', 'bigorna_e2', 'bigorna_e3', 'bigorna_e4'])
    expect(nomeEstagio('mina', 1)).toBe('Mina')
    expect(nomeEstagio('fornalha', 100)).toBe('Alto-forno')
  })

  it('próximo estágio: o próximo marco, ou nada no fim', () => {
    expect(proximoEstagio(3)).toBe(10)
    expect(proximoEstagio(25)).toBe(50)
    expect(proximoEstagio(100)).toBeNull()
  })
})

describe('equipamento visível', () => {
  it('sem nada, sem camadas nem aura', () => {
    expect(camadasHeroi({ equipamento: vazio() })).toEqual([])
    expect(auraHeroi({ equipamento: vazio() })).toBeNull()
  })

  it('ordem de trás para a frente, material e tipo de arma', () => {
    const e = { arma: item('machado', 'aco'), escudo: item('escudo', 'ferro'), armadura: item('armadura', 'aco'), elmo: item('elmo', 'ferro') }
    expect(camadasHeroi({ equipamento: e })).toEqual(['equip_armadura_aco', 'equip_elmo_ferro', 'equip_escudo_ferro', 'equip_machado_aco'])
    expect(camadasHeroi({ equipamento: { ...vazio(), arma: item('espada', 'ferro') } })).toEqual(['equip_espada_ferro'])
  })

  it('aura: a melhor qualidade vestida, a partir de rara', () => {
    expect(auraHeroi({ equipamento: { ...vazio(), arma: item('espada', 'ferro', 'incomum') } })).toBeNull()
    expect(auraHeroi({ equipamento: { ...vazio(), arma: item('espada', 'ferro', 'raro'), elmo: item('elmo', 'aco', 'lendario') } })).toBe('lendario')
  })
})
