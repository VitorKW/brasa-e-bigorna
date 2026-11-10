import { describe, expect, it } from 'vitest'
import {
  DEF_EXPEDICAO,
  EXPEDICOES,
  chanceFragmento,
  chanceSucesso,
  coletar,
  coletarTodas,
  moedasBase,
  motivoNaoPartir,
  partir,
  preverExpedicao,
  reputacaoDe,
  retornosPendentes,
  segundosParaVoltar,
} from './expedicoes.ts'
import { equipar, poderHeroi, recrutar } from './herois.ts'
import { estadoInicial, type GameState } from './state.ts'

const base = (mut: Partial<GameState> = {}, classe: 'guerreiro' | 'batedor' = 'guerreiro'): GameState =>
  recrutar({ ...estadoInicial(0, 77), moedas: 1e6, ...mut }, classe)

describe('chance e loot (GDD §4.2)', () => {
  it('p = 0,5 + (P − D) / (2D), limitada a 5 %..95 %', () => {
    expect(chanceSucesso(100, 100)).toBeCloseTo(0.5, 9)
    expect(chanceSucesso(150, 100)).toBeCloseTo(0.75, 9)
    expect(chanceSucesso(1, 100)).toBe(0.05)
    expect(chanceSucesso(1000, 100)).toBe(0.95)
  })

  it('as durações e dificuldades batem com o GDD', () => {
    const d = (id: (typeof EXPEDICOES)[number]) => [DEF_EXPEDICAO[id].segundos, DEF_EXPEDICAO[id].dificuldade]
    expect(d('trilha')).toEqual([120, 40])
    expect(d('moinho')).toEqual([600, 70])
    expect(d('gruta')).toEqual([1800, 110])
    expect(d('passo')).toEqual([3600, 300])
    expect(d('desfiladeiro')).toEqual([4 * 3600, 550])
    expect(d('pico')).toEqual([8 * 3600, 800])
  })

  it('moedas = 15 × D^0,8 × horas^0,5', () => {
    expect(moedasBase('passo')).toBeCloseTo(15 * Math.pow(300, 0.8), 6)
    expect(moedasBase('gruta')).toBeCloseTo(15 * Math.pow(110, 0.8) * Math.sqrt(0.5), 6)
  })

  it('fragmento: 10 % por hora, limitado a 100 %; o batedor ganha +20 %', () => {
    expect(chanceFragmento('passo', 0)).toBeCloseTo(0.1, 9)
    expect(chanceFragmento('pico', 0)).toBeCloseTo(0.8, 9)
    expect(chanceFragmento('pico', 0.2)).toBeCloseTo(0.96, 9)
    expect(chanceFragmento('pico', 0.5)).toBe(1)
  })

  it('reputação por sucesso fica entre 5 e 15', () => {
    for (const id of EXPEDICOES) {
      expect(reputacaoDe(id)).toBeGreaterThanOrEqual(5)
      expect(reputacaoDe(id)).toBeLessThanOrEqual(15)
    }
  })

  it('XP do herói = D / 2', () => {
    expect(preverExpedicao(50, 0, 'moinho').xp).toBe(35)
  })
})

describe('partir', () => {
  it('sorteia e grava o resultado na partida (determinístico pela semente)', () => {
    const a = partir(base(), 1, 'trilha', 1000)
    const b = partir(base(), 1, 'trilha', 1000)
    expect(a.expedicoes).toEqual(b.expedicoes)
    expect(a.rng).toBe(b.rng)
    expect(a.rng).not.toBe(base().rng)
    const e = a.expedicoes[0]!
    expect(e.fim).toBe(1000 + 120_000)
    expect(typeof e.sucesso).toBe('boolean')
  })

  it('reabrir o app não rerrola: o resultado só depende do estado salvo, não do relógio', () => {
    const s = partir(base(), 1, 'trilha', 0)
    const guardado = s.expedicoes[0]!
    const depois = JSON.parse(JSON.stringify(s)) as GameState
    expect(depois.expedicoes[0]).toEqual(guardado)
    // coletar em qualquer momento depois do fim entrega o mesmo
    const r1 = coletar(depois, guardado.id, 120_000).coleta
    const r2 = coletar(depois, guardado.id, 9_999_999).coleta
    expect(r1).toEqual(r2)
  })

  it('a volta é decidida pelo timestamp', () => {
    const s = partir(base(), 1, 'moinho', 5000)
    const e = s.expedicoes[0]!
    expect(retornosPendentes(s, 5000 + 599_999)).toHaveLength(0)
    expect(retornosPendentes(s, 5000 + 600_000)).toHaveLength(1)
    expect(segundosParaVoltar(e, 5000 + 540_000)).toBeCloseTo(60, 6)
    expect(segundosParaVoltar(e, 1e12)).toBe(0)
    // coletar antes da hora não faz nada
    expect(coletar(s, e.id, 6000).estado).toBe(s)
  })

  it('1 herói por expedição: não parte duas vezes nem com herói inexistente', () => {
    const s = partir(base(), 1, 'trilha', 0)
    expect(motivoNaoPartir(s, 1, 'moinho')).toBe('ocupado')
    expect(partir(s, 1, 'moinho', 0)).toBe(s)
    expect(motivoNaoPartir(s, 99, 'trilha')).toBe('sem-heroi')
  })

  it('a região 2 só abre depois do Golem', () => {
    const s = base()
    expect(motivoNaoPartir(s, 1, 'passo')).toBe('bloqueada')
    expect(partir(s, 1, 'passo', 0)).toBe(s)
    expect(motivoNaoPartir({ ...s, chefesDerrotados: ['golem'] }, 1, 'passo')).toBeNull()
  })

  it('o número de expedições simultâneas é o número de heróis', () => {
    let s = base({ reputacao: 150 })
    s = recrutar(s, 'guardia')
    s = partir(partir(s, 1, 'trilha', 0), 2, 'trilha', 0)
    expect(s.expedicoes).toHaveLength(2)
  })

  it('o resultado tem o loot final: falha rende 30 % das moedas e do XP, sem reputação nem fragmento', () => {
    // percorre sementes até achar uma falha e um sucesso
    let sucesso: GameState | null = null
    let falha: GameState | null = null
    for (let semente = 1; semente < 400 && (!sucesso || !falha); semente++) {
      const s = partir(base({ rng: semente }), 1, 'trilha', 0)
      if (s.expedicoes[0]!.sucesso) sucesso = s
      else falha = s
    }
    const ok = sucesso!.expedicoes[0]!
    const ruim = falha!.expedicoes[0]!
    expect(ok.moedas).toBeCloseTo(moedasBase('trilha'), 6)
    expect(ok.reputacao).toBe(reputacaoDe('trilha'))
    expect(ruim.moedas).toBeCloseTo(moedasBase('trilha') * 0.3, 6)
    expect(ruim.xp).toBeCloseTo(20 * 0.3, 6)
    expect(ruim.reputacao).toBe(0)
    expect(ruim.fragmentos).toBe(0)
  })

  it('a frequência de sucesso acompanha a chance', () => {
    const poder = poderHeroi(base().herois[0]!)
    const p = chanceSucesso(poder, 40)
    let ok = 0
    const n = 2000
    for (let i = 1; i <= n; i++) if (partir(base({ rng: i * 7919 }), 1, 'trilha', 0).expedicoes[0]!.sucesso) ok++
    expect(ok / n).toBeGreaterThan(p - 0.05)
    expect(ok / n).toBeLessThan(p + 0.05)
  })

  it('batedor: +20 % de moedas', () => {
    const b = partir(base({}, 'batedor'), 1, 'moinho', 0)
    const e = b.expedicoes[0]!
    const esperado = preverExpedicao(poderHeroi(b.herois[0]!), 0.2, 'moinho').moedas
    expect(e.moedas).toBeCloseTo(e.sucesso ? esperado : esperado * 0.3, 6)
    expect(esperado).toBeCloseTo(moedasBase('moinho') * 1.2, 6)
  })
})

describe('coletar', () => {
  it('credita moedas, XP, reputação e fragmentos e libera o herói', () => {
    let s = partir({ ...base(), moedas: 0 }, 1, 'trilha', 0)
    const e = { ...s.expedicoes[0]!, sucesso: true, moedas: 100, xp: 60, reputacao: 5, fragmentos: 1 }
    s = { ...s, expedicoes: [e] }
    const r = coletar(s, e.id, e.fim)
    expect(r.estado.moedas).toBe(100)
    expect(r.estado.moedasGanhas).toBe(100)
    expect(r.estado.reputacao).toBe(5)
    expect(r.estado.fragmentos).toBe(1)
    expect(r.estado.expedicoes).toHaveLength(0)
    expect(r.estado.herois[0]!.nivel).toBeGreaterThan(1) // 60 XP passa do nível 1 (50)
    expect(r.coleta.sucessos).toBe(1)
  })

  it('coletarTodas pega só o que já voltou', () => {
    let s = base({ reputacao: 150 })
    s = recrutar(s, 'guardia')
    s = partir(partir(s, 1, 'trilha', 0), 2, 'moinho', 0)
    const r = coletarTodas(s, 130_000)
    expect(r.estado.expedicoes).toHaveLength(1)
    expect(r.coleta.sucessos + r.coleta.falhas).toBe(1)
  })

  it('equipar não funciona enquanto o loot não for coletado', () => {
    let s = base()
    s = {
      ...s,
      itens: [{ id: 1, tipo: 'escudo', material: 'ferro', qualidade: 'comum', ferreiro: 'x', valor: 1, pontuacao: 1 }],
    }
    s = partir(s, 1, 'trilha', 0)
    expect(equipar(s, 1, 1)).toBe(s)
    s = coletar(s, s.expedicoes[0]!.id, 200_000).estado
    expect(equipar(s, 1, 1)).not.toBe(s)
  })
})
