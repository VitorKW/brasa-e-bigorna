import { describe, expect, it } from 'vitest'
import { forjar, qualidadeDaTarefa, tempoForjaAtual } from './bigorna.ts'
import {
  bonusBrasas,
  bonusExpedicao,
  bonusQualidadeTalentos,
  maxHerois,
  multForno,
  multProducaoGlobal,
  multXpFerreiro,
  tetoOfflineSegundos,
} from './bonus.ts'
import { OFFLINE } from './constants.ts'
import { taxas } from './chain.ts'
import { darXp } from './ferreiros.ts'
import { proximaVaga, recrutar } from './herois.ts'
import { estadoInicial, type GameState } from './state.ts'
import {
  CUSTO_TIER,
  DEF_TALENTO,
  EFEITO,
  RAMOS,
  TALENTOS,
  brasasGastas,
  comprarTalento,
  custoTalento,
  motivoNaoComprarTalento,
  preRequisito,
  talentosDoRamo,
  type TalentoId,
} from './talentos.ts'

const com = (talentos: TalentoId[], mut: Partial<GameState> = {}): GameState => ({
  ...estadoInicial(0, 5),
  moedas: 1e6,
  talentos,
  ...mut,
})

describe('árvore de talentos', () => {
  it('3 ramos com 4 nós cada, 12 no total, custos 1, 2, 3 e 5 por tier', () => {
    expect(RAMOS).toHaveLength(3)
    expect(TALENTOS).toHaveLength(12)
    expect(CUSTO_TIER).toEqual([1, 2, 3, 5])
    for (const ramo of RAMOS) {
      const nos = talentosDoRamo(ramo)
      expect(nos).toHaveLength(4)
      expect(nos.map((t) => DEF_TALENTO[t].tier)).toEqual([1, 2, 3, 4])
      expect(nos.map(custoTalento)).toEqual([1, 2, 3, 5])
    }
    expect(brasasGastas([...TALENTOS])).toBe(33)
  })

  it('o pré-requisito é o tier anterior do mesmo ramo', () => {
    expect(preRequisito('fornalheiro_1')).toBeNull()
    expect(preRequisito('fornalheiro_3')).toBe('fornalheiro_2')
    expect(preRequisito('mestre_4')).toBe('mestre_3')
    expect(preRequisito('capitao_2')).toBe('capitao_1')
  })

  it('comprar gasta brasas; sem brasas ou sem pré-requisito devolve o MESMO estado', () => {
    const s = com([], { brasas: 10 })
    expect(motivoNaoComprarTalento(s, 'fornalheiro_2')).toBe('pre-requisito')
    expect(comprarTalento(s, 'fornalheiro_2')).toBe(s)
    const um = comprarTalento(s, 'fornalheiro_1')
    expect(um.talentos).toEqual(['fornalheiro_1'])
    expect(um.brasas).toBe(9)
    expect(comprarTalento(um, 'fornalheiro_1')).toBe(um) // já comprado
    const pobre = com(['fornalheiro_1'], { brasas: 1 })
    expect(motivoNaoComprarTalento(pobre, 'fornalheiro_2')).toBe('brasas')
    expect(comprarTalento(pobre, 'fornalheiro_2')).toBe(pobre)
  })

  it('gastar brasa em talento tira do bônus passivo de +2 % por brasa', () => {
    const s = com([], { brasas: 5 })
    expect(bonusBrasas(s)).toBeCloseTo(1.1, 9)
    expect(multProducaoGlobal(s)).toBeCloseTo(1.1, 9)
    const gasto = comprarTalento(s, 'fornalheiro_1')
    expect(bonusBrasas(gasto)).toBeCloseTo(1.08, 9)
  })
})

describe('efeitos dos 12 talentos', () => {
  const t = (id: TalentoId): GameState => com([id])

  it('fornalheiro_1 Foles novos: fornalha e Forno de aço +30 %', () => {
    const base = com([], { niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 0, forno: 1 } })
    const x = { ...base, talentos: ['fornalheiro_1'] as TalentoId[] }
    expect(taxas(x).fornalha).toBeCloseTo(taxas(base).fornalha * 1.3, 9)
    expect(taxas(x).forno).toBeCloseTo(taxas(base).forno * 1.3, 9)
    expect(multForno(x)).toBeCloseTo(1.3, 9)
  })

  it('fornalheiro_2 Sono tranquilo e capitao_4 Vigias da noite: +2 h e +4 h de teto offline', () => {
    expect(tetoOfflineSegundos(com([]))).toBe(2 * 3600)
    expect(tetoOfflineSegundos(t('fornalheiro_2'))).toBe(4 * 3600)
    expect(tetoOfflineSegundos(t('capitao_4'))).toBe(6 * 3600)
  })

  it('o teto offline nunca passa de 12 h, com tudo somado', () => {
    const tudo = com(['fornalheiro_2', 'capitao_4'], { construcoes: ['armazem'] })
    expect(tetoOfflineSegundos(tudo)).toBe(10 * 3600)
    expect(tetoOfflineSegundos(tudo)).toBeLessThanOrEqual(OFFLINE.tetoMaximoSegundos)
    expect(OFFLINE.tetoMaximoSegundos).toBe(12 * 3600)
  })

  it('fornalheiro_3 Veios generosos: mina e carvoaria +50 %', () => {
    const base = com([])
    const x = t('fornalheiro_3')
    expect(taxas(x).minerio).toBeCloseTo(taxas(base).minerio * 1.5, 9)
    expect(taxas(x).carvao).toBeCloseTo(taxas(base).carvao * 1.5, 9)
    expect(taxas(x).fornalha).toBeCloseTo(taxas(base).fornalha, 9)
  })

  it('fornalheiro_4 Fogo ancestral: toda a produção +30 %, bigorna inclusive', () => {
    const base = com([], { niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 1 } })
    const x = { ...base, talentos: ['fornalheiro_4'] as TalentoId[] }
    expect(taxas(x).minerio).toBeCloseTo(taxas(base).minerio * 1.3, 9)
    expect(taxas(x).fornalha).toBeCloseTo(taxas(base).fornalha * 1.3, 9)
    expect(taxas(x).forno).toBeCloseTo(taxas(base).forno * 1.3, 9)
    expect(tempoForjaAtual(x, 'espada')).toBeCloseTo(tempoForjaAtual(base, 'espada') / 1.3, 9)
  })

  it('mestre_1 Mão firme (+5 Q) e mestre_4 Obra-prima (+10 Q) somam na qualidade do item', () => {
    const prep = (s: GameState): GameState => ({
      ...s,
      niveis: { ...s.niveis, bigorna: 1 },
      recursos: { ...s.recursos, lingote: 20 },
    })
    const q = (s: GameState) => {
      const p = prep(s)
      return qualidadeDaTarefa(p, forjar(p, 'espada').forja!)
    }
    const q0 = q(com([]))
    expect(bonusQualidadeTalentos(t('mestre_1'))).toBe(5)
    expect(q(t('mestre_1'))).toBe(q0 + 5)
    const todos: TalentoId[] = ['mestre_1', 'mestre_2', 'mestre_3', 'mestre_4']
    expect(bonusQualidadeTalentos(com(todos))).toBe(15)
    expect(q(com(todos))).toBe(q0 + 15)
  })

  it('mestre_2 Bigorna de herança: piso de nível 5, na hora da compra', () => {
    const s = com(['mestre_1'], { brasas: 2 })
    expect(s.niveis.bigorna).toBe(0)
    const novo = comprarTalento(s, 'mestre_2')
    expect(novo.niveis.bigorna).toBe(5)
    // quem já tem nível maior não perde
    const alto = comprarTalento({ ...s, niveis: { ...s.niveis, bigorna: 12 } }, 'mestre_2')
    expect(alto.niveis.bigorna).toBe(12)
  })

  it('mestre_3 Escola de ofício: ferreiros ganham 50 % mais XP', () => {
    const base = (talentos: TalentoId[]): GameState => {
      const s = com(talentos)
      return {
        ...s,
        ferreiros: { ...s.ferreiros, odair: { contratado: true, nivel: 1, xp: 0, estacao: 'mina' } },
      }
    }
    expect(multXpFerreiro(t('mestre_3'))).toBe(1.5)
    expect(darXp(base([]), 'mina', 4).ferreiros.odair.xp).toBeCloseTo(4, 9)
    expect(darXp(base(['mestre_3']), 'mina', 4).ferreiros.odair.xp).toBeCloseTo(6, 9)
  })

  it('capitao_1 Bandeira (+20 % moedas e XP) e capitao_3 Rota segura (+10 pontos de chance)', () => {
    expect(bonusExpedicao(com([]))).toEqual({ chance: 0, loot: 1 })
    expect(bonusExpedicao(t('capitao_1'))).toEqual({ chance: 0, loot: 1.2 })
    expect(bonusExpedicao(t('capitao_3')).chance).toBe(EFEITO.rotaSegura)
  })

  it('capitao_2 Quinto herói: uma 5ª vaga de herói, sem custo', () => {
    let s = com([], { reputacao: 5000, chefesDerrotados: ['golem'], construcoes: ['taverna'] })
    for (let i = 0; i < 4; i++) s = recrutar(s, 'guerreiro')
    expect(s.herois).toHaveLength(4)
    expect(maxHerois(s)).toBe(4)
    expect(proximaVaga(s)).toBeNull()
    s = { ...s, talentos: ['capitao_1', 'capitao_2'] }
    expect(maxHerois(s)).toBe(5)
    expect(proximaVaga(s)?.condicao.tipo).toBe('talento')
    s = recrutar(s, 'batedor')
    expect(s.herois).toHaveLength(5)
    expect(proximaVaga(s)).toBeNull()
  })
})
