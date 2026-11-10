import { describe, expect, it } from 'vitest'
import { forjar } from './bigorna.ts'
import { quantosServem } from './encomendas.ts'
import { equipar, recrutar } from './herois.ts'
import { contarPorQualidade, venderInuteis, venderItem, venderPorQualidade } from './inventario.ts'
import { valorItem, type Item, type Qualidade } from './items.ts'
import { applyOffline } from './offline.ts'
import { estadoInicial, type GameState } from './state.ts'
import { tickDetalhado } from './tick.ts'

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

// ---------------------------------------------------------------------------
// Venda automática (fatia 5)
// ---------------------------------------------------------------------------
describe('venda automática', () => {
  const peca = (id: number, tipo: Item['tipo'], qualidade: Qualidade, material: Item['material'] = 'ferro'): Item => ({
    id,
    tipo,
    material,
    qualidade,
    ferreiro: 'Você',
    valor: valorItem(tipo, material, qualidade),
    pontuacao: 0,
  })
  const jogo = (itens: Item[], extra: Partial<GameState> = {}): GameState => ({
    ...estadoInicial(0, 4),
    niveis: { mina: 5, carvoaria: 5, fornalha: 5, bigorna: 3, forno: 0 },
    moedas: 0,
    moedasGanhas: 0,
    itens,
    proximoIdItem: 100,
    ...extra,
  })

  it('guarda o melhor de cada espaço por herói e vende o resto', () => {
    const s = jogo([peca(1, 'espada', 'comum'), peca(2, 'espada', 'raro'), peca(3, 'espada', 'incomum'), peca(4, 'escudo', 'comum')])
    // sem herói conta 1: fica a melhor espada e o único escudo
    const r = venderInuteis(s)
    expect(r.estado.itens.map((i) => i.id).sort()).toEqual([2, 4])
    expect(r.vendidos).toBe(2)
    expect(r.ganho).toBe(25 + 37.5)
    expect(r.estado.moedas).toBe(62.5)
    expect(r.estado.moedasGanhas).toBe(62.5)
  })

  it('com N heróis guarda os N melhores por espaço', () => {
    let s = jogo([peca(1, 'espada', 'comum'), peca(2, 'espada', 'raro'), peca(3, 'espada', 'incomum')], { moedas: 1e6, reputacao: 200 })
    s = recrutar(recrutar(s, 'guerreiro'), 'guardia')
    const r = venderInuteis(s)
    expect(r.estado.itens.map((i) => i.id).sort()).toEqual([2, 3])
  })

  it('o item equipado conta na comparação: o inventário só guarda o que passa do equipado', () => {
    let s = jogo([peca(1, 'espada', 'epico'), peca(2, 'espada', 'raro'), peca(3, 'espada', 'comum')], { moedas: 1e6, reputacao: 200 })
    s = recrutar(s, 'guerreiro')
    s = equipar(s, s.herois[0]!.id, 1)
    // com o épico no herói, as outras espadas não melhoram ninguém
    expect(venderInuteis(s).estado.itens).toEqual([])
  })

  it('poupa o que serve a uma encomenda aberta', () => {
    const s = jogo([peca(1, 'escudo', 'comum'), peca(2, 'escudo', 'comum'), peca(3, 'escudo', 'comum')], {
      encomendas: [
        { id: 1, npc: 'tonico', tipo: 'escudo', material: 'ferro', qualidade: 'comum', quantidade: 2, criada: 0, prazo: 1e9, recompensa: 90, reputacao: 10 },
      ],
    })
    const r = venderInuteis(s)
    // 1 fica pelo kit (melhor escudo) e 2 ficam pela encomenda: as duas reservas podem se sobrepor, então sobram 2 ou 3
    expect(r.estado.itens.length).toBeGreaterThanOrEqual(2)
    expect(quantosServem(r.estado, s.encomendas[0]!)).toBe(2)
  })

  it('não faz nada quando tudo é útil (devolve o MESMO estado)', () => {
    const s = jogo([peca(1, 'espada', 'raro')])
    const r = venderInuteis(s)
    expect(r.estado).toBe(s)
    expect(r.vendidos).toBe(0)
  })

  it('o Mercado conta no preço, como na venda manual', () => {
    const s = jogo([peca(1, 'espada', 'comum'), peca(2, 'espada', 'raro')], { construcoes: ['mercado'] })
    expect(venderInuteis(s).ganho).toBeCloseTo(25 * 1.15, 9)
  })

  it('no tick, só vende quando ligada; desligada, o inventário enche e a bigorna para (comportamento da fatia 4)', () => {
    const preparo = (autoVenda: boolean): GameState =>
      forjar(
        {
          ...jogo([], { limiteInventario: 3, automatico: true, ultimaReceita: 'espada', autoVenda }),
          recursos: { minerio: 0, carvao: 0, lingote: 300, aco: 0 },
        },
        'espada',
      )
    const ligada = tickDetalhado(preparo(true), 120)
    expect(ligada.vendaAuto.quantidade).toBeGreaterThan(3)
    expect(ligada.estado.itens.length).toBeLessThanOrEqual(3)
    expect(ligada.estado.moedas).toBeGreaterThan(0)
    const desligada = tickDetalhado(preparo(false), 120)
    expect(desligada.estado.itens).toHaveLength(3)
    expect(desligada.vendaAuto.quantidade).toBe(0)
    // e a bigorna que não parou fez mais peças
    expect(ligada.estado.stats.itensForjados).toBeGreaterThan(desligada.estado.stats.itensForjados)
  })

  it('offline: com a venda automática a bigorna não trava no inventário cheio e o resumo conta o que vendeu', () => {
    const preparo = (autoVenda: boolean): GameState => ({
      ...jogo([], { limiteInventario: 5, automatico: true, ultimaReceita: 'espada', autoVenda }),
      recursos: { minerio: 1e5, carvao: 1e5, lingote: 1e4, aco: 0 },
    })
    const com = applyOffline(preparo(true), 3600 * 1000)
    const sem = applyOffline(preparo(false), 3600 * 1000)
    expect(com.resumo.vendidosAuto).toBeGreaterThan(100)
    expect(com.resumo.ganhoAuto).toBeGreaterThan(1000)
    expect(com.resumo.inventarioCheio).toBe(false)
    expect(sem.resumo.vendidosAuto).toBe(0)
    expect(sem.resumo.inventarioCheio).toBe(true)
    expect(com.resumo.totalForjados).toBeGreaterThan(sem.resumo.totalForjados * 10)
  })
})
