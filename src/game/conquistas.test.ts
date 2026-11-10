import { describe, expect, it } from 'vitest'
import { avancarBigorna, forjar, registrarBatida } from './bigorna.ts'
import { CONQUISTAS, DEF_CONQUISTA, aplicarConquistas, novasConquistas } from './conquistas.ts'
import { CONSTRUCOES } from './construcoes.ts'
import { entregar } from './encomendas.ts'
import { reforjar } from './reforjar.ts'
import { estadoInicial, type GameState } from './state.ts'
import { tick } from './tick.ts'

const H = 3_600_000

describe('lista de conquistas', () => {
  it('são de 12 a 16, cada uma com nome e descrição, e as do GDD estão lá', () => {
    expect(CONQUISTAS.length).toBeGreaterThanOrEqual(12)
    expect(CONQUISTAS.length).toBeLessThanOrEqual(16)
    for (const id of CONQUISTAS) {
      expect(DEF_CONQUISTA[id].nome.length).toBeGreaterThan(3)
      expect(DEF_CONQUISTA[id].descricao.length).toBeGreaterThan(10)
    }
    for (const id of ['primeiro_lingote', 'primeira_lendaria', 'cem_itens', 'golem', 'dez_perfeitas', 'primeiro_reforjar', 'na_hora_h'] as const) {
      expect(CONQUISTAS).toContain(id)
    }
  })

  it('um jogo novo não tem nenhuma pronta', () => {
    expect(novasConquistas(estadoInicial(0, 1))).toEqual([])
  })
})

describe('desbloqueio', () => {
  it('cada conquista vale quando o contador ou o estado chega lá', () => {
    const s = estadoInicial(0, 1)
    const com = (f: (e: GameState) => GameState) => novasConquistas(f(s))
    expect(com((e) => ({ ...e, stats: { ...e.stats, lingotesFundidos: 1 } }))).toEqual(['primeiro_lingote'])
    expect(com((e) => ({ ...e, stats: { ...e.stats, itensForjados: 99 } }))).toEqual([])
    expect(com((e) => ({ ...e, stats: { ...e.stats, itensForjados: 100 } }))).toEqual(['cem_itens'])
    expect(com((e) => ({ ...e, stats: { ...e.stats, lendariosForjados: 1 } }))).toEqual(['primeira_lendaria'])
    expect(com((e) => ({ ...e, stats: { ...e.stats, melhorSequenciaPerfeita: 9 } }))).toEqual([])
    expect(com((e) => ({ ...e, stats: { ...e.stats, melhorSequenciaPerfeita: 10 } }))).toEqual(['dez_perfeitas'])
    expect(com((e) => ({ ...e, chefesDerrotados: ['golem'] }))).toEqual(['golem'])
    expect(com((e) => ({ ...e, chefesDerrotados: ['golem', 'serpe'] }))).toEqual(expect.arrayContaining(['golem', 'serpe']))
    expect(com((e) => ({ ...e, reforjas: 1 }))).toEqual(expect.arrayContaining(['primeiro_reforjar']))
    expect(com((e) => ({ ...e, reforjas: 2 }))).toEqual(expect.arrayContaining(['primeiro_reforjar', 'dois_reforjars']))
    expect(com((e) => ({ ...e, stats: { ...e.stats, encomendasEntregues: 1 } }))).toEqual(['primeira_entrega'])
    expect(com((e) => ({ ...e, stats: { ...e.stats, encomendasEntregues: 10 } }))).toEqual(['primeira_entrega', 'dez_entregas'])
    expect(com((e) => ({ ...e, stats: { ...e.stats, entregasNaHoraH: 1 } }))).toEqual(['na_hora_h'])
    expect(com((e) => ({ ...e, reputacao: 999 }))).toEqual([])
    expect(com((e) => ({ ...e, reputacao: 1000 }))).toEqual(['reputacao_mil'])
    expect(com((e) => ({ ...e, construcoes: [...CONSTRUCOES] }))).toEqual(['todas_obras'])
    expect(com((e) => ({ ...e, niveis: { ...e.niveis, forno: 1 } }))).toEqual(['primeiro_aco'])
  })

  it('aplicar grava só o que é novo, não repete e devolve o MESMO estado sem novidade', () => {
    const s = { ...estadoInicial(0, 1), chefesDerrotados: ['golem' as const] }
    const a = aplicarConquistas(s)
    expect(a.novas).toEqual(['golem'])
    expect(a.estado.conquistas).toEqual(['golem'])
    const b = aplicarConquistas(a.estado)
    expect(b.novas).toEqual([])
    expect(b.estado).toBe(a.estado)
  })

  it('conquista desbloqueada fica, mesmo que a condição deixe de valer (o Reforjar zera as estações)', () => {
    const s = aplicarConquistas({ ...estadoInicial(0, 1), niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 3 } }).estado
    expect(s.conquistas).toContain('primeiro_aco')
    const zerado = { ...s, niveis: { ...s.niveis, forno: 0 } }
    expect(aplicarConquistas(zerado).estado.conquistas).toContain('primeiro_aco')
  })
})

describe('contadores no jogo', () => {
  const forja = (): GameState => ({
    ...estadoInicial(0, 7),
    niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 3, forno: 0 },
    recursos: { minerio: 0, carvao: 0, lingote: 100, aco: 0 },
    limiteInventario: 200,
  })

  it('a fornalha conta os lingotes fundidos e a bigorna, os itens forjados', () => {
    let s: GameState = { ...forja(), recursos: { minerio: 100, carvao: 100, lingote: 100, aco: 0 } }
    s = forjar(s, 'espada')
    s = tick(s, 15)
    expect(s.stats.lingotesFundidos).toBeGreaterThan(0)
    expect(s.stats.itensForjados).toBeGreaterThanOrEqual(1)
    expect(s.stats.forjasTotal).toBe(s.stats.itensForjados)
    expect(novasConquistas(s)).toContain('primeiro_lingote')
  })

  function forjaComBatida(s: GameState, resultado: 'perfeito' | 'bom' | 'errou' | 'automatico'): GameState {
    let e = forjar(s, 'espada', true)
    const f = e.forja!
    // posição 0.5 é "perfeito" quando o alvo está lá; para os demais resultados usa-se o campo direto
    e = { ...e, forja: { ...f, progresso: 1, minigame: 'feito', batida: resultado } }
    return avancarBigorna(e, 0.01).estado
  }

  it('sequência de batidas perfeitas: soma, "bom" e "errou" zeram, a forja automática não mexe', () => {
    let s = forja()
    for (let i = 0; i < 3; i++) s = forjaComBatida(s, 'perfeito')
    expect(s.stats.perfeitasSeguidas).toBe(3)
    s = forjaComBatida(s, 'automatico')
    expect(s.stats.perfeitasSeguidas).toBe(3)
    s = forjaComBatida(s, 'errou')
    expect(s.stats.perfeitasSeguidas).toBe(0)
    expect(s.stats.melhorSequenciaPerfeita).toBe(3)
    for (let i = 0; i < 10; i++) s = forjaComBatida(s, 'perfeito')
    expect(s.stats.melhorSequenciaPerfeita).toBe(10)
    expect(novasConquistas(s)).toContain('dez_perfeitas')
    s = forjaComBatida(s, 'bom')
    expect(s.stats.perfeitasSeguidas).toBe(0)
    expect(s.stats.melhorSequenciaPerfeita).toBe(10)
  })

  it('a porcentagem de forjas com batida só conta quem usou o minigame', () => {
    let s = forja()
    s = forjaComBatida(s, 'perfeito')
    s = forjaComBatida(s, 'automatico')
    s = forjaComBatida(s, 'bom')
    s = forjaComBatida(s, 'automatico')
    expect(s.stats.forjasTotal).toBe(4)
    expect(s.stats.forjasComBatida).toBe(2)
  })

  it('o registro da batida pelo jogador (toque) segue o mesmo caminho', () => {
    let s = forjar(forja(), 'espada', true)
    s = registrarBatida(s, s.forja!.alvo) // toque no centro da zona do alvo
    expect(s.forja!.batida).toBe('perfeito')
    s = avancarBigorna({ ...s, forja: { ...s.forja!, progresso: 1 } }, 0.01).estado
    expect(s.stats.perfeitasSeguidas).toBe(1)
  })
})

describe('os contadores sobrevivem ao Reforjar', () => {
  it('estatísticas, conquistas e opções ficam; encomendas e a espera recomeçam', () => {
    const base = estadoInicial(0, 5)
    const s: GameState = {
      ...base,
      construcoes: ['muralha'],
      moedasGanhas: 5_000_000,
      conquistas: ['golem', 'primeiro_lingote'],
      autoVenda: true,
      som: true,
      dicasVistas: ['melhorar'],
      stats: { ...base.stats, itensForjados: 321, melhorSequenciaPerfeita: 7, encomendasEntregues: 12, sessoes: 9, tempoAtivoSegundos: 4000, lingotesFundidos: 888 },
      encomendas: [
        { id: 1, npc: 'amaro', tipo: 'espada', material: 'ferro', qualidade: 'comum', quantidade: 1, criada: 0, prazo: 10 * H, recompensa: 37, reputacao: 10 },
      ],
      proximaEncomenda: 5 * H,
    }
    const novo = reforjar(s, 0)
    expect(novo).not.toBe(s)
    expect(novo.stats).toEqual(s.stats)
    expect(novo.conquistas).toEqual(s.conquistas)
    expect(novo.autoVenda).toBe(true)
    expect(novo.som).toBe(true)
    expect(novo.dicasVistas).toEqual(['melhorar'])
    expect(novo.encomendas).toEqual([])
    expect(novo.proximaEncomenda).toBe(0)
    expect(novo.reforjas).toBe(1)
    expect(aplicarConquistas(novo).novas).toContain('primeiro_reforjar')
  })
})

describe('entrega e conquistas', () => {
  it('a primeira entrega e a "na hora H" saem juntas quando é de última hora', () => {
    const s: GameState = {
      ...estadoInicial(0, 5),
      itens: [{ id: 1, tipo: 'escudo', material: 'ferro', qualidade: 'comum', ferreiro: 'Você', valor: 30, pontuacao: 10 }],
      encomendas: [
        { id: 1, npc: 'tonico', tipo: 'escudo', material: 'ferro', qualidade: 'comum', quantidade: 1, criada: 0, prazo: 3 * H, recompensa: 45, reputacao: 10 },
      ],
    }
    const r = entregar(s, 1, 3 * H - 30_000)
    expect(aplicarConquistas(r.estado).novas).toEqual(['primeira_entrega', 'na_hora_h'])
  })
})
