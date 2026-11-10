import { describe, expect, it } from 'vitest'
import { CONSTRUCOES } from './construcoes.ts'
import { NIVEL_MINA_INICIAL, proximoObjetivo } from './objetivo.ts'
import { estadoInicial, type GameState } from './state.ts'

const base = (): GameState => estadoInicial(0, 1)
const comHeroi = (s: GameState, arma = true): GameState => {
  const novo = structuredClone(s)
  const heroi = {
    id: 1,
    nome: 'Bento',
    classe: 'guerreiro',
    nivel: 1,
    xp: 0,
    equipamento: { arma: null, escudo: null, armadura: null, elmo: null },
  } as unknown as GameState['herois'][number]
  if (arma) (heroi.equipamento as Record<string, unknown>).arma = { id: 99, tipo: 'espada', material: 'ferro', qualidade: 'comum', pontos: 10 }
  novo.herois = [heroi]
  return novo
}

describe('próximo objetivo', () => {
  it('jogo novo: melhorar a mina, com progresso pelo nível', () => {
    const o = proximoObjetivo(base(), 0)
    expect(o.id).toBe('mina')
    expect(o.destino).toBe('producao')
    expect(o.progresso).toBeCloseTo(base().niveis.mina / NIVEL_MINA_INICIAL)
  })

  it('mina em dia e sem bigorna: construir a bigorna', () => {
    const s = base()
    s.niveis.mina = NIVEL_MINA_INICIAL
    expect(proximoObjetivo(s, 0)).toMatchObject({ id: 'bigorna', destino: 'bigorna' })
  })

  it('bigorna de pé e nada forjado: forjar a primeira peça', () => {
    const s = base()
    s.niveis.bigorna = 1
    expect(proximoObjetivo(s, 0).id).toBe('forjar')
  })

  it('depois de forjar: contratar, depois equipar', () => {
    const s = base()
    s.niveis.bigorna = 1
    s.stats.itensForjados = 1
    expect(proximoObjetivo(s, 0)).toMatchObject({ id: 'recrutar', destino: 'guilda' })
    expect(proximoObjetivo(comHeroi(s, false), 0).id).toBe('equipar')
    expect(proximoObjetivo(comHeroi(s, true), 0)).toMatchObject({ id: 'expedicao', destino: 'mapa' })
  })

  it('com reputação e sem o Golem: derrotar o Golem', () => {
    const s = comHeroi(base())
    s.niveis.bigorna = 1
    s.stats.itensForjados = 1
    s.reputacao = 20
    expect(proximoObjetivo(s, 0).id).toBe('golem')
  })

  it('expedição que voltou passa na frente de tudo', () => {
    const s = comHeroi(base())
    s.expedicoes = [{ id: 1, heroi: 1, tipo: 'trilha', inicio: 0, fim: 10 } as unknown as GameState['expedicoes'][number]]
    expect(proximoObjetivo(s, 0).id).not.toBe('coletar')
    expect(proximoObjetivo(s, 10)).toMatchObject({ id: 'coletar', destino: 'mapa' })
  })

  it('Golem caído: Forno de aço, depois as construções em ordem, e a Muralha pede a Serpe', () => {
    const s = comHeroi(base())
    s.niveis.bigorna = 1
    s.stats.itensForjados = 1
    s.chefesDerrotados = ['golem']
    expect(proximoObjetivo(s, 0).id).toBe('forno')
    s.niveis.forno = 1
    s.herois = [] // sem equipe livre, a Serpe não entra na frente
    s.stats.itensForjados = 1
    const comHeroiDeVolta = { ...s, herois: comHeroi(base()).herois, expedicoes: [{ id: 2, heroi: 1, tipo: 'trilha', inicio: 0, fim: 1e12 } as unknown as GameState['expedicoes'][number]] }
    expect(proximoObjetivo(comHeroiDeVolta, 0)).toMatchObject({ id: 'rep-segunda_fornalha', destino: 'mapa' })
    comHeroiDeVolta.reputacao = 10_000
    expect(proximoObjetivo(comHeroiDeVolta, 0)).toMatchObject({ id: 'construir-segunda_fornalha', destino: 'vilarejo' })
    comHeroiDeVolta.construcoes = CONSTRUCOES.filter((c) => c !== 'muralha')
    expect(proximoObjetivo(comHeroiDeVolta, 0).id).toBe('serpe')
    comHeroiDeVolta.chefesDerrotados = ['golem', 'serpe']
    expect(proximoObjetivo(comHeroiDeVolta, 0).id).toBe('construir-muralha')
    comHeroiDeVolta.construcoes = [...CONSTRUCOES]
    expect(proximoObjetivo(comHeroiDeVolta, 0)).toMatchObject({ id: 'reforjar', destino: 'reforjar' })
  })

  it('o texto nunca fica vazio e o progresso fica entre 0 e 1', () => {
    const s = base()
    s.moedas = 1e15
    for (let mina = 0; mina <= 6; mina++) {
      s.niveis.mina = mina
      const o = proximoObjetivo(s, 0)
      expect(o.texto.length).toBeGreaterThan(10)
      if (o.progresso !== null) {
        expect(o.progresso).toBeGreaterThanOrEqual(0)
        expect(o.progresso).toBeLessThanOrEqual(1)
      }
    }
  })
})
