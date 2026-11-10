import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './constants.ts'
import { desserializar, migrar, serializar, type Migracoes } from './save.ts'
import { estadoInicial, type GameState } from './state.ts'

describe('save', () => {
  it('ida e volta preserva o estado', () => {
    const s = { ...estadoInicial(123), moedas: 42.5, niveis: { mina: 7, carvoaria: 3, fornalha: 2, bigorna: 0, forno: 0 } }
    expect(desserializar(serializar(s))).toEqual(s)
  })

  it('save corrompido ou inválido vira null', () => {
    expect(desserializar('{nao eh json')).toBeNull()
    expect(desserializar('null')).toBeNull()
    expect(desserializar(JSON.stringify({ ...estadoInicial(0), moedas: 'x' }))).toBeNull()
    const nivelZero = { ...estadoInicial(0), niveis: { mina: 0, carvoaria: 1, fornalha: 1, bigorna: 0, forno: 0 } }
    expect(desserializar(JSON.stringify(nivelZero))).toBeNull()
  })

  it('save de versão futura não é carregado', () => {
    expect(migrar({ ...estadoInicial(0), version: SAVE_VERSION + 1 })).toBeNull()
  })

  it('estrutura de migração: v1 -> v2 -> v3 em cadeia', () => {
    const migracoes: Migracoes = {
      1: (raw) => ({ ...raw, version: 2, moedasGanhas: 0 }),
      2: (raw) => ({ ...raw, version: 3, renomeado: true }),
    }
    const passos: unknown[] = []
    const r = migrar({ version: 1, lastTick: 5 }, migracoes, 3, (cru) => {
      passos.push(cru)
      return { ...estadoInicial(5), version: 3 }
    })
    expect(r?.version).toBe(3)
    expect(passos[0]).toMatchObject({ version: 3, moedasGanhas: 0, renomeado: true })
  })

  it('migração ausente no meio da cadeia falha com null', () => {
    expect(migrar({ ...estadoInicial(0), version: 1 }, {}, 3)).toBeNull()
  })

  it('migra o save da fatia 1 (v1) para a v2 sem perder progresso', () => {
    const v1 = {
      version: 1,
      lastTick: 1_700_000_000_000,
      niveis: { mina: 9, carvoaria: 5, fornalha: 4 },
      recursos: { minerio: 12.5, carvao: 3, lingote: 7, aco: 0 },
      moedas: 321.5,
      moedasGanhas: 4000,
    }
    const s = desserializar(JSON.stringify(v1))
    expect(s).not.toBeNull()
    expect(s!.version).toBe(SAVE_VERSION)
    expect(s!.niveis).toEqual({ mina: 9, carvoaria: 5, fornalha: 4, bigorna: 0, forno: 0 })
    expect(s!.recursos).toEqual({ ...v1.recursos, aco: 0 })
    expect(s!.moedas).toBe(321.5)
    expect(s!.moedasGanhas).toBe(4000)
    expect(s!.itens).toEqual([])
    expect(s!.forja).toBeNull()
    expect(s!.automatico).toBe(false)
    expect(s!.ferreiros.tito).toEqual({ contratado: false, nivel: 1, xp: 0, estacao: null })
    expect(Number.isInteger(s!.rng)).toBe(true)
    // o save migrado volta a ser lido sem migração
    expect(desserializar(serializar(s!))).toEqual(s)
  })

  it('v1 corrompido continua sendo rejeitado', () => {
    expect(desserializar(JSON.stringify({ version: 1, lastTick: 0 }))).toBeNull()
  })

  it('ida e volta com itens, ferreiros e forja em andamento', () => {
    const base = estadoInicial(5, 99)
    const s = {
      ...base,
      niveis: { ...base.niveis, bigorna: 3, forno: 0 },
      itens: [{ id: 4, tipo: 'elmo', material: 'ferro', qualidade: 'raro', ferreiro: 'Dona Cida', valor: 75, pontuacao: 52 }],
      proximoIdItem: 5,
      fila: [{ receita: 'espada', material: 'ferro' }, { receita: 'escudo', material: 'aco' }],
      automatico: true,
      ultimaReceita: 'escudo',
      forja: { receita: 'espada', material: 'ferro', progresso: 0.4, aleatorio: 13, alvo: 0.6, duplo: true, batida: 'bom', minigame: 'feito' },
      ferreiros: { ...base.ferreiros, cida: { contratado: true, nivel: 4, xp: 3.5, estacao: 'bigorna' } },
    } as typeof base
    expect(desserializar(serializar(s))).toEqual(s)
  })

  it('posto inválido de ferreiro vira sem posto (não corrompe)', () => {
    const base = estadoInicial(0)
    const s = { ...base, ferreiros: { ...base.ferreiros, tito: { contratado: true, nivel: 2, xp: 0, estacao: 'mina' as const } } }
    expect(desserializar(serializar(s))!.ferreiros.tito.estacao).toBeNull()
  })

  it('item com qualidade inexistente invalida o save', () => {
    const s = { ...estadoInicial(0), itens: [{ id: 1, tipo: 'espada', material: 'ferro', qualidade: 'mitico', ferreiro: 'x', valor: 1, pontuacao: 1 }] }
    expect(desserializar(JSON.stringify(s))).toBeNull()
  })

  it('migra o save da fatia 2 (v2) para a v4 sem perder nada', () => {
    const item = { id: 4, tipo: 'elmo', material: 'ferro', qualidade: 'raro', ferreiro: 'Dona Cida', valor: 75, pontuacao: 52 }
    const v2 = {
      version: 2,
      lastTick: 1_700_000_000_000,
      niveis: { mina: 12, carvoaria: 9, fornalha: 8, bigorna: 6 },
      recursos: { minerio: 10, carvao: 5, lingote: 33 },
      moedas: 9999.5,
      moedasGanhas: 50_000,
      rng: 424242,
      itens: [item],
      limiteInventario: 30,
      proximoIdItem: 5,
      ferreiros: estadoInicial(0).ferreiros,
      forja: null,
      fila: ['espada', 'escudo'],
      automatico: true,
      ultimaReceita: 'escudo',
    }
    const s = desserializar(JSON.stringify(v2))
    expect(s).not.toBeNull()
    expect(s!.version).toBe(SAVE_VERSION)
    // o que já existia continua igual
    expect(s!.niveis).toEqual({ ...v2.niveis, forno: 0 })
    expect(s!.recursos).toEqual({ ...v2.recursos, aco: 0 })
    expect(s!.moedas).toBe(9999.5)
    expect(s!.rng).toBe(424242)
    expect(s!.itens).toEqual([item])
    expect(s!.automatico).toBe(true)
    expect(s!.ultimaReceita).toBe('escudo')
    // a fila ganha o material (tudo ferro)
    expect(s!.fila).toEqual([
      { receita: 'espada', material: 'ferro' },
      { receita: 'escudo', material: 'ferro' },
    ])
    // o que é novo nasce vazio
    expect(s!.ultimoMaterial).toBe('ferro')
    expect(s!.herois).toEqual([])
    expect(s!.expedicoes).toEqual([])
    expect(s!.reputacao).toBe(0)
    expect(s!.fragmentos).toBe(0)
    expect(s!.chefesDerrotados).toEqual([])
    expect(s!.proximoIdHeroi).toBe(1)
    expect(s!.construcoes).toEqual([])
    expect(s!.talentos).toEqual([])
    expect(s!.brasas).toBe(0)
    expect(s!.reforjas).toBe(0)
    // e o resultado volta a ser lido sem migração
    expect(desserializar(serializar(s!))).toEqual(s)
  })

  it('v2 corrompido continua sendo rejeitado', () => {
    expect(desserializar(JSON.stringify({ version: 2, lastTick: 0, niveis: {}, recursos: {} }))).toBeNull()
  })

  it('ida e volta com heróis equipados, expedição em andamento, reputação e Golem derrotado', () => {
    const base = estadoInicial(5, 99)
    const item = { id: 7, tipo: 'machado', material: 'aco', qualidade: 'epico', ferreiro: 'Mestre Odair', valor: 400, pontuacao: 75 }
    const s: GameState = {
      ...base,
      niveis: { ...base.niveis, forno: 3 },
      recursos: { ...base.recursos, aco: 12.5 },
      ultimoMaterial: 'aco',
      herois: [
        {
          id: 1,
          nome: 'Bento',
          classe: 'guerreiro',
          nivel: 4,
          xp: 12.5,
          equipamento: { arma: item as GameState['itens'][number], escudo: null, armadura: null, elmo: null },
        },
        { id: 2, nome: 'Dalva', classe: 'guardia', nivel: 1, xp: 0, equipamento: { arma: null, escudo: null, armadura: null, elmo: null } },
      ],
      proximoIdHeroi: 3,
      expedicoes: [
        { id: 3, heroi: 2, tipo: 'moinho', inicio: 1000, fim: 601_000, sucesso: false, chance: 0.4, moedas: 12, xp: 10, reputacao: 0, fragmentos: 0 },
      ],
      proximoIdExpedicao: 4,
      reputacao: 163,
      fragmentos: 6,
      chefesDerrotados: ['golem'],
    }
    expect(desserializar(serializar(s))).toEqual(s)
  })

  it('item no espaço errado do herói invalida o save', () => {
    const base = estadoInicial(5, 99)
    const item = { id: 7, tipo: 'escudo', material: 'ferro', qualidade: 'comum', ferreiro: 'x', valor: 1, pontuacao: 1 }
    const s = {
      ...base,
      herois: [{ id: 1, nome: 'Bento', classe: 'guerreiro', nivel: 1, xp: 0, equipamento: { arma: item, escudo: null, armadura: null, elmo: null } }],
      proximoIdHeroi: 2,
    }
    expect(desserializar(JSON.stringify(s))).toBeNull()
  })

  it('expedição de herói que não existe é descartada sem corromper o resto', () => {
    const base = estadoInicial(5, 99)
    const s = {
      ...base,
      expedicoes: [{ id: 1, heroi: 9, tipo: 'trilha', inicio: 0, fim: 1, sucesso: true, chance: 1, moedas: 1, xp: 1, reputacao: 5, fragmentos: 0 }],
    }
    expect(desserializar(JSON.stringify(s))!.expedicoes).toEqual([])
  })
})

/** Tira os campos da fatia 5: o que um save v3 ou v4 não tem. */
function semFatia5(estado: object): Record<string, unknown> {
  const r = { ...estado } as Record<string, unknown>
  for (const k of ['encomendas', 'proximoIdEncomenda', 'proximaEncomenda', 'autoVenda', 'conquistas', 'stats', 'som', 'dicasVistas']) {
    delete r[k]
  }
  return r
}

describe('save v4 (fatia 4)', () => {
  const v3 = (): Record<string, unknown> => {
    const { construcoes, brasas, talentos, reforjas, ...resto } = estadoInicial(1_700_000_000_000, 5)
    void construcoes
    void brasas
    void talentos
    void reforjas
    const v3sem5 = semFatia5(resto)
    return {
      ...v3sem5,
      version: 3,
      moedas: 777.5,
      moedasGanhas: 123_456,
      reputacao: 480,
      fragmentos: 9,
      chefesDerrotados: ['golem'],
      herois: [
        { id: 1, nome: 'Bento', classe: 'guerreiro', nivel: 7, xp: 3, equipamento: { arma: null, escudo: null, armadura: null, elmo: null } },
      ],
      proximoIdHeroi: 2,
    }
  }

  it('MIGRACOES[3] acrescenta construções, brasas, talentos e Reforjas e não mexe no resto', () => {
    const antigo = v3()
    const s = desserializar(JSON.stringify(antigo))
    expect(s).not.toBeNull()
    expect(s!.version).toBe(SAVE_VERSION)
    expect(s!.construcoes).toEqual([])
    expect(s!.brasas).toBe(0)
    expect(s!.talentos).toEqual([])
    expect(s!.reforjas).toBe(0)
    // o progresso da v3 continua igual: reputação, chefes, herói, moedas do ciclo
    expect(s!.reputacao).toBe(480)
    expect(s!.chefesDerrotados).toEqual(['golem'])
    expect(s!.herois[0]!.nivel).toBe(7)
    expect(s!.moedas).toBe(777.5)
    expect(s!.moedasGanhas).toBe(123_456)
    expect(desserializar(serializar(s!))).toEqual(s)
  })

  it('cadeia completa: um save v1 chega à versão atual', () => {
    const v1 = { version: 1, lastTick: 5, niveis: { mina: 3, carvoaria: 2, fornalha: 2 }, recursos: { minerio: 1, carvao: 1, lingote: 1, aco: 0 }, moedas: 5, moedasGanhas: 5 }
    const s = desserializar(JSON.stringify(v1))
    expect(s?.version).toBe(SAVE_VERSION)
    expect(s?.construcoes).toEqual([])
  })

  it('ida e volta com construções, talentos, brasas e Serpe derrotada', () => {
    const s: GameState = {
      ...estadoInicial(9, 3),
      construcoes: ['segunda_fornalha', 'armazem', 'muralha'],
      talentos: ['fornalheiro_1', 'fornalheiro_2', 'mestre_1'],
      brasas: 4,
      reforjas: 2,
      chefesDerrotados: ['golem', 'serpe'],
      reputacao: 1234.5,
    }
    expect(desserializar(serializar(s))).toEqual(s)
  })

  it('ids de construção e talento desconhecidos são descartados, sem repetir', () => {
    const s = {
      ...estadoInicial(9, 3),
      construcoes: ['armazem', 'armazem', 'castelo'],
      talentos: ['mestre_1', 'x_9', 'mestre_1'],
      chefesDerrotados: ['golem', 'dragao'],
    }
    const lido = desserializar(JSON.stringify(s))!
    expect(lido.construcoes).toEqual(['armazem'])
    expect(lido.talentos).toEqual(['mestre_1'])
    expect(lido.chefesDerrotados).toEqual(['golem'])
  })

  it('v4 sem os campos novos ou com brasas inválidas é rejeitado', () => {
    const ok = estadoInicial(9, 3)
    const { talentos, ...semTalentos } = ok
    void talentos
    expect(desserializar(JSON.stringify(semTalentos))).toBeNull()
    expect(desserializar(JSON.stringify({ ...ok, brasas: 'muitas' }))).toBeNull()
  })
})

describe('save v5 (fatia 5)', () => {
  const v4 = (): Record<string, unknown> => ({
    ...semFatia5(estadoInicial(1_700_000_000_000, 5)),
    version: 4,
    moedas: 5_000_000.5,
    moedasGanhas: 40_000_000,
    niveis: { mina: 30, carvoaria: 28, fornalha: 20, bigorna: 25, forno: 10 },
    proximoIdItem: 701,
    reputacao: 900,
    chefesDerrotados: ['golem'],
    construcoes: ['segunda_fornalha', 'armazem'],
    reforjas: 1,
    brasas: 3,
  })

  it('MIGRACOES[4] acrescenta encomendas, conquistas, estatísticas e opções sem mexer no resto', () => {
    const s = desserializar(JSON.stringify(v4()))
    expect(s).not.toBeNull()
    expect(s!.version).toBe(5)
    expect(s!.encomendas).toEqual([])
    expect(s!.proximoIdEncomenda).toBe(1)
    expect(s!.proximaEncomenda).toBe(0)
    expect(s!.autoVenda).toBe(false)
    expect(s!.som).toBe(false)
    expect(s!.conquistas).toEqual([])
    expect(s!.dicasVistas).toEqual([])
    // o progresso da v4 continua igual
    expect(s!.moedas).toBe(5_000_000.5)
    expect(s!.reputacao).toBe(900)
    expect(s!.construcoes).toEqual(['segunda_fornalha', 'armazem'])
    expect(s!.brasas).toBe(3)
    expect(s!.reforjas).toBe(1)
    expect(desserializar(serializar(s!))).toEqual(s)
  })

  it('as estatísticas migradas nascem do que o save já diz', () => {
    const s = desserializar(JSON.stringify(v4()))!
    expect(s.stats.itensForjados).toBe(700) // ids de item emitidos
    expect(s.stats.lingotesFundidos).toBeGreaterThanOrEqual(1)
    expect(s.stats.sessoes).toBe(1)
    expect(s.stats.encomendasEntregues).toBe(0)
    // um save v4 recém-criado (sem progresso) não inventa itens
    const novo = desserializar(JSON.stringify({ ...semFatia5(estadoInicial(0, 1)), version: 4 }))!
    expect(novo.stats.itensForjados).toBe(0)
    expect(novo.stats.lingotesFundidos).toBe(0)
  })

  it('cadeia completa: um save v1 chega à v5 com tudo no lugar', () => {
    const v1 = { version: 1, lastTick: 5, niveis: { mina: 3, carvoaria: 2, fornalha: 2 }, recursos: { minerio: 1, carvao: 1, lingote: 1, aco: 0 }, moedas: 5, moedasGanhas: 5 }
    const s = desserializar(JSON.stringify(v1))
    expect(s?.version).toBe(5)
    expect(s?.encomendas).toEqual([])
    expect(s?.stats.sessoes).toBe(1)
  })

  it('ida e volta com encomendas, conquistas, estatísticas e opções', () => {
    const base = estadoInicial(9, 3)
    const s: GameState = {
      ...base,
      encomendas: [
        { id: 4, npc: 'amaro', tipo: 'espada', material: 'ferro', qualidade: 'incomum', quantidade: 2, criada: 1000, prazo: 9_000_000, recompensa: 112.5, reputacao: 21 },
      ],
      proximoIdEncomenda: 5,
      proximaEncomenda: 5_000_000,
      autoVenda: true,
      som: true,
      conquistas: ['primeiro_lingote', 'golem'],
      dicasVistas: ['melhorar'],
      stats: { ...base.stats, itensForjados: 12, melhorSequenciaPerfeita: 3, encomendasEntregues: 4, tempoAtivoSegundos: 123.5, sessoes: 7 },
    }
    expect(desserializar(serializar(s))).toEqual(s)
  })

  it('encomenda malformada rejeita o save; morador repetido e excesso são descartados', () => {
    const base = estadoInicial(9, 3)
    const enc = (id: number, npc: string) => ({ id, npc, tipo: 'escudo', material: 'ferro', qualidade: 'comum', quantidade: 1, criada: 0, prazo: 99, recompensa: 45, reputacao: 10 })
    expect(desserializar(JSON.stringify({ ...base, encomendas: [{ ...enc(1, 'amaro'), tipo: 'lança' }] }))).toBeNull()
    expect(desserializar(JSON.stringify({ ...base, encomendas: [{ ...enc(1, 'amaro'), prazo: 'ontem' }] }))).toBeNull()
    const lido = desserializar(
      JSON.stringify({ ...base, encomendas: [enc(1, 'amaro'), enc(2, 'amaro'), enc(3, 'dito'), enc(4, 'ines'), enc(5, 'jurema')] }),
    )!
    expect(lido.encomendas.map((e) => e.id)).toEqual([1, 3, 4]) // sem repetir o morador, no máximo 3
    expect(lido.proximoIdEncomenda).toBeGreaterThanOrEqual(5)
  })

  it('conquista desconhecida é descartada e dicas repetidas viram uma só', () => {
    const base = estadoInicial(9, 3)
    const lido = desserializar(JSON.stringify({ ...base, conquistas: ['golem', 'golem', 'dragao'], dicasVistas: ['a', 'a', 7, 'b'] }))!
    expect(lido.conquistas).toEqual(['golem'])
    expect(lido.dicasVistas).toEqual(['a', 'b'])
  })

  it('v5 sem os campos novos, ou com contador inválido, é rejeitado', () => {
    const ok = estadoInicial(9, 3)
    const { stats, ...semStats } = ok
    void stats
    expect(desserializar(JSON.stringify(semStats))).toBeNull()
    expect(desserializar(JSON.stringify({ ...ok, stats: { ...ok.stats, sessoes: -1 } }))).toBeNull()
    expect(desserializar(JSON.stringify({ ...ok, autoVenda: 'sim' }))).toBeNull()
  })
})
