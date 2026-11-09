import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { forjar } from '../game/bigorna.ts'
import { alocar, contratar } from '../game/ferreiros.ts'
import { estadoInicial, type GameState } from '../game/state.ts'
import { useGame } from '../store.ts'
import { BatidaModal } from './BatidaModal.tsx'
import { ForgeScreen } from './ForgeScreen.tsx'

// Teste de fumaça: renderiza no servidor (sem navegador) para pegar erros de render
// e conferir os textos principais. Não substitui testar no celular.
function comEstado(jogo: GameState, extra: Partial<ReturnType<typeof useGame.getState>> = {}) {
  const novo = { jogo, resumoOffline: null, ...extra }
  useGame.setState(novo)
  // No servidor o zustand lê o estado INICIAL (getInitialState); por isso o mutamos também.
  Object.assign(useGame.getInitialState(), novo)
}

describe('render da aba Forja', () => {
  it('bigorna bloqueada mostra o custo de desbloqueio e os ferreiros', () => {
    comEstado({ ...estadoInicial(0), moedas: 0 })
    const html = renderToString(<ForgeScreen />)
    expect(html).toContain('Construir bigorna')
    expect(html).toContain('Ferreiros')
    expect(html).toContain('Contratar')
    expect(html).not.toContain('Itens forjados')
  })

  it('bigorna liberada mostra receitas, botões, automático, itens e a barra de progresso', () => {
    let s: GameState = {
      ...estadoInicial(0, 3),
      moedas: 1000,
      niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 2 },
      recursos: { minerio: 0, carvao: 0, lingote: 20 },
    }
    s = alocar(contratar(s, 'cida'), 'cida', 'bigorna')
    s = forjar(s, 'escudo')
    s = forjar(s, 'espada') // vai para a fila
    comEstado(s)
    const html = renderToString(<ForgeScreen />)
    for (const texto of ['Forjar com batida', 'Modo automático', 'Armadura', 'Escudo', 'Enfileirar', 'Fila de forja', 'Itens', 'Dona Cida', 'no posto']) {
      expect(html, texto).toContain(texto)
    }
    expect(html).toContain('role="progressbar"')
  })

  it('overlay da batida só aparece quando há uma batida ativa', () => {
    let s: GameState = {
      ...estadoInicial(0, 3),
      niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1 },
      recursos: { minerio: 0, carvao: 0, lingote: 20 },
    }
    expect(renderToString(<BatidaModal />)).toBe('')
    s = forjar(s, 'espada', true)
    comEstado(s, { batidaAtiva: 1 })
    const html = renderToString(<BatidaModal />)
    expect(html).toContain('Dê a batida')
    expect(html).toContain('Bater')
  })
})
