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
import { ReforjarScreen } from './ReforjarScreen.tsx'
import { VilarejoScreen } from './VilarejoScreen.tsx'
import { AvisoAtualizacao } from './AvisoAtualizacao.tsx'
import { ConquistasSheet } from './ConquistasSheet.tsx'
import { EncomendasPanel } from './EncomendasPanel.tsx'
import { ItensPanel } from './ItensPanel.tsx'
import { OfflineModal } from './OfflineModal.tsx'
import { ToastConquista } from './ToastConquista.tsx'
import { applyOffline } from '../game/offline.ts'
import type { Encomenda } from '../game/encomendas.ts'

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
    comEstado({ ...estadoInicial(0), moedas: 0 }, { subForja: 'bigorna' })
    const html = renderToString(<ForgeScreen />)
    expect(html).toContain('Construir bigorna')
    expect(html).not.toContain('Itens forjados')
    comEstado({ ...estadoInicial(0), moedas: 0 }, { subForja: 'ferreiros' })
    const ferreiros = renderToString(<ForgeScreen />)
    expect(ferreiros).toContain('Ferreiros')
    expect(ferreiros).toContain('Contratar')
  })

  it('as sub-abas separam produção, bigorna e ferreiros', () => {
    comEstado({ ...estadoInicial(0), moedas: 0 }, { subForja: 'producao' })
    const html = renderToString(<ForgeScreen />)
    for (const t of ['Produção', 'Bigorna', 'Ferreiros', 'Mina', 'Fornalha']) expect(html, t).toContain(t)
    expect(html).not.toContain('Construir bigorna')
    expect(html).not.toContain('Contratar')
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
    comEstado(s, { subForja: 'bigorna' })
    const html = renderToString(<ForgeScreen />)
    for (const texto of ['Forjar com batida', 'Modo automático', 'Armadura', 'Escudo', 'Enfileirar', 'Fila de forja', 'Itens']) {
      expect(html, texto).toContain(texto)
    }
    comEstado(s, { subForja: 'ferreiros' })
    const ferreiros = renderToString(<ForgeScreen />)
    for (const texto of ['Dona Cida', 'no posto']) expect(ferreiros, texto).toContain(texto)
    comEstado(s, { subForja: 'bigorna' })
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

  it('lista heróis com classe, nível, XP, poder e espaços de equipamento', () => {
    comEstado(meioDeJogo())
    const html = renderToString(<GuildaScreen />)
    for (const texto of ['Bento', 'Dalva', 'XP', 'Poder', 'Arma:', 'Escudo:', 'Armadura:', 'Elmo:', 'Equipar']) {
      expect(html, texto).toContain(texto)
    }
    // com 2 heróis e sem Golem, a 3ª vaga espera o chefe
    expect(html).toContain('Chega ao derrotar o Golem')
  })

  it('herói em expedição não pode ser equipado', () => {
    comEstado(partir(meioDeJogo(), 1, 'trilha', 0))
    const html = renderToString(<GuildaScreen />)
    expect(html).toContain('Em expedição: Trilha do Riacho')
    expect(html).not.toContain('aria-label="Equipar Bento"')
  })
})

describe('render da aba Mapa', () => {
  it('mostra as duas regiões; a Serra Cinzenta fica bloqueada até o Golem', () => {
    comEstado(meioDeJogo())
    const html = renderToString(<MapaScreen />)
    for (const texto of ['Vale da Bigorna', 'Serra Cinzenta', 'Trilha do Riacho', 'Chance de sucesso', 'Mandar Bento', 'bloqueada']) {
      expect(html, texto).toContain(texto)
    }
  })

  it('card do chefe mostra a previsão antes de lutar', () => {
    comEstado(meioDeJogo())
    const html = renderToString(<MapaScreen />)
    expect(html).toContain('Golem de Escória')
    expect(html).toContain('Previsão: a equipe perde')
    expect(html).toContain('Equipe')
  })

  it('depois do Golem a região 2 abre e o chefe aparece como derrotado', () => {
    comEstado(meioDeJogo(true))
    const html = renderToString(<MapaScreen />)
    // abre direto na região mais longe já alcançada
    expect(html).toContain('Passo dos Ventos')
    expect(html).toContain('Serpe de Cinza')
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
    comEstado(meioDeJogo(), { subForja: 'producao' })
    expect(renderToString(<ForgeScreen />)).not.toContain('Forno de aço')
  })

  it('depois do Golem o forno aparece por construir; a bigorna só oferece aço com o forno', () => {
    comEstado(meioDeJogo(true), { subForja: 'producao' })
    expect(renderToString(<ForgeScreen />)).toContain('Construir forno')
    comEstado(meioDeJogo(true), { subForja: 'bigorna' })
    const html = renderToString(<ForgeScreen />)
    expect(html).not.toContain('aria-label="Material"')
    const comForno = { ...meioDeJogo(true), niveis: { ...meioDeJogo().niveis, forno: 2 } }
    comEstado(comForno, { subForja: 'bigorna' })
    const html2 = renderToString(<ForgeScreen />)
    expect(html2).toContain('aria-label="Material"')
    expect(html2).toContain('Aço')
    expect(html2).toContain('Ferro')
    comEstado(comForno, { subForja: 'producao' })
    expect(renderToString(<ForgeScreen />)).toContain('Forno de aço')
  })
})

describe('barra de recursos', () => {
  it('mostra só o que importa na aba: matéria-prima na Forja, reputação e fragmentos fora dela', () => {
    comEstado({ ...estadoInicial(0) }, { aba: 'forja' })
    const nova = renderToString(<ResourceBar />)
    expect(nova).not.toContain('Fragmentos')
    expect(nova).not.toContain('Reputação')
    expect(nova).not.toContain('aço')
    const avancado = { ...meioDeJogo(true), fragmentos: 5, niveis: { ...meioDeJogo().niveis, forno: 1 } }
    comEstado(avancado, { aba: 'forja' })
    const forja = renderToString(<ResourceBar />)
    expect(forja).toContain('Lingotes de aço')
    expect(forja).not.toContain('Reputação')
    comEstado(avancado, { aba: 'mapa' })
    const mapa = renderToString(<ResourceBar />)
    expect(mapa).toContain('Fragmentos rúnicos: 5')
    expect(mapa).toContain('Reputação: 150')
    expect(mapa).not.toContain('Minério')
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

/** renderToString separa textos vizinhos com comentários do React; aqui tiramos para comparar frases. */
const html = (el: React.ReactElement): string => renderToString(el).replace(/<!-- -->/g, '')

describe('aba Vilarejo', () => {
  it('lista as 5 construções com o efeito, a reputação que falta e o espaço das encomendas', () => {
    comEstado({ ...meioDeJogo(), reputacao: 60 })
    const saida = html(<VilarejoScreen />)
    for (const texto of ['Segunda fornalha', 'Armazém', 'Taverna', 'Mercado', 'Muralha', 'Fornalha 50 % mais rápida', '/150 de reputação', 'Encomendas', 'Nenhum pedido agora']) {
      expect(saida, texto).toContain(texto)
    }
    expect(saida).toContain('não se gasta')
  })

  it('com reputação e moedas o botão de construir fica ativo; sem moedas, não', () => {
    comEstado({ ...meioDeJogo(), reputacao: 60, moedas: 1e9 })
    const ativo = html(<VilarejoScreen />)
    expect(ativo).toContain('aria-label="Construir Segunda fornalha por 3 K moedas"')
    expect(ativo).not.toMatch(/aria-label="Construir Segunda fornalha[^>]*disabled/)
    comEstado({ ...meioDeJogo(), reputacao: 60, moedas: 5 })
    expect(html(<VilarejoScreen />)).toMatch(/disabled=""[^>]*aria-label="Construir Segunda fornalha|aria-label="Construir Segunda fornalha[^>]*disabled=""/)
  })

  it('construída aparece como tal; a Muralha pede a Serpe', () => {
    comEstado({ ...meioDeJogo(true), reputacao: 1500, construcoes: ['armazem'] })
    const saida = html(<VilarejoScreen />)
    expect(saida).toContain('aria-label="Construídas"')
    expect(saida).toContain('Armazém')
    expect(saida).toContain('Antes, derrote Serpe de Cinza no Mapa.')
  })
})

describe('aba Reforjar', () => {
  it('trancada até a Muralha: explica o que falta; a árvore só aparece com brasa', () => {
    comEstado(meioDeJogo(true))
    const semBrasa = html(<ReforjarScreen />)
    expect(semBrasa).toContain('Talentos')
    expect(semBrasa).not.toContain('Fornalheiro')
    comEstado({ ...meioDeJogo(true), brasas: 1 })
    const saida = html(<ReforjarScreen />)
    for (const texto of ['trancado', 'Derrotar a Serpe de Cinza', 'Construir a Muralha', 'Talentos', 'Fornalheiro', 'Mestre de forja', 'Capitão da guilda']) {
      expect(saida, texto).toContain(texto)
    }
    expect(saida).not.toContain('Preparar o Reforjar')
    expect(html(<TabBar />)).toContain('trancada')
  })

  it('com a Muralha: prévia com brasas, o que perde e o que fica, e confirmação em dois passos', () => {
    comEstado({ ...meioDeJogo(true), construcoes: ['muralha'], moedasGanhas: 64e6 })
    const saida = html(<ReforjarScreen />)
    for (const texto of ['Prévia do Reforjar', '+8', 'O que se perde', 'O que fica', 'Preparar o Reforjar', 'Brasas Ancestrais e talentos']) {
      expect(saida, texto).toContain(texto)
    }
    // o botão de segurar só aparece depois do primeiro passo
    expect(saida).not.toContain('Segurar para Reforjar')
    expect(html(<TabBar />)).not.toContain('trancada')
  })

  it('sem brasas para ganhar, o botão fica desligado e o motivo aparece', () => {
    comEstado({ ...meioDeJogo(true), construcoes: ['muralha'], moedasGanhas: 10 })
    const saida = html(<ReforjarScreen />)
    expect(saida).toContain('ainda não rende nenhuma brasa')
    expect(saida).toMatch(/disabled=""[^>]*>Preparar o Reforjar/)
  })

  it('12 talentos: custos 1, 2, 3 e 5 e pré-requisito visível', () => {
    comEstado({ ...meioDeJogo(true), brasas: 3 })
    const saida = html(<ReforjarScreen />)
    for (const nome of ['Foles novos', 'Sono tranquilo', 'Veios generosos', 'Fogo ancestral', 'Mão firme', 'Bigorna de herança', 'Escola de ofício', 'Obra-prima', 'Bandeira da guilda', 'Quinto herói', 'Rota segura', 'Vigias da noite']) {
      expect(saida, nome).toContain(nome)
    }
    expect(saida).toContain('Exige Foles novos.')
    expect(saida).toContain('aria-label="Aprender Foles novos por 1 brasa"')
    expect(saida).toContain('aria-label="Aprender Fogo ancestral por 5 brasas"')
  })

  it('talento comprado aparece como aprendido', () => {
    comEstado({ ...meioDeJogo(true), talentos: ['fornalheiro_1'], reforjas: 1 })
    expect(html(<ReforjarScreen />)).toContain('Aprendido')
  })
})

describe('Serpe de Cinza no Mapa', () => {
  it('só aparece com a Serra aberta, com previsão e a recompensa', () => {
    comEstado(meioDeJogo())
    expect(html(<MapaScreen />)).not.toContain('Serpe de Cinza')
    comEstado(meioDeJogo(true))
    const saida = html(<MapaScreen />)
    for (const texto of ['Serpe de Cinza', 'Faltariam', 'a Muralha e o Reforjar', 'Tentar assim mesmo']) {
      expect(saida, texto).toContain(texto)
    }
    expect(saida).toContain('Previsão: a equipe perde.')
  })
})

describe('brasas na barra de recursos', () => {
  it('só aparecem depois da primeira brasa', () => {
    comEstado(meioDeJogo(), { aba: 'reforjar' })
    expect(html(<ResourceBar />)).not.toContain('Brasas Ancestrais')
    comEstado({ ...meioDeJogo(), brasas: 7 }, { aba: 'reforjar' })
    expect(html(<ResourceBar />)).toContain('Brasas Ancestrais: 7')
  })
})

const pedidoAberto = (o: Partial<Encomenda> = {}): Encomenda => ({
  id: 1,
  npc: 'amaro',
  tipo: 'espada',
  material: 'ferro',
  qualidade: 'incomum',
  quantidade: 1,
  criada: 0,
  prazo: 3 * 3_600_000,
  recompensa: 56.25,
  reputacao: 14,
  ...o,
})

describe('Encomendas no Vilarejo', () => {
  it('sem bigorna os moradores esperam; com bigorna e sem pedido, avisa quanto falta', () => {
    comEstado({ ...estadoInicial(0, 1), niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 0, forno: 0 } })
    expect(html(<EncomendasPanel />)).toContain('só batem à porta quando a bigorna estiver de pé')
    comEstado({ ...meioDeJogo(), proximaEncomenda: 20 * 60_000 })
    expect(html(<EncomendasPanel />)).toContain('Alguém deve aparecer em uns 20 min')
  })

  it('cartão com morador, fala, pedido, prazo, pagamento e botão de entregar', () => {
    comEstado({ ...meioDeJogo(), encomendas: [pedidoAberto()] })
    const saida = html(<EncomendasPanel />)
    for (const texto of ['Sargento Amaro', 'sargento da guarda', '1 espada de ferro, incomum ou melhor', 'Vence em 3 h', 'No inventário: 1/1', 'Entregar', '1/3']) {
      expect(saida, texto).toContain(texto)
    }
    expect(saida).toContain('aria-label="Entregar a encomenda de Sargento Amaro"')
    expect(saida).not.toMatch(/disabled=""[^>]*aria-label="Entregar/)
  })

  it('sem os itens, o botão fica desligado e diz o que falta', () => {
    comEstado({ ...meioDeJogo(), encomendas: [pedidoAberto({ quantidade: 3 })] })
    const saida = html(<EncomendasPanel />)
    expect(saida).toContain('Faltam itens')
    expect(saida).toContain('No inventário: 1/3')
    expect(saida).toMatch(/disabled=""[^>]*aria-label="Entregar a encomenda de Sargento Amaro"|aria-label="Entregar a encomenda de Sargento Amaro"[^>]*disabled=""/)
  })

  it('pedido vencido mostra "Venceu" e não deixa entregar', () => {
    comEstado({ ...meioDeJogo(), lastTick: 5 * 3_600_000, encomendas: [pedidoAberto()] })
    const saida = html(<EncomendasPanel />)
    expect(saida).toContain('Venceu')
    expect(saida).toContain('Faltam itens')
  })

  it('a dica das encomendas aparece uma vez e some depois de dispensada', () => {
    comEstado({ ...meioDeJogo(), encomendas: [pedidoAberto()] })
    expect(html(<EncomendasPanel />)).toContain('Entendi')
    comEstado({ ...meioDeJogo(), encomendas: [pedidoAberto()], dicasVistas: ['encomendas'] })
    expect(html(<EncomendasPanel />)).not.toContain('Entendi')
  })
})

describe('Conquistas e ajustes', () => {
  it('a Guilda tem o botão com a contagem', () => {
    comEstado({ ...meioDeJogo(), conquistas: ['golem', 'primeiro_lingote'] })
    const saida = html(<GuildaScreen />)
    expect(saida).toContain('Conquistas e ajustes')
    expect(saida).toContain('aria-label="Conquistas e ajustes, 2 de 16"')
  })

  it('a folha lista todas, marca as feitas e esconde as estatísticas até pedir', () => {
    comEstado({ ...meioDeJogo(), conquistas: ['golem'] })
    const saida = html(<ConquistasSheet onFechar={() => undefined} />)
    for (const texto of ['Conquistas', '1/16', 'Golem derrotado', 'Primeiro lingote', 'Primeira lendária', 'Primeiro Reforjar', 'Na hora H', 'Ajustes', 'Som', 'ligado', 'role="dialog"']) {
      expect(saida, texto).toContain(texto)
    }
    expect(saida).toContain('aria-label="Golem derrotado: desbloqueada"')
    expect(saida).toContain('aria-label="Primeiro lingote: bloqueada"')
    expect(saida).toContain('aria-expanded="false"')
    expect(saida).not.toContain('Forjas com a batida')
  })

  it('o aviso de conquista fica no ar com texto acessível', () => {
    comEstado(meioDeJogo(), { avisoConquistas: ['golem', 'serpe'] })
    const saida = html(<ToastConquista />)
    expect(saida).toContain('aria-live="polite"')
    expect(saida).toContain('Conquista: Golem derrotado')
    expect(saida).toContain('E mais 1.')
    comEstado(meioDeJogo(), { avisoConquistas: [] })
    expect(html(<ToastConquista />)).not.toContain('Conquista:')
  })
})

describe('venda automática e primeira experiência', () => {
  it('o interruptor mostra o estado e a dica aparece quando o inventário está enchendo', () => {
    comEstado({ ...meioDeJogo(), autoVenda: false })
    const desligada = html(<ItensPanel />)
    expect(desligada).toContain('role="switch"')
    expect(desligada).toContain('aria-checked="false"')
    expect(desligada).toContain('Venda automática')
    expect(desligada).not.toContain('Ligue a venda automática') // 2 de 30 itens: ainda cabe
    comEstado({ ...meioDeJogo(), autoVenda: false, limiteInventario: 1 })
    expect(html(<ItensPanel />)).toContain('Ligue a venda automática')
    comEstado({ ...meioDeJogo(), autoVenda: true })
    expect(html(<ItensPanel />)).toContain('aria-checked="true"')
  })

  it('a primeira tela convida a tocar na cena, e o convite some depois do primeiro toque', () => {
    comEstado(estadoInicial(0, 1), { subForja: 'producao' })
    expect(html(<ForgeScreen />)).toContain('Toque para cavar')
    comEstado({ ...estadoInicial(0, 1), dicasVistas: ['cena'] }, { subForja: 'producao' })
    expect(html(<ForgeScreen />)).not.toContain('Toque para cavar')
  })

  it('o resumo offline conta o que a venda automática vendeu e oferece ligá-la quando o inventário travou', () => {
    const base: GameState = {
      ...estadoInicial(0, 3),
      niveis: { mina: 5, carvoaria: 5, fornalha: 5, bigorna: 3, forno: 0 },
      recursos: { minerio: 1e4, carvao: 1e4, lingote: 1e3, aco: 0 },
      automatico: true,
      ultimaReceita: 'espada',
      limiteInventario: 4,
    }
    const com = applyOffline({ ...base, autoVenda: true }, 3600 * 1000)
    comEstado(com.estado)
    expect(html(<OfflineModal resumo={com.resumo} onFechar={() => undefined} />)).toContain('A venda automática vendeu')
    const sem = applyOffline({ ...base, autoVenda: false }, 3600 * 1000)
    comEstado(sem.estado)
    const saida = html(<OfflineModal resumo={sem.resumo} onFechar={() => undefined} />)
    expect(saida).toContain('O inventário encheu')
    expect(saida).toContain('Ligar a venda automática')
  })
})

describe('aviso de nova versão', () => {
  it('pergunta se quer recarregar e é um alerta para leitores de tela', () => {
    const saida = html(<AvisoAtualizacao onRecarregar={() => undefined} onDepois={() => undefined} />)
    expect(saida).toContain('Nova versão. Recarregar?')
    expect(saida).toContain('role="alert"')
    expect(saida).toContain('Recarregar</button>')
    expect(saida).toContain('Depois</button>')
  })
})

describe('cena viva da forja', () => {
  it('mostra as 4 estações tocáveis; sem bigorna ela aparece trancada', () => {
    comEstado({ ...estadoInicial(0) }, { subForja: 'producao' })
    const saida = renderToString(<ForgeScreen />)
    for (const t of ['Tocar na mina', 'Tocar na carvoaria', 'Tocar na fornalha', 'Bigorna: ainda não construída']) {
      expect(saida, t).toContain(t)
    }
    expect(saida).toContain('class="cena"')
  })

  it('com a bigorna de pé e o ferreiro no posto, ele aparece ao lado dela', () => {
    let s: GameState = { ...estadoInicial(0, 3), niveis: { mina: 1, carvoaria: 1, fornalha: 1, bigorna: 1, forno: 0 } }
    s = alocar(contratar({ ...s, moedas: 1e6 }, 'cida'), 'cida', 'bigorna')
    comEstado(s, { subForja: 'producao' })
    const saida = renderToString(<ForgeScreen />)
    expect(saida).toContain('Tocar na bigorna')
    expect(saida).toContain('cena-ferreiro')
  })
})

describe('evolução visível', () => {
  it('a estação troca de nome a cada marco e avisa o próximo', () => {
    const s = estadoInicial(0)
    comEstado({ ...s, niveis: { ...s.niveis, mina: 12, carvoaria: 30, fornalha: 100 } }, { subForja: 'producao' })
    const saida = renderToString(<ForgeScreen />)
    expect(saida).toContain('Mina escorada')
    expect(saida).toContain('Carvoaria cintada')
    expect(saida).toContain('Alto-forno')
    expect(saida).toContain('Nível 25: produção x2 e melhoria visual.')
  })

  it('a bigorna também evolui de nome', () => {
    const s = estadoInicial(0)
    comEstado({ ...s, niveis: { ...s.niveis, bigorna: 50 } }, { subForja: 'bigorna' })
    expect(renderToString(<ForgeScreen />)).toContain('Bigorna de pedra')
  })
})

describe('vilarejo vivo', () => {
  it('a cena mostra os lotes vazios e, depois, as obras construídas e a muralha', () => {
    comEstado({ ...meioDeJogo(true), construcoes: [] })
    const vazio = html(<VilarejoScreen />)
    expect(vazio).toContain('Lote da obra Taverna, ainda por construir')
    expect(vazio).not.toContain('vila-muralha')
    comEstado({ ...meioDeJogo(true), construcoes: ['taverna', 'muralha'] })
    const cheio = html(<VilarejoScreen />)
    expect(cheio).toContain('Taverna, construída')
    expect(cheio).toContain('vila-muralha')
    expect(cheio).toContain('Lote da obra Mercado, ainda por construir')
  })

  it('quem tem encomenda aberta anda pela estrada', () => {
    comEstado({ ...meioDeJogo(), encomendas: [pedidoAberto()] })
    expect(html(<VilarejoScreen />)).toContain('Sargento Amaro, com uma encomenda')
  })
})

describe('botão de som', () => {
  it('fica na barra de recursos e reflete a opção', () => {
    comEstado({ ...estadoInicial(0), som: true })
    expect(html(<ResourceBar />)).toMatch(/role="switch" aria-checked="true" aria-label="Som"/)
    comEstado({ ...estadoInicial(0), som: false })
    expect(html(<ResourceBar />)).toMatch(/role="switch" aria-checked="false" aria-label="Som"/)
  })
})
