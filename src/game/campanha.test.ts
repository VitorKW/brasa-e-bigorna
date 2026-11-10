import { describe, expect, it } from 'vitest'
import {
  CAPITULOS,
  TODAS_MISSOES,
  aplicarCampanha,
  capituloAtual,
  novasMissoes,
  progressoCampanha,
  receberRecompensa,
} from './campanha.ts'
import { DEF_NPC } from './encomendas.ts'
import { reforjar } from './reforjar.ts'
import { simular } from './sim.ts'
import { estadoInicial, type GameState } from './state.ts'

const base = (): GameState => estadoInicial(0, 1)
const comFeitas = (s: GameState, ids: readonly string[], recompensas: number[] = []): GameState => ({
  ...s,
  campanha: { ...s.campanha, feitas: [...ids], recompensas },
})
const missoesDo = (n: number): string[] => CAPITULOS[n - 1]!.missoes.map((m) => m.id)

describe('estrutura da campanha', () => {
  it('7 capítulos numerados em ordem, cada um com narrador, textos, missões e recompensa', () => {
    expect(CAPITULOS.map((c) => c.numero)).toEqual([1, 2, 3, 4, 5, 6, 7])
    for (const c of CAPITULOS) {
      expect(DEF_NPC[c.narrador], c.titulo).toBeDefined()
      expect(c.abertura.length, c.titulo).toBeGreaterThan(60)
      expect(c.abertura.length, c.titulo).toBeLessThan(260) // cabe na tela do celular sem rolar
      expect(c.desfecho.length, c.titulo).toBeGreaterThan(20)
      expect(c.missoes.length, c.titulo).toBeGreaterThanOrEqual(2)
      expect(c.missoes.length, c.titulo).toBeLessThanOrEqual(4)
    }
  })

  it('ids de missão não se repetem e cada narrador aparece uma vez', () => {
    expect(new Set(TODAS_MISSOES).size).toBe(TODAS_MISSOES.length)
    expect(new Set(CAPITULOS.map((c) => c.narrador)).size).toBe(CAPITULOS.length)
  })

  it('jogo novo não tem nenhuma missão cumprida e está no capítulo 1', () => {
    expect(novasMissoes(base())).toEqual([])
    expect(capituloAtual(base())?.numero).toBe(1)
    expect(progressoCampanha(base())).toMatchObject({ feitas: 0, total: 4, prontoParaReceber: false })
    expect(progressoCampanha(base()).proxima?.id).toBe('c1_mina')
  })
})

describe('missões', () => {
  it('são gravadas quando o estado passa a cumprir, e só uma vez', () => {
    const s = { ...base(), niveis: { ...base().niveis, mina: 5, bigorna: 1 } }
    const r = aplicarCampanha(s)
    expect(r.novas).toEqual(['c1_mina', 'c1_bigorna'])
    expect(r.estado.campanha.feitas).toEqual(['c1_mina', 'c1_bigorna'])
    const de_novo = aplicarCampanha(r.estado)
    expect(de_novo.novas).toEqual([])
    expect(de_novo.estado).toBe(r.estado) // mesmo objeto: nada mudou
  })

  it('contam mesmo fora do capítulo atual (ninguém perde o que fez adiantado)', () => {
    const s = { ...base(), chefesDerrotados: ['golem' as const] }
    expect(aplicarCampanha(s).novas).toContain('c3_golem')
    expect(capituloAtual(aplicarCampanha(s).estado)?.numero).toBe(1)
  })

  it('ficam gravadas depois que o estado deixa de cumprir (o Reforjar não apaga a história)', () => {
    const s = aplicarCampanha({ ...base(), niveis: { ...base().niveis, mina: 9 } }).estado
    const depois = aplicarCampanha({ ...s, niveis: { ...s.niveis, mina: 1 } }).estado
    expect(depois.campanha.feitas).toContain('c1_mina')
  })
})

describe('recompensas', () => {
  it('só sai com o capítulo completo, uma vez, e avança para o próximo', () => {
    const incompleto = comFeitas(base(), ['c1_mina', 'c1_bigorna'])
    expect(receberRecompensa(incompleto)).toBe(incompleto)

    const completo = comFeitas(base(), missoesDo(1))
    expect(progressoCampanha(completo).prontoParaReceber).toBe(true)
    const pago = receberRecompensa(completo)
    expect(pago.moedas).toBe(completo.moedas + 500)
    expect(pago.moedasGanhas).toBe(completo.moedasGanhas + 500)
    expect(pago.campanha.recompensas).toEqual([1])
    expect(capituloAtual(pago)?.numero).toBe(2)
    expect(receberRecompensa(pago)).toBe(pago) // o capítulo 2 ainda não está completo
  })

  it('recompensa em item entra no inventário mesmo cheio, com a origem escrita', () => {
    const cheio = { ...comFeitas(base(), [...missoesDo(1), ...missoesDo(2)], [1]), limiteInventario: 0 }
    const pago = receberRecompensa(cheio)
    expect(pago.itens).toHaveLength(1)
    expect(pago.itens[0]).toMatchObject({ tipo: 'escudo', material: 'ferro', qualidade: 'raro', ferreiro: 'Presente do Sargento Amaro' })
    expect(pago.proximoIdItem).toBe(cheio.proximoIdItem + 1)
  })

  it('capítulos 6 e 7 pagam em Brasas, e depois do epílogo a campanha acaba', () => {
    const tudo = comFeitas(base(), TODAS_MISSOES, [1, 2, 3, 4, 5])
    const seis = receberRecompensa(tudo)
    expect(seis.brasas).toBe(1)
    const sete = receberRecompensa(seis)
    expect(sete.brasas).toBe(3)
    expect(capituloAtual(sete)).toBeNull()
    expect(progressoCampanha(sete)).toMatchObject({ capitulo: null, prontoParaReceber: false })
    expect(receberRecompensa(sete)).toBe(sete)
  })

  it('não altera o estado recebido', () => {
    const s = comFeitas(base(), missoesDo(1))
    const copia = structuredClone(s)
    receberRecompensa(s)
    aplicarCampanha(s)
    expect(s).toEqual(copia)
  })
})

describe('campanha no jogo de verdade', () => {
  it('o Reforjar mantém missões e recompensas', () => {
    const s: GameState = {
      ...comFeitas(base(), missoesDo(1), [1]),
      construcoes: ['muralha'],
      chefesDerrotados: ['golem', 'serpe'],
      moedasGanhas: 64e6,
    }
    const novo = reforjar(s, 1000)
    expect(novo).not.toBe(s)
    expect(novo.campanha).toEqual(s.campanha)
  })

  it('uma partida do simulador cumpre todas as missões dos capítulos 1 a 6 até a Muralha', () => {
    // 36 h de jogo simulado (a Muralha sai por volta das 31 h 30): o estado final tem de cumprir ou ter
    // cumprido cada missão. As que o Reforjar zeraria não entram aqui porque o sim para antes dele.
    const r = simular(36, 30)
    const s = aplicarCampanha(r.estadoFinal).estado
    const faltam = CAPITULOS.slice(0, 6).flatMap((c) => c.missoes.filter((m) => !s.campanha.feitas.includes(m.id)).map((m) => m.id))
    expect(faltam).toEqual([])
  }, 120_000)
})
