import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './constants.ts'
import { desserializar, migrar, serializar, type Migracoes } from './save.ts'
import { estadoInicial } from './state.ts'

describe('save', () => {
  it('ida e volta preserva o estado', () => {
    const s = { ...estadoInicial(123), moedas: 42.5, niveis: { mina: 7, carvoaria: 3, fornalha: 2 } }
    expect(desserializar(serializar(s))).toEqual(s)
  })

  it('save corrompido ou inválido vira null', () => {
    expect(desserializar('{nao eh json')).toBeNull()
    expect(desserializar('null')).toBeNull()
    expect(desserializar(JSON.stringify({ ...estadoInicial(0), moedas: 'x' }))).toBeNull()
    const nivelZero = { ...estadoInicial(0), niveis: { mina: 0, carvoaria: 1, fornalha: 1 } }
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
})
