import { describe, expect, it } from 'vitest'
import { avancarBigorna, forjar, motivoParaNaoIniciar, valorEsperadoItem } from './bigorna.ts'
import { taxas } from './chain.ts'
import { FORNO, PRECO_VENDA, custoUpgrade, velocidadeForno } from './constants.ts'
import { comprarUpgrade, estacaoLiberada, podeComprar } from './economy.ts'
import { alocar, contratar, multiplicadorEstacao } from './ferreiros.ts'
import { applyOffline } from './offline.ts'
import { valorItem } from './items.ts'
import { estadoInicial, type GameState } from './state.ts'
import { tick } from './tick.ts'

/** Forno de aço no nível 1, com ferro e carvão de sobra e a produção normal desligada pelo estoque. */
const comForno = (mut: Partial<GameState> = {}): GameState => ({
  ...estadoInicial(0, 11),
  moedas: 1e6,
  niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 1 },
  recursos: { minerio: 0, carvao: 100, lingote: 100, aco: 0 },
  chefesDerrotados: ['golem'],
  ...mut,
})

describe('Forno de aço', () => {
  it('1 lingote de ferro + 2 carvão -> 1 lingote de aço em 6 s (nível 1)', () => {
    expect(velocidadeForno(1)).toBeCloseTo(1 / 6, 9)
    const ini = comForno({ recursos: { minerio: 0, carvao: 10, lingote: 10, aco: 0 } })
    const s = tick(ini, 6)
    // mina (6 minérios) e carvoaria (3 carvões) trabalham junto; a fornalha funde 1,5 lingote
    expect(s.recursos.aco).toBeCloseTo(1, 6)
    expect(s.recursos.lingote).toBeCloseTo(10 + 1.5 - 1, 6)
    expect(s.recursos.carvao).toBeCloseTo(10 + 3 - 1.5 - 2, 6)
  })

  it('sem o forno (nível 0) não produz aço', () => {
    const s = tick(comForno({ niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 0 } }), 60)
    expect(s.recursos.aco).toBe(0)
    expect(taxas(comForno({ niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 0 } })).aco).toBe(0)
  })

  it('gargalo: o aço é limitado pelo carvão que sobra da fornalha e pelos lingotes de ferro', () => {
    // nível 1: carvoaria 0,5/s, fornalha gasta 0,25/s -> sobram 0,25/s -> 0,125 aço/s (< 0,1667 do forno)
    expect(taxas(comForno()).aco).toBeCloseTo(0.125, 9)
    // carvoaria forte: o limite passa a ser o forno
    const forte = comForno({ niveis: { mina: 10, carvoaria: 10, fornalha: 10, bigorna: 1, forno: 1 } })
    expect(taxas(forte).aco).toBeCloseTo(1 / 6, 9)
    // sem estoque nenhum e sem produção de ferro, nada de aço
    const vazio = comForno({ recursos: { minerio: 0, carvao: 0, lingote: 0, aco: 0 } })
    expect(tick({ ...vazio, niveis: { ...vazio.niveis, mina: 1 } }, 0.001).recursos.aco).toBeLessThan(1e-3)
  })

  it('para quando o estoque de aço enche (não come lingotes à toa)', () => {
    const s = tick(
      comForno({ recursos: { minerio: 0, carvao: 1000, lingote: 1000, aco: FORNO.estoqueMaximo - 0.5 } }),
      60,
    )
    expect(s.recursos.aco).toBeCloseTo(FORNO.estoqueMaximo, 9)
    expect(s.recursos.lingote).toBeGreaterThan(900)
  })

  it('só abre depois do Golem e o custo segue o padrão das outras estações', () => {
    const fechado = estadoInicial(0)
    expect(estacaoLiberada(fechado, 'forno')).toBe(false)
    expect(podeComprar({ ...fechado, moedas: 1e9 }, 'forno')).toBe(false)
    const tentativa = { ...fechado, moedas: 1e9 }
    expect(comprarUpgrade(tentativa, 'forno')).toBe(tentativa)
    const aberto = { ...fechado, moedas: 1e9, chefesDerrotados: ['golem' as const] }
    const comprado = comprarUpgrade(aberto, 'forno')
    expect(comprado.niveis.forno).toBe(1)
    expect(comprado.moedas).toBe(1e9 - FORNO.custoDesbloqueio)
    expect(custoUpgrade('forno', 1)).toBeCloseTo(400 * 1.2, 6)
  })

  it('Mestre Odair aceita o forno (+5 % de velocidade); os outros ferreiros não', () => {
    let s = contratar(comForno(), 'odair')
    s = alocar(s, 'odair', 'forno')
    expect(multiplicadorEstacao(s, 'forno')).toBeCloseTo(1.05, 9)
    expect(taxas(s).forno).toBeCloseTo((1 / 6) * 1.05, 9)
    let outro = contratar(contratar(comForno(), 'odair'), 'tito')
    outro = alocar(outro, 'tito', 'forno')
    expect(outro.ferreiros.tito.estacao).toBeNull()
  })

  it('produz também offline', () => {
    const s = comForno({ recursos: { minerio: 0, carvao: 0, lingote: 0, aco: 0 }, niveis: { mina: 10, carvoaria: 10, fornalha: 10, bigorna: 0, forno: 5 } })
    const { estado, resumo } = applyOffline(s, 10 * 60 * 1000)
    expect(resumo.produzido.aco).toBeGreaterThan(50)
    expect(estado.recursos.aco).toBeGreaterThan(0)
    expect(estado.recursos.aco).toBeCloseTo(resumo.produzido.aco, 6)
  })
})

describe('bigorna com aço', () => {
  it('forja gasta lingotes de aço, não de ferro, e o item sai de aço', () => {
    const s = forjar(comForno({ recursos: { minerio: 0, carvao: 0, lingote: 10, aco: 10 } }), 'espada', false, 'aco')
    expect(s.recursos.aco).toBe(7)
    expect(s.recursos.lingote).toBe(10)
    expect(s.forja!.material).toBe('aco')
    const pronto = avancarBigorna(s, 100)
    const item = pronto.estado.itens[0]!
    expect(item.material).toBe('aco')
    expect(item.valor).toBe(valorItem('espada', 'aco', item.qualidade))
  })

  it('aço soma +10 na qualidade e multiplica o valor por 4', () => {
    const s = comForno()
    expect(valorEsperadoItem(s, 'espada', 'aco')).toBeGreaterThan(valorEsperadoItem(s, 'espada', 'ferro') * 4 - 1e-6)
    expect(valorItem('escudo', 'aco', 'raro')).toBe(valorItem('escudo', 'ferro', 'raro') * 4)
    expect(PRECO_VENDA.aco).toBe(8)
  })

  it('sem lingote de aço ou sem forno, não inicia a receita de aço', () => {
    expect(motivoParaNaoIniciar(comForno({ recursos: { minerio: 0, carvao: 0, lingote: 50, aco: 2 } }), 'espada', 'aco')).toBe('sem-lingote')
    const semForno = comForno({ niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 0 } })
    expect(motivoParaNaoIniciar(semForno, 'espada', 'aco')).toBe('sem-forno')
    expect(forjar(semForno, 'espada', false, 'aco')).toBe(semForno)
  })

  it('a fila guarda o material de cada pedido e o automático repete o material', () => {
    let s = comForno({ recursos: { minerio: 0, carvao: 0, lingote: 50, aco: 50 } })
    s = forjar(s, 'espada', false, 'aco')
    s = forjar(s, 'escudo', false, 'ferro') // entra na fila
    s = forjar(s, 'elmo', false, 'aco')
    expect(s.fila).toEqual([
      { receita: 'escudo', material: 'ferro' },
      { receita: 'elmo', material: 'aco' },
    ])
    const r = avancarBigorna(s, 1000).estado
    expect(r.itens.map((i) => [i.tipo, i.material])).toEqual([
      ['espada', 'aco'],
      ['escudo', 'ferro'],
      ['elmo', 'aco'],
    ])
    const auto = avancarBigorna({ ...r, automatico: true }, 40).estado
    expect(auto.itens.length).toBeGreaterThan(r.itens.length)
    expect(auto.itens[auto.itens.length - 1]!.material).toBe('aco')
  })
})
