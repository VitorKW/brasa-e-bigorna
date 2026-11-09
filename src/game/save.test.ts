import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './constants.ts'
import { desserializar, migrar, serializar, type Migracoes } from './save.ts'
import { estadoInicial } from './state.ts'

describe('save', () => {
  it('ida e volta preserva o estado', () => {
    const s = { ...estadoInicial(123), moedas: 42.5, niveis: { mina: 7, carvoaria: 3, fornalha: 2, bigorna: 0 } }
    expect(desserializar(serializar(s))).toEqual(s)
  })

  it('save corrompido ou inválido vira null', () => {
    expect(desserializar('{nao eh json')).toBeNull()
    expect(desserializar('null')).toBeNull()
    expect(desserializar(JSON.stringify({ ...estadoInicial(0), moedas: 'x' }))).toBeNull()
    const nivelZero = { ...estadoInicial(0), niveis: { mina: 0, carvoaria: 1, fornalha: 1, bigorna: 0 } }
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
      recursos: { minerio: 12.5, carvao: 3, lingote: 7 },
      moedas: 321.5,
      moedasGanhas: 4000,
    }
    const s = desserializar(JSON.stringify(v1))
    expect(s).not.toBeNull()
    expect(s!.version).toBe(SAVE_VERSION)
    expect(s!.niveis).toEqual({ mina: 9, carvoaria: 5, fornalha: 4, bigorna: 0 })
    expect(s!.recursos).toEqual(v1.recursos)
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
      niveis: { ...base.niveis, bigorna: 3 },
      itens: [{ id: 4, tipo: 'elmo', material: 'ferro', qualidade: 'raro', ferreiro: 'Dona Cida', valor: 75, pontuacao: 52 }],
      proximoIdItem: 5,
      fila: ['espada', 'escudo'],
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
})
