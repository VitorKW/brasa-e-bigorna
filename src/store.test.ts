import { beforeEach, describe, expect, it } from 'vitest'
import { valorItem, type Item } from './game/items.ts'
import { estadoInicial, type GameState } from './game/state.ts'
import { useGame } from './store.ts'

// A store liga as regras ao relógio e à UI. Aqui só se confere a cola: entrega, aviso de conquista e opções.
const H = 3_600_000

const espada = (id: number): Item => ({
  id,
  tipo: 'espada',
  material: 'ferro',
  qualidade: 'incomum',
  ferreiro: 'Você',
  valor: valorItem('espada', 'ferro', 'incomum'),
  pontuacao: 40,
})

function comecar(extra: Partial<GameState> = {}): void {
  const agora = Date.now()
  useGame.setState({
    jogo: { ...estadoInicial(agora, 11), niveis: { mina: 3, carvoaria: 3, fornalha: 3, bigorna: 2, forno: 0 }, ...extra },
    avisoConquistas: [],
    ultimaEntrega: null,
    ultimoGanho: null,
    resumoOffline: null,
  })
}

describe('store: encomendas', () => {
  beforeEach(() => comecar())

  it('entregar paga, gasta os itens e avisa a UI (os números sobem na barra)', () => {
    const agora = Date.now()
    comecar({
      itens: [espada(1), espada(2), espada(3)],
      proximoIdItem: 4,
      encomendas: [
        { id: 1, npc: 'amaro', tipo: 'espada', material: 'ferro', qualidade: 'incomum', quantidade: 2, criada: agora, prazo: agora + 3 * H, recompensa: 112.5, reputacao: 21 },
      ],
      proximoIdEncomenda: 2,
    })
    useGame.getState().entregarEncomenda(1)
    const s = useGame.getState()
    expect(s.jogo.itens).toHaveLength(1)
    expect(s.jogo.moedas).toBeCloseTo(10 + 112.5, 6)
    expect(s.jogo.reputacao).toBe(21)
    expect(s.jogo.encomendas).toHaveLength(0)
    expect(s.ultimaEntrega?.entrega.npc).toBe('amaro')
    expect(s.ultimoGanho?.valor).toBeCloseTo(112.5, 6)
  })

  it('pedido vencido ou sem itens não faz nada', () => {
    const agora = Date.now()
    const vencida = { id: 1, npc: 'amaro' as const, tipo: 'espada' as const, material: 'ferro' as const, qualidade: 'incomum' as const, quantidade: 1, criada: agora - 5 * H, prazo: agora - H, recompensa: 50, reputacao: 10 }
    comecar({ itens: [espada(1)], encomendas: [vencida] })
    const antes = useGame.getState().jogo
    useGame.getState().entregarEncomenda(1)
    expect(useGame.getState().jogo).toBe(antes)
    expect(useGame.getState().ultimaEntrega).toBeNull()
  })
})

describe('store: conquistas e opções', () => {
  beforeEach(() => comecar())

  it('um tick que cumpre a condição desbloqueia, avisa uma vez e não repete', () => {
    const agora = Date.now()
    comecar({ chefesDerrotados: ['golem'], lastTick: agora - 200 })
    useGame.getState().avancar(agora)
    let s = useGame.getState()
    expect(s.jogo.conquistas).toContain('golem')
    expect(s.avisoConquistas).toContain('golem')
    const quantos = s.avisoConquistas.length
    useGame.getState().avancar(agora + 200)
    s = useGame.getState()
    expect(s.avisoConquistas).toHaveLength(quantos)
    useGame.getState().fecharAvisoConquistas()
    expect(useGame.getState().avisoConquistas).toEqual([])
  })

  it('o tick normal soma o tempo de sessão; o salto offline não', () => {
    const agora = Date.now()
    comecar({ lastTick: agora - 200 })
    useGame.getState().avancar(agora)
    expect(useGame.getState().jogo.stats.tempoAtivoSegundos).toBeCloseTo(0.2, 3)
    const antes = useGame.getState().jogo.stats.tempoAtivoSegundos
    useGame.getState().avancar(agora + 2 * H) // voltou depois de 2 h: é offline
    const s = useGame.getState()
    expect(s.jogo.stats.tempoAtivoSegundos).toBe(antes)
    expect(s.jogo.stats.sessoes).toBe(1) // 0 do estado inicial + a volta de 2 h
  })

  it('venda automática, som e dicas', () => {
    expect(useGame.getState().jogo.autoVenda).toBe(false)
    expect(useGame.getState().jogo.som).toBe(false)
    useGame.getState().alternarAutoVenda()
    expect(useGame.getState().jogo.autoVenda).toBe(true)
    useGame.getState().alternarAutoVenda()
    expect(useGame.getState().jogo.autoVenda).toBe(false)
    useGame.getState().alternarSom() // sem Web Audio no Node: só liga a opção, sem erro
    expect(useGame.getState().jogo.som).toBe(true)
    useGame.getState().dispensarDica('melhorar')
    useGame.getState().dispensarDica('melhorar')
    expect(useGame.getState().jogo.dicasVistas).toEqual(['melhorar'])
  })

  it('uma encomenda surge sozinha quando a bigorna existe', () => {
    const agora = Date.now()
    comecar({ lastTick: agora - 200 })
    useGame.getState().avancar(agora)
    expect(useGame.getState().jogo.encomendas).toHaveLength(1)
  })
})
