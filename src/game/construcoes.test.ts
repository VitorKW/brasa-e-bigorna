import { describe, expect, it } from 'vitest'
import { multFornalha, multVenda, tetoOfflineSegundos } from './bonus.ts'
import {
  ARMAZEM_HORAS,
  CONSTRUCOES,
  DEF_CONSTRUCAO,
  FATOR_SEGUNDA_FORNALHA,
  construcaoLiberada,
  construir,
  motivoNaoConstruir,
  temConstrucao,
} from './construcoes.ts'
import { OFFLINE } from './constants.ts'
import { vender } from './economy.ts'
import { proximaVaga, recrutar } from './herois.ts'
import { venderItem } from './inventario.ts'
import { taxas } from './chain.ts'
import { applyOffline } from './offline.ts'
import { estadoInicial, type GameState } from './state.ts'

const rico = (mut: Partial<GameState> = {}): GameState => ({
  ...estadoInicial(0, 5),
  moedas: 1e9,
  reputacao: 5000,
  chefesDerrotados: ['golem', 'serpe'],
  ...mut,
})

describe('construções do vilarejo', () => {
  it('limiares de reputação do GDD §5: 50, 150, 400, 650 e 1 000', () => {
    expect(CONSTRUCOES.map((c) => DEF_CONSTRUCAO[c].reputacao)).toEqual([50, 150, 400, 650, 1000])
  })

  it('reputação é limiar: não é gasta ao construir; as moedas são', () => {
    const s = rico({ moedas: 1e9, reputacao: 60 })
    const novo = construir(s, 'segunda_fornalha')
    expect(temConstrucao(novo, 'segunda_fornalha')).toBe(true)
    expect(novo.reputacao).toBe(60)
    expect(novo.moedas).toBe(1e9 - DEF_CONSTRUCAO.segunda_fornalha.custo)
  })

  it('sem reputação, sem moedas ou já construída: devolve o MESMO estado', () => {
    const pobre = rico({ reputacao: 49 })
    expect(construir(pobre, 'segunda_fornalha')).toBe(pobre)
    expect(motivoNaoConstruir(pobre, 'segunda_fornalha')).toBe('reputacao')
    const semMoedas = rico({ moedas: 100 })
    expect(construir(semMoedas, 'armazem')).toBe(semMoedas)
    expect(motivoNaoConstruir(semMoedas, 'armazem')).toBe('moedas')
    expect(construcaoLiberada(semMoedas, 'armazem')).toBe(true) // só falta pagar
    const feita = construir(rico(), 'armazem')
    expect(construir(feita, 'armazem')).toBe(feita)
    expect(motivoNaoConstruir(feita, 'armazem')).toBe('construida')
  })

  it('a Muralha exige a Serpe derrotada além de 1 000 de reputação', () => {
    const semSerpe = rico({ chefesDerrotados: ['golem'] })
    expect(motivoNaoConstruir(semSerpe, 'muralha')).toBe('chefe')
    expect(construir(semSerpe, 'muralha')).toBe(semSerpe)
    expect(motivoNaoConstruir(rico({ reputacao: 999 }), 'muralha')).toBe('reputacao')
    expect(motivoNaoConstruir(rico(), 'muralha')).toBeNull()
    expect(temConstrucao(construir(rico(), 'muralha'), 'muralha')).toBe(true)
  })

  it('Segunda fornalha soma 50 % à velocidade da fornalha (e só dela)', () => {
    const antes = rico()
    const depois = construir(antes, 'segunda_fornalha')
    expect(multFornalha(depois)).toBe(FATOR_SEGUNDA_FORNALHA)
    expect(FATOR_SEGUNDA_FORNALHA).toBe(1.5)
    expect(taxas(depois).fornalha).toBeCloseTo(taxas(antes).fornalha * 1.5, 9)
    expect(taxas(depois).minerio).toBe(taxas(antes).minerio)
  })

  it('Armazém soma 2 h ao teto offline e o offline respeita o novo teto', () => {
    const s = construir(rico(), 'armazem')
    expect(tetoOfflineSegundos(s)).toBe(OFFLINE.tetoSegundos + ARMAZEM_HORAS * 3600)
    const { resumo } = applyOffline({ ...s, lastTick: 0 }, 10 * 3600 * 1000)
    expect(resumo.segundosSimulados).toBe(4 * 3600)
    expect(resumo.limitadoPeloTeto).toBe(true)
    // sem o Armazém continua 2 h
    expect(applyOffline({ ...rico(), lastTick: 0 }, 10 * 3600 * 1000).resumo.segundosSimulados).toBe(2 * 3600)
  })

  it('Taverna abre a 4ª vaga de herói', () => {
    let s = rico()
    for (let i = 0; i < 3; i++) s = recrutar(s, 'guerreiro')
    expect(s.herois).toHaveLength(3)
    expect(proximaVaga(s)?.condicao.tipo).toBe('taverna')
    expect(proximaVaga(s)?.liberada).toBe(false)
    expect(recrutar(s, 'batedor').herois).toHaveLength(3)
    s = construir(s, 'taverna')
    expect(proximaVaga(s)?.liberada).toBe(true)
    expect(recrutar(s, 'batedor').herois).toHaveLength(4)
  })

  it('Mercado dá +15 % na venda de recursos e de itens', () => {
    const s = rico({ recursos: { minerio: 100, carvao: 0, lingote: 0, aco: 0 } })
    const com = construir(s, 'mercado')
    expect(multVenda(s)).toBe(1)
    expect(multVenda(com)).toBeCloseTo(1.15, 9)
    expect(vender(s, 'minerio').ganho).toBeCloseTo(20, 9)
    expect(vender(com, 'minerio').ganho).toBeCloseTo(23, 9)
    const item = { id: 1, tipo: 'espada', material: 'ferro', qualidade: 'comum', ferreiro: 'Você', valor: 100, pontuacao: 1 } as const
    expect(venderItem({ ...s, itens: [item] }, 1).ganho).toBe(100)
    expect(venderItem({ ...com, itens: [item] }, 1).ganho).toBeCloseTo(115, 9)
    // moedasGanhas (base do prestígio) conta o que o Mercado rendeu
    expect(vender(com, 'minerio').estado.moedasGanhas).toBeCloseTo(23, 9)
  })
})
