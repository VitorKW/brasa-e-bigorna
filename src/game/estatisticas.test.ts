import { describe, expect, it } from 'vitest'
import {
  CAMPOS_ESTATISTICAS,
  duracaoMediaSessao,
  estatisticasIniciais,
  fracaoComBatida,
  registrarSessao,
  somarTempoAtivo,
} from './estatisticas.ts'
import { estadoInicial } from './state.ts'

describe('estatísticas', () => {
  it('começam zeradas e a lista de campos acompanha o tipo', () => {
    const e = estatisticasIniciais()
    for (const campo of CAMPOS_ESTATISTICAS) expect(e[campo]).toBe(0)
    expect(CAMPOS_ESTATISTICAS).toContain('sessoes')
    expect(CAMPOS_ESTATISTICAS).toContain('forjasComBatida')
  })

  it('cada abertura do app é uma sessão', () => {
    let s = estadoInicial(0, 1)
    s = registrarSessao(registrarSessao(s))
    expect(s.stats.sessoes).toBe(2)
  })

  it('soma o tempo ativo e ignora valores inválidos', () => {
    let s = estadoInicial(0, 1)
    s = somarTempoAtivo(s, 0.2)
    s = somarTempoAtivo(s, 0.3)
    expect(s.stats.tempoAtivoSegundos).toBeCloseTo(0.5, 9)
    expect(somarTempoAtivo(s, -5)).toBe(s)
    expect(somarTempoAtivo(s, Number.NaN)).toBe(s)
    expect(somarTempoAtivo(s, Infinity)).toBe(s)
  })

  it('duração média da sessão e fração de forjas com minigame (GDD §8)', () => {
    const e = { ...estatisticasIniciais(), sessoes: 4, tempoAtivoSegundos: 480, forjasTotal: 10, forjasComBatida: 3 }
    expect(duracaoMediaSessao(e)).toBe(120)
    expect(fracaoComBatida(e)).toBeCloseTo(0.3, 9)
    expect(duracaoMediaSessao(estatisticasIniciais())).toBeNull()
    expect(fracaoComBatida(estatisticasIniciais())).toBeNull()
  })
})
