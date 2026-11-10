import { describe, expect, it } from 'vitest'
import {
  DEF_NPC,
  ENCOMENDA,
  NPCS,
  avancarEncomendas,
  entregar,
  falaDe,
  gerarEncomenda,
  itemServe,
  itensDaEntrega,
  itensDeEncomendas,
  motivoNaoEntregar,
  qualidadeMaximaPedida,
  quantosServem,
  recompensaDoPedido,
  reputacaoDoPedido,
  textoPedido,
  tiposDoNpc,
  type Encomenda,
} from './encomendas.ts'
import { equipar, recrutar } from './herois.ts'
import { QUALIDADES, TIPOS_ITEM, valorItem, type Item, type MaterialId, type Qualidade, type TipoItem } from './items.ts'
import { estadoInicial, type GameState } from './state.ts'

const MIN = 60_000
const H = 3_600_000

const item = (id: number, tipo: TipoItem, qualidade: Qualidade = 'comum', material: MaterialId = 'ferro'): Item => ({
  id,
  tipo,
  material,
  qualidade,
  ferreiro: 'Você',
  valor: valorItem(tipo, material, qualidade),
  pontuacao: 10,
})

const comBigorna = (extra: Partial<GameState> = {}): GameState => ({
  ...estadoInicial(0, 42),
  niveis: { mina: 5, carvoaria: 5, fornalha: 5, bigorna: 4, forno: 0 },
  ...extra,
})

const pedido = (o: Partial<Encomenda> = {}): Encomenda => ({
  id: 1,
  npc: 'amaro',
  tipo: 'espada',
  material: 'ferro',
  qualidade: 'incomum',
  quantidade: 2,
  criada: 0,
  prazo: 2 * H,
  recompensa: 150,
  reputacao: 20,
  ...o,
})

describe('moradores', () => {
  it('são 8, com os ids da arte (npc_*), nome, papel e pelo menos dois pedidos com fala', () => {
    expect(NPCS).toEqual(['quiteria', 'amaro', 'tonico', 'jurema', 'ines', 'dito', 'almir', 'zuleica'])
    for (const id of NPCS) {
      const d = DEF_NPC[id]
      expect(d.nome.length).toBeGreaterThan(2)
      expect(d.papel.length).toBeGreaterThan(2)
      expect(tiposDoNpc(id).length).toBeGreaterThanOrEqual(2)
      for (const t of tiposDoNpc(id)) expect(d.falas[t]!.length).toBeGreaterThan(10)
    }
  })

  it('as preferências combinam com o papel e todo tipo de item tem quem peça', () => {
    expect(tiposDoNpc('amaro')).toEqual(expect.arrayContaining(['espada', 'escudo', 'armadura', 'elmo']))
    expect(tiposDoNpc('tonico')).toContain('machado')
    expect(tiposDoNpc('jurema')).toHaveLength(5) // a mascate compra de tudo
    for (const tipo of TIPOS_ITEM) expect(NPCS.some((n) => tiposDoNpc(n).includes(tipo))).toBe(true)
  })

  it('a fala acompanha o tipo pedido', () => {
    expect(falaDe({ npc: 'amaro', tipo: 'elmo' })).toContain('Elmo')
  })
})

describe('texto do pedido', () => {
  it('concorda gênero e número', () => {
    expect(textoPedido(pedido())).toBe('2 espadas de ferro, incomuns ou melhores')
    expect(textoPedido(pedido({ quantidade: 1, qualidade: 'raro' }))).toBe('1 espada de ferro, rara ou melhor')
    expect(textoPedido(pedido({ tipo: 'machado', quantidade: 1, qualidade: 'raro', material: 'aco' }))).toBe(
      '1 machado de aço, raro ou melhor',
    )
    expect(textoPedido(pedido({ tipo: 'armadura', quantidade: 3, qualidade: 'epico' }))).toBe('3 armaduras de ferro, épicas ou melhores')
    expect(textoPedido(pedido({ qualidade: 'comum', quantidade: 3 }))).toBe('3 espadas de ferro, qualquer qualidade')
  })
})

describe('quais itens servem', () => {
  it('tipo certo e qualidade mínima', () => {
    const e = pedido()
    expect(itemServe(item(1, 'espada', 'incomum'), e)).toBe(true)
    expect(itemServe(item(2, 'espada', 'lendario'), e)).toBe(true)
    expect(itemServe(item(3, 'espada', 'comum'), e)).toBe(false)
    expect(itemServe(item(4, 'machado', 'raro'), e)).toBe(false)
  })

  it('o aço serve a pedido de ferro, mas o ferro não serve a pedido de aço', () => {
    expect(itemServe(item(1, 'espada', 'raro', 'aco'), pedido())).toBe(true)
    expect(itemServe(item(1, 'espada', 'raro', 'ferro'), pedido({ material: 'aco' }))).toBe(false)
    expect(itemServe(item(1, 'espada', 'raro', 'aco'), pedido({ material: 'aco' }))).toBe(true)
  })

  it('a entrega usa os mais baratos que servem e deixa os melhores', () => {
    const s = comBigorna({
      itens: [item(1, 'espada', 'epico'), item(2, 'espada', 'incomum'), item(3, 'espada', 'raro'), item(4, 'escudo', 'raro')],
    })
    const usados = itensDaEntrega(s, pedido())!
    expect(usados.map((i) => i.id)).toEqual([2, 3])
    expect(quantosServem(s, pedido())).toBe(2)
    expect(quantosServem(s, pedido({ quantidade: 5 }))).toBe(3)
  })

  it('faltando item, não há entrega', () => {
    const s = comBigorna({ itens: [item(1, 'espada', 'comum'), item(2, 'espada', 'incomum')] })
    expect(itensDaEntrega(s, pedido())).toBeNull()
  })

  it('itens equipados não contam (não estão no inventário)', () => {
    let s = comBigorna({ moedas: 1e6, reputacao: 200 })
    s = recrutar(s, 'guerreiro')
    s = { ...s, itens: [item(1, 'espada', 'raro'), item(2, 'espada', 'raro')], proximoIdItem: 3 }
    s = equipar(s, s.herois[0]!.id, 1)
    expect(s.herois[0]!.equipamento.arma?.id).toBe(1)
    expect(quantosServem(s, pedido())).toBe(1) // só a espada 2
    expect(itensDaEntrega(s, pedido())).toBeNull()
  })

  it('as encomendas abertas reservam itens sem contar o mesmo duas vezes', () => {
    const s = comBigorna({
      itens: [item(1, 'espada', 'incomum'), item(2, 'espada', 'incomum'), item(3, 'espada', 'incomum'), item(4, 'escudo')],
      encomendas: [pedido({ id: 1, npc: 'amaro', quantidade: 2 }), pedido({ id: 2, npc: 'ines', quantidade: 2 })],
    })
    const r = itensDeEncomendas(s)
    expect([...r].sort()).toEqual([1, 2, 3]) // 3 espadas disputadas por 4 vagas: reserva as 3
    expect(r.has(4)).toBe(false)
  })
})

describe('geração', () => {
  it('sem bigorna não surge pedido', () => {
    const s = estadoInicial(0, 1)
    expect(gerarEncomenda(s, 1000)).toBe(s)
    expect(avancarEncomendas(s, 1000)).toBe(s)
  })

  it('com a bigorna, nasce um pedido completo e a próxima espera 45 a 120 min', () => {
    const s = comBigorna()
    const novo = avancarEncomendas(s, 10 * MIN)
    expect(novo.encomendas).toHaveLength(1)
    const e = novo.encomendas[0]!
    expect(NPCS).toContain(e.npc)
    expect(tiposDoNpc(e.npc)).toContain(e.tipo)
    expect(e.quantidade).toBeGreaterThanOrEqual(1)
    expect(e.quantidade).toBeLessThanOrEqual(3)
    expect(e.criada).toBe(10 * MIN)
    // prazo = (2 + quantidade + 0..2) h
    expect(e.prazo - e.criada).toBeGreaterThanOrEqual((2 + e.quantidade) * H)
    expect(e.prazo - e.criada).toBeLessThanOrEqual((4 + e.quantidade) * H)
    expect(novo.proximaEncomenda - 10 * MIN).toBeGreaterThanOrEqual(ENCOMENDA.esperaMinMin * MIN)
    expect(novo.proximaEncomenda - 10 * MIN).toBeLessThanOrEqual(ENCOMENDA.esperaMaxMin * MIN)
    expect(novo.proximoIdEncomenda).toBe(2)
    expect(novo.rng).not.toBe(s.rng)
  })

  it('é determinística e não rerrola ao reabrir: mesma semente, mesmo pedido; chamar de novo não muda nada', () => {
    const a = avancarEncomendas(comBigorna(), 5 * MIN)
    const b = avancarEncomendas(comBigorna(), 5 * MIN)
    expect(b.encomendas).toEqual(a.encomendas)
    // reabrir o app = avançar o relógio de novo: o pedido é o mesmo e nada novo surge antes da espera
    const reaberto = avancarEncomendas(a, 6 * MIN)
    expect(reaberto).toBe(a)
    const maisTarde = avancarEncomendas(a, 7 * MIN)
    expect(maisTarde.encomendas[0]).toEqual(a.encomendas[0])
  })

  it('no máximo 3 abertas, cada uma de um morador diferente', () => {
    let s = comBigorna()
    let t = 0
    for (let i = 0; i < 12; i++) {
      t += 2 * H
      s = avancarEncomendas({ ...s, encomendas: s.encomendas.map((e) => ({ ...e, prazo: t + 100 * H })) }, t)
    }
    expect(s.encomendas).toHaveLength(ENCOMENDA.maxAbertas)
    expect(new Set(s.encomendas.map((e) => e.npc)).size).toBe(3)
  })

  it('só pede aço depois do Forno', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = gerarEncomenda({ ...comBigorna(), rng: seed * 7919 }, 0)
      expect(s.encomendas[0]!.material).toBe('ferro')
    }
    let aco = 0
    for (let seed = 1; seed <= 60; seed++) {
      const s = gerarEncomenda({ ...comBigorna({ niveis: { mina: 5, carvoaria: 5, fornalha: 5, bigorna: 4, forno: 2 } }), rng: seed * 7919 }, 0)
      if (s.encomendas[0]!.material === 'aco') aco++
    }
    expect(aco).toBeGreaterThan(15) // ~60 %
    expect(aco).toBeLessThan(55)
  })

  it('acompanha o progresso: bigorna nova pede só comum; nunca pede o que a bigorna não entrega', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const novo = gerarEncomenda({ ...comBigorna({ niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 0 } }), rng: seed * 104729 }, 0)
      expect(novo.encomendas[0]!.qualidade).toBe('comum')
    }
    // bigorna alta + Odair no nível alto: aparecem pedidos melhores, mas nunca acima do limite calculado
    const forte = comBigorna({
      niveis: { mina: 20, carvoaria: 20, fornalha: 20, bigorna: 40, forno: 0 },
      ferreiros: {
        ...estadoInicial(0).ferreiros,
        odair: { contratado: true, nivel: 13, xp: 0, estacao: 'bigorna' },
      },
    })
    const teto = qualidadeMaximaPedida(forte, 'ferro', ENCOMENDA.chanceMinimaExigente)
    expect(teto).toBeGreaterThanOrEqual(2)
    const vistas = new Set<Qualidade>()
    for (let seed = 1; seed <= 200; seed++) {
      const e = gerarEncomenda({ ...forte, rng: seed * 104729 }, 0).encomendas[0]!
      if (e.material === 'ferro') {
        expect(QUALIDADES.indexOf(e.qualidade)).toBeLessThanOrEqual(teto)
      }
      vistas.add(e.qualidade)
    }
    expect(vistas.size).toBeGreaterThanOrEqual(2)
    expect(vistas.has('lendario')).toBe(false)
  })

  it('o exigente (prefeito) pode pedir um degrau acima do que os outros pedem', () => {
    const forte = comBigorna({ niveis: { mina: 20, carvoaria: 20, fornalha: 20, bigorna: 40, forno: 0 } })
    expect(qualidadeMaximaPedida(forte, 'ferro', ENCOMENDA.chanceMinimaExigente)).toBeGreaterThanOrEqual(
      qualidadeMaximaPedida(forte, 'ferro', ENCOMENDA.chanceMinima),
    )
  })

  it('paga 1,5 × o valor do pedido e dá de 10 a 50 de reputação', () => {
    expect(recompensaDoPedido('espada', 'ferro', 'incomum', 2)).toBeCloseTo(1.5 * 2 * 25 * 1.5, 9)
    expect(recompensaDoPedido('armadura', 'aco', 'raro', 1)).toBeCloseTo(1.5 * 50 * 2.5 * 4, 9)
    expect(reputacaoDoPedido(1, 'comum', 'ferro')).toBe(10)
    expect(reputacaoDoPedido(3, 'lendario', 'aco')).toBe(50)
    for (let seed = 1; seed <= 100; seed++) {
      const e = gerarEncomenda({ ...comBigorna({ niveis: { mina: 9, carvoaria: 9, fornalha: 9, bigorna: 30, forno: 3 } }), rng: seed * 31 }, 0).encomendas[0]!
      expect(e.reputacao).toBeGreaterThanOrEqual(10)
      expect(e.reputacao).toBeLessThanOrEqual(50)
      expect(e.recompensa).toBeCloseTo(recompensaDoPedido(e.tipo, e.material, e.qualidade, e.quantidade), 9)
    }
  })
})

describe('prazo', () => {
  it('pedido vencido some sem punição e outro aparece depois do tempo de espera', () => {
    let s = avancarEncomendas(comBigorna({ moedas: 500, reputacao: 77 }), 0)
    const antes = s.encomendas[0]!
    const depois = avancarEncomendas(s, antes.prazo + 1)
    expect(depois.encomendas.find((e) => e.id === antes.id)).toBeUndefined()
    expect(depois.moedas).toBe(500)
    expect(depois.reputacao).toBe(77)
    expect(depois.stats.encomendasExpiradas).toBe(1)
    // a espera já tinha passado (prazo > 2 h > 120 min): nasce outro no mesmo passo
    expect(depois.encomendas.length).toBe(1)
    expect(depois.encomendas[0]!.id).toBe(antes.id + 1)
    s = depois
    expect(s.stats.encomendasExpiradas).toBe(1)
  })

  it('antes do tempo de espera não surge outro', () => {
    const s = avancarEncomendas(comBigorna(), 0)
    const e = s.encomendas[0]!
    const vencido = avancarEncomendas({ ...s, encomendas: [{ ...e, prazo: 20 * MIN }] }, 20 * MIN)
    expect(vencido.encomendas).toHaveLength(0)
    expect(vencido.proximaEncomenda).toBeGreaterThan(20 * MIN)
  })
})

describe('entrega', () => {
  const base = (): GameState => {
    const s = comBigorna({
      itens: [item(1, 'espada', 'incomum'), item(2, 'espada', 'raro'), item(3, 'escudo', 'comum')],
      moedas: 100,
      moedasGanhas: 1000,
      reputacao: 10,
      encomendas: [pedido()],
      proximoIdEncomenda: 2,
    })
    return s
  }

  it('gasta os itens, paga em moedas e reputação e conta nas estatísticas', () => {
    const s = base()
    const r = entregar(s, 1, 1 * H)
    expect(r.entrega).not.toBeNull()
    expect(r.entrega).toMatchObject({ npc: 'amaro', moedas: 150, reputacao: 20, sobraSegundos: 3600 })
    expect(r.estado.itens.map((i) => i.id)).toEqual([3])
    expect(r.estado.moedas).toBe(250)
    expect(r.estado.moedasGanhas).toBe(1150) // entra na base do Reforjar
    expect(r.estado.reputacao).toBe(30)
    expect(r.estado.encomendas).toHaveLength(0)
    expect(r.estado.stats.encomendasEntregues).toBe(1)
    expect(r.estado.stats.entregasNaHoraH).toBe(0)
  })

  it('entregar com 1 minuto ou menos de sobra conta como "na hora H"', () => {
    const r = entregar(base(), 1, 2 * H - 45_000)
    expect(r.estado.stats.entregasNaHoraH).toBe(1)
    const folgado = entregar(base(), 1, 2 * H - 61_000)
    expect(folgado.estado.stats.entregasNaHoraH).toBe(0)
  })

  it('pedido vencido, inexistente ou sem itens devolve o MESMO estado', () => {
    const s = base()
    expect(motivoNaoEntregar(s, 1, 3 * H)).toBe('vencida')
    expect(entregar(s, 1, 3 * H).estado).toBe(s)
    expect(motivoNaoEntregar(s, 99, 0)).toBe('inexistente')
    expect(entregar(s, 99, 0).entrega).toBeNull()
    const sem = { ...s, itens: [item(3, 'escudo')] }
    expect(motivoNaoEntregar(sem, 1, 0)).toBe('faltam-itens')
    expect(entregar(sem, 1, 0).estado).toBe(sem)
  })
})
