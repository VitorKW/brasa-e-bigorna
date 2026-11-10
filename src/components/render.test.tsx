import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { forjar } from '../game/bigorna.ts'
import { lutarChefe } from '../game/chefe.ts'
import { partir } from '../game/expedicoes.ts'
import { equipar, recrutar } from '../game/herois.ts'
import { alocar, contratar } from '../game/ferreiros.ts'
import { estadoInicial, type GameState } from '../game/state.ts'
import { useGame } from '../store.ts'
import { BatidaModal } from './BatidaModal.tsx'
import { CombateReplay } from './CombateReplay.tsx'
import { ForgeScreen } from './ForgeScreen.tsx'
import { GuildaScreen } from './GuildaScreen.tsx'
import { MapaScreen } from './MapaScreen.tsx'
import { ResourceBar } from './ResourceBar.tsx'
import { TabBar } from './TabBar.tsx'

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
      niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 2, forno: 0 },
      recursos: { minerio: 0, carvao: 0, lingote: 20, aco: 0 },
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
      niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 0 },
      recursos: { minerio: 0, carvao: 0, lingote: 20, aco: 0 },
    }
    expect(renderToString(<BatidaModal />)).toBe('')
    s = forjar(s, 'espada', true)
    comEstado(s, { batidaAtiva: 1 })
    const html = renderToString(<BatidaModal />)
    expect(html).toContain('Dê a batida')
    expect(html).toContain('Bater')
  })
})

/** Estado de meio de jogo: 2 heróis, itens no inventário e, opcionalmente, o Golem derrotado. */
function meioDeJogo(golem = false): GameState {
  let s: GameState = {
    ...estadoInicial(0, 9),
    moedas: 1e6,
    reputacao: 150,
    niveis: { mina: 5, carvoaria: 5, fornalha: 5, bigorna: 5, forno: 0 },
    itens: [
      { id: 1, tipo: 'machado', material: 'ferro', qualidade: 'incomum', ferreiro: 'Dona Cida', valor: 37, pontuacao: 33 },
      { id: 2, tipo: 'espada', material: 'aco', qualidade: 'raro', ferreiro: 'Você', valor: 250, pontuacao: 55 },
    ],
    proximoIdItem: 3,
  }
  s = recrutar(recrutar(s, 'guerreiro'), 'guardia')
  s = equipar(s, 1, 1)
  if (golem) s = { ...s, chefesDerrotados: ['golem'] }
  return s
}

describe('render da aba Guilda', () => {
  it('sem heróis: convida a recrutar e mostra o custo', () => {
    comEstado({ ...estadoInicial(0), moedas: 10 })
    const html = renderToString(<GuildaScreen />)
    expect(html).toContain('Ninguém por aqui ainda')
    expect(html).toContain('Recrutar')
    expect(html).toContain('Guardiã')
    expect(html).toContain('Batedor')
    expect(html).toContain('disabled')
  })

  it('lista heróis com classe, nível, XP, atributos e espaços de equipamento', () => {
    comEstado(meioDeJogo())
    const html = renderToString(<GuildaScreen />)
    for (const texto of ['Bento', 'Dalva', 'XP', 'PV', 'ATQ', 'DEF', 'VEL', 'Arma', 'Escudo', 'Armadura', 'Elmo', 'Equipar']) {
      expect(html, texto).toContain(texto)
    }
    // com 2 heróis e sem Golem, a 3ª vaga espera o chefe
    expect(html).toContain('Chega ao derrotar o Golem')
  })

  it('herói em expedição não pode ser equipado', () => {
    comEstado(partir(meioDeJogo(), 1, 'trilha', 0))
    const html = renderToString(<GuildaScreen />)
    expect(html).toContain('Em expedição')
    expect(html).toContain('Em expedição: Trilha do Riacho')
  })
})

describe('render da aba Mapa', () => {
  it('mostra as duas regiões; a Serra Cinzenta fica bloqueada até o Golem', () => {
    comEstado(meioDeJogo())
    const html = renderToString(<MapaScreen />)
    for (const texto of ['Vale da Bigorna', 'Serra Cinzenta', 'Trilha do Riacho', 'Passo dos Ventos', 'Chance de sucesso', 'Mandar Bento', 'bloqueada', 'Bloqueada']) {
      expect(html, texto).toContain(texto)
    }
  })

  it('card do chefe mostra a previsão antes de lutar', () => {
    comEstado(meioDeJogo())
    const html = renderToString(<MapaScreen />)
    expect(html).toContain('Golem de Escória')
    expect(html).toContain('Previsão: a equipe recua')
    expect(html).toContain('Equipe')
  })

  it('depois do Golem a região 2 abre e o chefe aparece como derrotado', () => {
    comEstado(meioDeJogo(true))
    const html = renderToString(<MapaScreen />)
    expect(html).toContain('Derrotado')
    expect(html).not.toContain('Bloqueada')
  })

  it('expedição em andamento mostra a barra de tempo e o "volta em"', () => {
    const s = partir(meioDeJogo(), 1, 'moinho', 0)
    comEstado({ ...s, lastTick: 60_000 })
    const html = renderToString(<MapaScreen />)
    expect(html).toContain('volta em 9 min')
    expect(html).toContain('role="progressbar"')
  })

  it('expedição que voltou mostra o botão Coletar e o selo na aba', () => {
    const s = partir(meioDeJogo(), 1, 'trilha', 0)
    comEstado({ ...s, lastTick: 130_000 })
    expect(renderToString(<MapaScreen />)).toContain('Coletar')
    const abas = renderToString(<TabBar />)
    expect(abas).toContain('aba-selo')
    expect(abas).toContain('expedição voltou')
  })
})

describe('render da aba Forja depois do Golem', () => {
  it('antes do Golem não há Forno de aço', () => {
    comEstado(meioDeJogo())
    expect(renderToString(<ForgeScreen />)).not.toContain('Forno de aço')
  })

  it('depois do Golem o forno aparece por construir; a bigorna só oferece aço com o forno', () => {
    comEstado(meioDeJogo(true))
    const html = renderToString(<ForgeScreen />)
    expect(html).toContain('Construir forno')
    expect(html).not.toContain('aria-label="Material"')
    const comForno = { ...meioDeJogo(true), niveis: { ...meioDeJogo().niveis, forno: 2 } }
    comEstado(comForno)
    const html2 = renderToString(<ForgeScreen />)
    expect(html2).toContain('aria-label="Material"')
    expect(html2).toContain('Aço')
    expect(html2).toContain('Ferro')
    expect(html2).toContain('Forno de aço')
  })
})

describe('barra de recursos', () => {
  it('só mostra aço, fragmento e reputação depois que existem', () => {
    comEstado({ ...estadoInicial(0) })
    const nova = renderToString(<ResourceBar />)
    expect(nova).not.toContain('Fragmentos')
    expect(nova).not.toContain('Reputação')
    expect(nova).not.toContain('aço')
    comEstado({ ...meioDeJogo(true), fragmentos: 5, niveis: { ...meioDeJogo().niveis, forno: 1 } })
    const cheia = renderToString(<ResourceBar />)
    expect(cheia).toContain('Fragmentos rúnicos: 5')
    expect(cheia).toContain('Reputação: 150')
    expect(cheia).toContain('Lingotes de aço')
  })
})

describe('replay do combate', () => {
  it('mostra a arena, o chefe, o botão de pular e o número da rodada', () => {
    const base = meioDeJogo()
    const r = lutarChefe(base, 'golem', [1, 2])
    comEstado(base)
    const html = renderToString(
      <CombateReplay combate={{ id: 1, chefe: 'golem', resultado: r.resultado, recompensa: r.recompensa }} />,
    )
    for (const texto of ['Golem de Escória', 'Pular', 'Rodada 1', 'Bento', 'Dalva']) expect(html, texto).toContain(texto)
  })
})
