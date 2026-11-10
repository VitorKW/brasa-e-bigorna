import { describe, expect, it } from 'vitest'
import { MOEDAS_INICIAIS } from './constants.ts'
import { partir } from './expedicoes.ts'
import { contratar, alocar } from './ferreiros.ts'
import { equipar, recrutar } from './herois.ts'
import type { Item } from './items.ts'
import {
  FICA,
  PERDE,
  brasasDoCiclo,
  moedasDoCicloComPendentes,
  motivoNaoReforjar,
  previaReforjar,
  reforjar,
} from './reforjar.ts'
import { estadoInicial, type GameState } from './state.ts'
import { comprarTalento } from './talentos.ts'

const espada: Item = { id: 1, tipo: 'espada', material: 'aco', qualidade: 'epico', ferreiro: 'Você', valor: 400, pontuacao: 75 }

/** Meio de jogo avançado: Muralha construída, 64 milhões no ciclo, heróis equipados. */
function cidade(mut: Partial<GameState> = {}): GameState {
  let s: GameState = {
    ...estadoInicial(0, 11),
    moedas: 5e6,
    moedasGanhas: 64e6,
    reputacao: 1200,
    fragmentos: 14,
    chefesDerrotados: ['golem', 'serpe'],
    construcoes: ['segunda_fornalha', 'armazem', 'taverna', 'mercado', 'muralha'],
    niveis: { mina: 60, carvoaria: 55, fornalha: 40, bigorna: 30, forno: 25 },
    recursos: { minerio: 100, carvao: 100, lingote: 50, aco: 20 },
    itens: [espada, { ...espada, id: 2 }],
    proximoIdItem: 3,
    ...mut,
  }
  s = recrutar(recrutar(s, 'guerreiro'), 'guardia')
  s = equipar(s, 1, 1)
  s = contratar(s, 'odair')
  s = alocar(s, 'odair', 'bigorna')
  s = { ...s, ferreiros: { ...s.ferreiros, odair: { ...s.ferreiros.odair, nivel: 12, xp: 30 } } }
  s = { ...s, herois: s.herois.map((h) => ({ ...h, nivel: 9, xp: 40 })) }
  return s
}

describe('brasas', () => {
  it('floor(sqrt(moedas do ciclo / 1 000 000))', () => {
    expect(brasasDoCiclo(0)).toBe(0)
    expect(brasasDoCiclo(999_999)).toBe(0)
    expect(brasasDoCiclo(1_000_000)).toBe(1)
    expect(brasasDoCiclo(3_999_999)).toBe(1)
    expect(brasasDoCiclo(4_000_000)).toBe(2)
    expect(brasasDoCiclo(25e6)).toBe(5)
    expect(brasasDoCiclo(225e6)).toBe(15)
    expect(brasasDoCiclo(NaN)).toBe(0)
    expect(brasasDoCiclo(-5)).toBe(0)
  })
})

describe('quando dá para Reforjar', () => {
  it('só com a Muralha construída', () => {
    const s = cidade({ construcoes: ['armazem'] })
    expect(motivoNaoReforjar(s, 0)).toBe('muralha')
    expect(reforjar(s, 0)).toBe(s)
  })

  it('sem nenhuma brasa para ganhar, não vale a pena (e não faz nada)', () => {
    const s = cidade({ moedasGanhas: 900_000 })
    expect(motivoNaoReforjar(s, 0)).toBe('sem-brasas')
    expect(reforjar(s, 0)).toBe(s)
  })

  it('expedição na estrada bloqueia; quem já voltou não', () => {
    const na = partir(cidade(), 1, 'trilha', 0)
    const fim = na.expedicoes[0]!.fim
    expect(motivoNaoReforjar(na, fim - 1)).toBe('expedicao')
    expect(reforjar(na, fim - 1)).toBe(na)
    expect(motivoNaoReforjar(na, fim)).toBeNull()
    expect(previaReforjar(na, fim - 1).expedicoesEmAndamento).toBe(1)
    expect(previaReforjar(na, fim).expedicoesParaColetar).toBe(1)
  })
})

describe('o que o Reforjar zera', () => {
  const novo = reforjar(cidade(), 0)

  it('dá as brasas do ciclo e conta a Reforja', () => {
    expect(novo.brasas).toBe(8)
    expect(novo.reforjas).toBe(1)
  })

  it('zera estações, moedas, recursos, itens, forja e a base do próximo prestígio', () => {
    expect(novo.niveis).toEqual({ mina: 1, carvoaria: 1, fornalha: 1, bigorna: 0, forno: 0 })
    expect(novo.moedas).toBe(MOEDAS_INICIAIS)
    expect(novo.moedasGanhas).toBe(0)
    expect(novo.recursos).toEqual({ minerio: 0, carvao: 0, lingote: 0, aco: 0 })
    expect(novo.itens).toEqual([])
    expect(novo.forja).toBeNull()
    expect(novo.fila).toEqual([])
    expect(novo.automatico).toBe(false)
    expect(novo.ultimaReceita).toBeNull()
  })

  it('heróis voltam ao nível 1 e perdem o equipamento (o item não volta ao inventário)', () => {
    expect(novo.herois).toHaveLength(2)
    for (const h of novo.herois) {
      expect(h.nivel).toBe(1)
      expect(h.xp).toBe(0)
      expect(Object.values(h.equipamento).every((i) => i === null)).toBe(true)
    }
    expect(novo.itens).toEqual([])
  })

  it('ferreiros continuam contratados e no posto, mas voltam ao nível 1', () => {
    expect(novo.ferreiros.odair).toEqual({ contratado: true, nivel: 1, xp: 0, estacao: 'bigorna' })
  })

  it('expedições que já voltaram são coletadas (reputação e fragmentos ficam)', () => {
    const base = cidade()
    const na = partir(base, 1, 'trilha', 0)
    const e = na.expedicoes[0]!
    const depois = reforjar(na, e.fim)
    expect(depois.expedicoes).toEqual([])
    expect(depois.reputacao).toBeCloseTo(base.reputacao + e.reputacao, 9)
    expect(depois.fragmentos).toBe(base.fragmentos + e.fragmentos)
    // as moedas do loot entram na conta das brasas, mas não sobram no caixa
    expect(depois.moedas).toBe(MOEDAS_INICIAIS)
  })
})

describe('o que o Reforjar mantém', () => {
  const antes = cidade()
  const novo = reforjar(antes, 0)

  it('reputação, construções, chefes derrotados e fragmentos', () => {
    expect(novo.reputacao).toBe(antes.reputacao)
    expect(novo.construcoes).toEqual(antes.construcoes)
    expect(novo.chefesDerrotados).toEqual(['golem', 'serpe'])
    expect(novo.fragmentos).toBe(14)
  })

  it('heróis e as vagas do grupo (ids, nomes e classes)', () => {
    expect(novo.herois.map((h) => [h.id, h.nome, h.classe])).toEqual(antes.herois.map((h) => [h.id, h.nome, h.classe]))
    expect(novo.proximoIdHeroi).toBe(antes.proximoIdHeroi)
  })

  it('talentos e brasas não gastas; o RNG e a numeração continuam', () => {
    const com = comprarTalento({ ...cidade(), brasas: 4 }, 'fornalheiro_1')
    const r = reforjar(com, 0)
    expect(r.talentos).toEqual(['fornalheiro_1'])
    expect(r.brasas).toBe(3 + 8)
    expect(r.rng).toBe(com.rng)
    expect(r.proximoIdItem).toBe(com.proximoIdItem)
  })

  it('a Bigorna de herança vale de novo no ciclo seguinte', () => {
    const s = comprarTalento(comprarTalento({ ...cidade(), brasas: 3 }, 'mestre_1'), 'mestre_2')
    expect(reforjar(s, 0).niveis.bigorna).toBe(5)
  })

  it('o estado novo é válido para salvar e Reforjar de novo rende brasas só do novo ciclo', () => {
    const outra = reforjar({ ...novo, moedasGanhas: 4e6 }, 0)
    expect(outra.brasas).toBe(novo.brasas + 2)
    expect(outra.reforjas).toBe(2)
  })
})

describe('prévia', () => {
  it('mostra brasas, bônus antes/depois e o que perde e o que fica', () => {
    const s = cidade({ brasas: 2 })
    const p = previaReforjar(s, 0)
    expect(p.brasasGanhas).toBe(8)
    expect(p.brasasAntes).toBe(2)
    expect(p.brasasDepois).toBe(10)
    expect(p.bonusAntes).toBe(4)
    expect(p.bonusDepois).toBe(20)
    expect(p.moedasDoCiclo).toBe(64e6)
    expect(p.motivo).toBeNull()
    expect(p.perde).toBe(PERDE)
    expect(p.fica).toBe(FICA)
    expect(PERDE.length).toBeGreaterThan(2)
    expect(FICA.length).toBeGreaterThan(2)
  })

  it('moedas do ciclo contam o loot que já voltou e ainda não foi coletado', () => {
    const na = partir(cidade({ moedasGanhas: 0 }), 1, 'trilha', 0)
    const e = na.expedicoes[0]!
    expect(moedasDoCicloComPendentes(na, e.fim - 1)).toBe(0)
    expect(moedasDoCicloComPendentes(na, e.fim)).toBe(e.moedas)
  })
})
