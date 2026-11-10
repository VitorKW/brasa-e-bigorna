// Simulador de ritmo (GDD §4.4). Puro: sem relógio, sem I/O. A tabela é
// impressa por scripts/sim.ts; os testes de ritmo chamam simular() direto.
//
// Estratégia gulosa: a cada instante compra a melhor opção em (ganho de renda / custo),
// entre upgrades das estações e a contratação de ferreiros; a bigorna roda em modo
// automático com a receita de melhor valor por segundo; itens e excedentes são vendidos.
// O minigame NÃO é usado (o sim joga o caminho automático, o pior caso do GDD §9).
//
// Fatia 3: o sim também poupa e contrata o primeiro herói, guarda e equipa os melhores itens,
// manda expedições (a de melhor valor por hora com chance >= 70 %), luta com o Golem quando a
// previsão diz vitória, compra o Forno de aço e passa a forjar em aço quando há lingotes dele.
//
// Fatia 4: o sim também constrói o vilarejo (reputação + moedas), derrota a Serpe, Reforja e compra
// talentos numa lista fixa de prioridade. Com `opcoes.padrao` ele joga DIAS, não só horas: o jogador
// tem sessões ativas curtas, o resto do tempo é offline (com o teto real) e há 8 h de sono por dia.
import { taxas } from './chain.ts'
import {
  ESTACOES,
  OFFLINE,
  PRECO_VENDA,
  RECEITA_ACO,
  RECEITA_LINGOTE,
  type EstacaoId,
  type EstacaoProducao,
} from './constants.ts'
import { estoqueDe, faixaQ, tempoForjaAtual, valorEsperadoItem } from './bigorna.ts'
import { bonusExpedicao } from './bonus.ts'
import { chefeDerrotado, chefeDisponivel, lutarChefe, preverChefe, type ChefeId } from './chefe.ts'
import { CONSTRUCOES, DEF_CONSTRUCAO, construcaoLiberada, construir, temConstrucao, type ConstrucaoId } from './construcoes.ts'
import { comprarUpgrade, custoProximoNivel, estacaoLiberada, vender } from './economy.ts'
import { avancarEncomendas, entregar, itemServe, motivoNaoEntregar } from './encomendas.ts'
import {
  DEF_EXPEDICAO,
  EXPEDICOES,
  coletarTodas,
  expedicaoLiberada,
  partir,
  preverExpedicao,
  type ExpedicaoId,
} from './expedicoes.ts'
import {
  FERREIROS,
  FERREIROS_DEF,
  contratar,
  custoContratar,
  type FerreiroId,
} from './ferreiros.ts'
import {
  CLASSES,
  DEF_CLASSE,
  RECRUTAMENTO,
  emExpedicao,
  equipar,
  poderHeroi,
  proximaVaga,
  recrutar,
  type ClasseId,
} from './herois.ts'
import { venderInuteis } from './inventario.ts'
import {
  MATERIAIS,
  QUALIDADES,
  RECEITAS,
  SLOTS,
  SLOT_DO_TIPO,
  TIPOS_ITEM,
  atributosItem,
  poderDe,
  qualidadeDe,
  type Item,
  type MaterialId,
  type Qualidade,
  type ReceitaId,
} from './items.ts'
import { applyOffline } from './offline.ts'
import { brasasDoCiclo, moedasDoCicloComPendentes, motivoNaoReforjar, reforjar } from './reforjar.ts'
import { estadoInicial, type GameState } from './state.ts'
import { comprarTalento, type TalentoId } from './talentos.ts'
import { tickDetalhado, type ResultadoTick } from './tick.ts'

export interface Compra {
  t: number
  tipo: 'upgrade' | 'ferreiro' | 'heroi' | 'forno' | 'construcao' | 'talento'
  /** Estação (upgrade) ou id do ferreiro. */
  alvo: string
  nivel: number
  custo: number
}

type PorQualidade = Record<Qualidade, number>
const zeroQualidades = (): PorQualidade => Object.fromEntries(QUALIDADES.map((q) => [q, 0])) as PorQualidade
const nuloQualidades = (): Record<Qualidade, number | null> =>
  Object.fromEntries(QUALIDADES.map((q) => [q, null])) as Record<Qualidade, number | null>

export interface ResultadoSim {
  horas: number
  compras: Compra[]
  primeiraCompra: number | null
  /** Primeiro instante em que cada estação de produção chegou ao nível 10. */
  nivel10: Record<EstacaoProducao, number | null>
  /** Maior intervalo entre compras consecutivas (inclui o intervalo final até o fim da sim). */
  maiorIntervaloEntreCompras: { duracao: number; inicio: number }
  /** Maior período seguido com moedas < a opção mais barata (upgrade ou ferreiro). */
  maiorIntervaloSemComprar: { duracao: number; inicio: number }
  /** Moedas/s de venda, média do minuto que termina em cada marco. */
  moedasPorSegundo: { rotulo: string; t: number; valor: number | null }[]
  niveisFinais: Record<EstacaoId, number>
  /** Maior valor numérico visto (monitor do limite de 1e15, GDD §4.5). */
  maiorValor: number
  bigornaDesbloqueada: number | null
  /** Primeira vez que saiu um item de cada qualidade (qualquer material). */
  primeiraQualidade: Record<Qualidade, number | null>
  /** Idem, só itens de ferro e só itens de aço. */
  primeiraQualidadePorMaterial: Record<MaterialId, Record<Qualidade, number | null>>
  primeiroFerreiro: number | null
  itensForjados: number
  itensPorQualidade: Record<Qualidade, number>
  itensPorMaterial: Record<MaterialId, PorQualidade>
  ferreirosFinais: { id: FerreiroId; nivel: number; estacao: EstacaoId | null }[]

  // Fatia 3
  primeiroHeroi: number | null
  segundoHeroi: number | null
  terceiroHeroi: number | null
  primeiraExpedicao: number | null
  golemDerrotado: number | null
  fornoComprado: number | null
  primeiroAco: number | null
  expedicoes: { enviadas: number; sucessos: number; falhas: number }
  reputacaoFinal: number
  fragmentosFinais: number
  heroisFinais: { nome: string; classe: ClasseId; nivel: number; poder: number }[]
  /** Quantas vezes a previsão disse "vitória" (só uma, porque a sim luta na hora). */
  rodadasDoGolem: number | null

  // Fatia 4
  quartoHeroi: number | null
  serpeDerrotada: number | null
  rodadasDaSerpe: number | null
  /** Quando cada construção saiu (primeira vez). */
  construcoes: Record<ConstrucaoId, number | null>
  /** Quando a reputação passou de cada marco (150, 400, 650, 1000). */
  reputacaoMarcos: { minimo: number; t: number | null }[]
  reforjas: ReforjaSim[]
  /** Moedas ganhas acumuladas (todos os ciclos) ao fim de cada dia completo. */
  moedasPorDia: number[]
  talentosFinais: TalentoId[]
  brasasFinais: number
  /** Moedas do ciclo atual a cada 6 h de jogo (t em segundos desde o começo da sim). */
  serieMoedas: { t: number; ciclo: number; moedasDoCiclo: number }[]
  // Fatia 5
  encomendas: { entregues: number; expiradas: number; reputacao: number }
  /** O estado ao fim da sim (para testes e diagnóstico). */
  estadoFinal: GameState
}

/** Um Reforjar feito pelo sim. */
export interface ReforjaSim {
  t: number
  brasas: number
  moedasDoCiclo: number
  /** Duração do ciclo que terminou (desde o começo do jogo ou do Reforjar anterior). */
  duracaoCiclo: number
  /** Talentos comprados logo depois. */
  compradas: TalentoId[]
  brasasRestantes: number
}

const pontuacaoItem = (i: Pick<Item, 'tipo' | 'material' | 'qualidade'>): number => poderDe(atributosItem(i))

/**
 * Receita de melhor valor por segundo, considerando o limite de lingotes do material
 * (empate: a de maior valor por lingote).
 */
export function escolherReceita(s: GameState, material: MaterialId = 'ferro'): ReceitaId {
  const t = taxas(s)
  const lingotesPorS = material === 'aco' ? t.aco : t.lingote
  let melhor: ReceitaId = 'espada'
  let melhorScore = -Infinity
  for (const r of TIPOS_ITEM) {
    const def = RECEITAS[r]
    const tempoEfetivo = Math.max(
      tempoForjaAtual(s, r),
      lingotesPorS > 0 ? def.lingotes / lingotesPorS : Infinity,
    )
    const v = valorEsperadoItem(s, r, material)
    // Desempate por valor por lingote (mais itens por lingote sobra).
    const score = v / tempoEfetivo + (v / def.lingotes) * 1e-6
    if (score > melhorScore) {
      melhor = r
      melhorScore = score
    }
  }
  return melhor
}

/**
 * Moedas/s em regime estável (vendendo tudo que sobra). Base da decisão gulosa.
 * Com o Forno de aço, a bigorna dá prioridade ao aço (valor ×4) e usa o resto do tempo e os
 * lingotes de ferro que sobram para itens de ferro.
 */
export function rendaEstavel(s: GameState): number {
  const t = taxas(s)
  const acoPorS = s.niveis.forno >= 1 ? t.aco : 0
  const ferroParaBigorna = t.lingote - acoPorS * RECEITA_ACO.lingote
  let ferroLivre = t.lingote - acoPorS * RECEITA_ACO.lingote
  let acoLivre = acoPorS
  let renda = 0

  if (s.niveis.bigorna >= 1) {
    let tempoLivre = 1 // fração do tempo da bigorna ainda disponível
    if (acoPorS > 0) {
      const r = escolherReceita(s, 'aco')
      const def = RECEITAS[r]
      const tempo = tempoForjaAtual(s, r)
      const itens = Math.min(acoPorS / def.lingotes, tempoLivre / tempo)
      renda += itens * valorEsperadoItem(s, r, 'aco')
      acoLivre = acoPorS - itens * def.lingotes
      tempoLivre -= itens * tempo
    }
    const r = escolherReceita(s, 'ferro')
    const def = RECEITAS[r]
    const tempo = tempoForjaAtual(s, r)
    const itens = Math.max(0, Math.min(ferroParaBigorna / def.lingotes, tempoLivre / tempo))
    renda += itens * valorEsperadoItem(s, r, 'ferro')
    ferroLivre = ferroParaBigorna - itens * def.lingotes
  }

  const minerioLivre = Math.max(0, t.minerio - RECEITA_LINGOTE.minerio * t.lingote)
  const carvaoLivre = Math.max(
    0,
    t.carvao - RECEITA_LINGOTE.carvao * t.lingote - RECEITA_ACO.carvao * acoPorS,
  )
  return (
    renda +
    Math.max(0, ferroLivre) * PRECO_VENDA.lingote +
    acoLivre * PRECO_VENDA.aco +
    minerioLivre * PRECO_VENDA.minerio +
    carvaoLivre * PRECO_VENDA.carvao
  )
}

/** Estações que o jogador pode comprar agora. */
const estacoesAbertas = (s: GameState): EstacaoId[] => ESTACOES.filter((e) => estacaoLiberada(s, e))

/** Upgrade com maior (ganho de renda / custo). Empate: o mais barato. */
export function melhorUpgrade(s: GameState): { estacao: EstacaoId; retorno: number; custo: number } {
  const base = rendaEstavel(s)
  let melhor: EstacaoId = 'mina'
  let melhorRetorno = -Infinity
  let melhorCusto = Infinity
  for (const e of estacoesAbertas(s)) {
    const custo = custoProximoNivel(s, e)
    const depois = comprarUpgrade({ ...s, moedas: custo }, e)
    const retorno = (rendaEstavel(depois) - base) / custo
    if (retorno > melhorRetorno + 1e-12 || (Math.abs(retorno - melhorRetorno) <= 1e-12 && custo < melhorCusto)) {
      melhor = e
      melhorRetorno = retorno
      melhorCusto = custo
    }
  }
  return { estacao: melhor, retorno: melhorRetorno, custo: melhorCusto }
}

/** Força bruta (no máximo ~80 combinações): a alocação dos contratados que maximiza a renda. */
export function melhorAlocacao(s: GameState): GameState {
  const contratados = FERREIROS.filter((id) => s.ferreiros[id].contratado)
  let melhor = s
  let melhorRenda = -Infinity

  const recursao = (i: number, atual: GameState, usadas: Set<EstacaoId>) => {
    if (i === contratados.length) {
      const r = rendaEstavel(atual)
      if (r > melhorRenda + 1e-12) {
        melhorRenda = r
        melhor = atual
      }
      return
    }
    const id = contratados[i]!
    for (const estacao of [...FERREIROS_DEF[id].estacoes, null]) {
      if (estacao !== null && usadas.has(estacao)) continue
      // O Forno de aço só tem posto depois de comprado.
      if (estacao === 'forno' && atual.niveis.forno < 1) continue
      const prox: GameState = {
        ...atual,
        ferreiros: { ...atual.ferreiros, [id]: { ...atual.ferreiros[id], estacao } },
      }
      if (estacao !== null) usadas.add(estacao)
      recursao(i + 1, prox, usadas)
      if (estacao !== null) usadas.delete(estacao)
    }
  }
  recursao(0, s, new Set())
  return melhor
}

/** Melhor ferreiro para contratar agora (ignorando se dá para pagar): maior ganho / custo. */
export function melhorContratacao(s: GameState): { id: FerreiroId; retorno: number; custo: number } | null {
  const custo = custoContratar(s)
  const base = rendaEstavel(melhorAlocacao(s))
  let melhor: { id: FerreiroId; retorno: number; custo: number } | null = null
  for (const id of FERREIROS) {
    if (s.ferreiros[id].contratado) continue
    const com = melhorAlocacao({
      ...s,
      ferreiros: { ...s.ferreiros, [id]: { ...s.ferreiros[id], contratado: true } },
    })
    const retorno = (rendaEstavel(com) - base) / custo
    if (retorno > 0 && (!melhor || retorno > melhor.retorno)) melhor = { id, retorno, custo }
  }
  return melhor
}

// ---------------------------------------------------------------------------
// Heróis: itens, equipamento, expedições e chefe
// ---------------------------------------------------------------------------

/** Cada herói livre veste o melhor item do inventário de cada espaço, se for melhor que o atual. */
export function equiparMelhores(s: GameState): GameState {
  let estado = s
  for (const h of s.herois) {
    if (emExpedicao(estado, h.id)) continue
    for (const slot of SLOTS) {
      const atual = estado.herois.find((x) => x.id === h.id)!.equipamento[slot]
      let melhor: Item | null = null
      for (const i of estado.itens) {
        if (SLOT_DO_TIPO[i.tipo] !== slot) continue
        if (!melhor || pontuacaoItem(i) > pontuacaoItem(melhor)) melhor = i
      }
      if (melhor && (!atual || pontuacaoItem(melhor) > pontuacaoItem(atual))) {
        estado = equipar(estado, h.id, melhor.id)
      }
    }
  }
  return estado
}

/**
 * Receita que mais melhora o kit dos heróis: em cada espaço, compara o item típico que a bigorna
 * faz hoje com o N-ésimo melhor que já existe (N = heróis, no mínimo 1). Null = o kit não melhora.
 */
export function receitaParaKit(s: GameState, material: MaterialId): ReceitaId | null {
  const f = faixaQ(s, material)
  const qualidade = qualidadeDe((f.min + f.max) / 2)
  const n = Math.max(1, s.herois.length)
  let melhor: ReceitaId | null = null
  let melhorGanho = 0
  for (const slot of SLOTS) {
    const notas: number[] = []
    for (const i of s.itens) if (SLOT_DO_TIPO[i.tipo] === slot) notas.push(pontuacaoItem(i))
    for (const h of s.herois) if (h.equipamento[slot]) notas.push(pontuacaoItem(h.equipamento[slot]!))
    notas.sort((a, b) => b - a)
    const atual = notas.length >= n ? notas[n - 1]! : 0
    for (const tipo of TIPOS_ITEM) {
      if (SLOT_DO_TIPO[tipo] !== slot) continue
      const ganho = pontuacaoItem({ tipo, material, qualidade }) - atual
      if (ganho > melhorGanho + 1e-9) {
        melhorGanho = ganho
        melhor = tipo
      }
    }
  }
  return melhor
}

/** Classe do próximo herói: um grupo equilibrado (Guerreiro, Guardiã, Batedor, Guerreiro). */
function classeDoProximo(s: GameState): ClasseId {
  return CLASSES[s.herois.length % CLASSES.length]!
}

/**
 * Melhor expedição para o herói: maior valor por hora entre as de chance >= 70 %.
 * `ocupacao` diz quanto tempo o herói fica de fato parado numa expedição de N segundos: no jogo
 * contínuo é a própria duração; com sessões espaçadas, ele só é mandado de novo na próxima sessão.
 */
export function melhorExpedicao(
  s: GameState,
  heroiId: number,
  ocupacao: (segundos: number) => number = (seg) => seg,
): ExpedicaoId | null {
  const h = s.herois.find((x) => x.id === heroiId)
  if (!h) return null
  const poder = poderHeroi(h)
  const bonus = DEF_CLASSE[h.classe].bonusLoot
  let melhor: ExpedicaoId | null = null
  let melhorValor = -Infinity
  for (const tipo of EXPEDICOES) {
    if (!expedicaoLiberada(s, tipo)) continue
    const p = preverExpedicao(poder, bonus, tipo, bonusExpedicao(s), s.reputacao)
    if (p.chance < 0.7) continue
    const esperado = p.chance * p.moedas + (1 - p.chance) * 0.3 * p.moedas
    const porHora = esperado / (Math.max(DEF_EXPEDICAO[tipo].segundos, ocupacao(DEF_EXPEDICAO[tipo].segundos)) / 3600)
    if (porHora > melhorValor) {
      melhor = tipo
      melhorValor = porHora
    }
  }
  return melhor
}

/** Vende o excedente: lingotes acima da reserva da bigorna e minério/carvão acima de ~2 s de consumo. */
function venderExcedente(s: GameState): GameState {
  const t = taxas(s)
  let r = s
  if (s.niveis.bigorna >= 1) {
    const reserva = (s.ultimaReceita ? RECEITAS[s.ultimaReceita].lingotes : 3) * 2
    // Com o forno, os lingotes de ferro que ele não aproveitou também podem virar item de ferro.
    const sobra = r.recursos.lingote - reserva
    if (sobra > 0) r = vender(r, 'lingote', sobra).estado
    const reservaAco = (s.ultimaReceita ? RECEITAS[s.ultimaReceita].lingotes : 3) * 2
    const sobraAco = r.recursos.aco - reservaAco
    if (sobraAco > 0) r = vender(r, 'aco', sobraAco).estado
  } else {
    r = vender(r, 'lingote', 'tudo').estado
  }
  const reservaMinerio = RECEITA_LINGOTE.minerio * t.fornalha * 2
  const reservaCarvao = (RECEITA_LINGOTE.carvao * t.fornalha + RECEITA_ACO.carvao * t.forno) * 2
  const sobraMinerio = r.recursos.minerio - reservaMinerio
  if (sobraMinerio > 0) r = vender(r, 'minerio', sobraMinerio).estado
  const sobraCarvao = r.recursos.carvao - reservaCarvao
  if (sobraCarvao > 0) r = vender(r, 'carvao', sobraCarvao).estado
  return r
}

/**
 * O jogador guloso entrega toda encomenda que consegue cumprir com o inventário e depois vende o que
 * não é útil (kit dos heróis e itens que servem a pedidos abertos ficam). É a mesma regra da venda
 * automática do jogo.
 */
function entregarEncomendas(s: GameState, agora: number, contagem: { entregues: number; reputacao: number }): GameState {
  let estado = s
  for (const e of s.encomendas) {
    if (motivoNaoEntregar(estado, e.id, agora) !== null) continue
    const r = entregar(estado, e.id, agora)
    estado = r.estado
    contagem.entregues++
    contagem.reputacao += r.entrega?.reputacao ?? 0
  }
  return estado
}

/**
 * Receita que ajuda uma encomenda aberta: a primeira a que ainda faltam itens e que o material em uso
 * cumpre (aço serve a ferro, ferro não serve a aço). Null = nenhuma.
 */
export function receitaDeEncomenda(s: GameState, material: MaterialId): ReceitaId | null {
  for (const e of s.encomendas) {
    if (e.material === 'aco' && material !== 'aco') continue
    const tem = s.itens.filter((i) => itemServe(i, e)).length
    if (tem < e.quantidade) return e.tipo
  }
  return null
}

// ---------------------------------------------------------------------------
// Padrão de jogador por dias
// ---------------------------------------------------------------------------

/**
 * Padrão de um jogador de celular `[suposição]`. As primeiras horas são jogadas sem parar (jogador
 * novo); depois, em cada dia de 24 h, ele fica 16 h acordado com uma sessão ativa de poucos minutos
 * a cada 90 min (compra, vende, coleta, equipa, manda os heróis) e dorme 8 h. Fora das sessões o
 * jogo roda offline com o teto real (2 h, mais Armazém e talentos).
 */
export interface PadraoDia {
  horasContinuas: number
  horasAcordado: number
  sessaoMin: number
  intervaloMin: number
}

export const PADRAO_REALISTA: PadraoDia = { horasContinuas: 2, horasAcordado: 16, sessaoMin: 5, intervaloMin: 90 }

/**
 * Brasas que o sim espera juntar antes de Reforjar `[suposição]`: 12 (144 milhões de moedas no ciclo). Um jogador
 * de verdade decide pelo bolso; 12 ainda cabe na faixa de 5 a 15 do GDD e põe o 1º Reforjar no meio de 2 a 4 dias.
 */
export const BRASAS_ALVO_PADRAO = 12

/** A sim de dias do GDD §4.4: até dois Reforjars, com o padrão realista e as brasas-alvo acima. */
export const OPCOES_DIAS: OpcoesSim = { padrao: PADRAO_REALISTA, brasasAlvo: BRASAS_ALVO_PADRAO, pararEmReforjas: 2 }

const DIA = 86_400

/**
 * O jogador está com o app aberto no instante t (segundos)? `desde` é o começo do ciclo (0 ou o
 * último Reforjar): as primeiras horas de cada ciclo são jogadas sem parar, porque recomeçar é a
 * parte divertida e o jogador volta para a forja ao Reforjar.
 */
export function presenteEm(p: PadraoDia | undefined, t: number, desde = 0): boolean {
  if (!p) return true
  if (t - desde < p.horasContinuas * 3600) return true
  const d = t % DIA
  if (d >= p.horasAcordado * 3600) return false
  return d % (p.intervaloMin * 60) < p.sessaoMin * 60
}

/** Menor instante >= t em que o jogador está presente. */
export function proximaPresenca(p: PadraoDia | undefined, t: number, desde = 0): number {
  if (presenteEm(p, t, desde)) return t
  const pad = p!
  const d = t % DIA
  const inicioDia = t - d
  if (d < pad.horasAcordado * 3600) {
    const proxima = inicioDia + Math.ceil(d / (pad.intervaloMin * 60)) * pad.intervaloMin * 60
    if (proxima - inicioDia < pad.horasAcordado * 3600) return proxima
  }
  return inicioDia + DIA
}

// ---------------------------------------------------------------------------
// Opções, Reforjar e talentos do sim
// ---------------------------------------------------------------------------

export interface OpcoesSim {
  /** Sem padrão, o jogador está sempre presente (as sims de horas). */
  padrao?: PadraoDia
  /** Reforja quando a Muralha existe e o ciclo rende pelo menos estas brasas. Sem isso, nunca Reforja. */
  brasasAlvo?: number
  /** Para a sim depois deste número de Reforjas. */
  pararEmReforjas?: number
  /** Campos do estado inicial a sobrescrever (testes e experimentos: ex. talentos já comprados). */
  inicial?: Partial<GameState>
  /** Ordem de compra dos talentos (gulosa: compra o próximo da lista se as brasas bastam, senão guarda). */
  talentos?: readonly TalentoId[]
}

/**
 * Prioridade dos talentos no sim `[suposição]`: primeiro o que acelera a economia do ciclo (foles,
 * sono, qualidade, veios), depois a bigorna de herança e o fogo ancestral; o Capitão fica por último
 * porque os heróis recomeçam no nível 1 e as expedições rendem pouco perto da produção.
 */
export const PRIORIDADE_TALENTOS: readonly TalentoId[] = [
  'fornalheiro_1',
  'fornalheiro_2',
  'fornalheiro_3',
  'fornalheiro_4',
  'mestre_1',
  'mestre_2',
  'mestre_3',
  'mestre_4',
  'capitao_1',
  'capitao_2',
  'capitao_3',
  'capitao_4',
]

function maiorValorDe(s: GameState): number {
  return Math.max(
    s.moedas,
    s.moedasGanhas,
    s.recursos.minerio,
    s.recursos.carvao,
    s.recursos.lingote,
    s.recursos.aco,
    ...estacoesAbertas(s).map((e) => custoProximoNivel(s, e)),
    ...s.itens.map((i) => i.valor),
  )
}

/**
 * Ordem de compra das obras no sim: a Muralha passa na frente do Mercado. O Mercado (+15 % no preço) só se
 * paga em dezenas de horas; o jogador guloso vai direto ao que abre o Reforjar. Antes da Serpe a Muralha
 * ainda não está liberada, então o Mercado é comprado normalmente nesse intervalo.
 */
const ORDEM_CONSTRUCAO_SIM: readonly ConstrucaoId[] = ['segunda_fornalha', 'armazem', 'taverna', 'muralha', 'mercado']

const MARCOS_REPUTACAO = [150, 400, 650, 1000] as const
const CHEFES_SIM: readonly ChefeId[] = ['golem', 'serpe']

export function simular(horas: number, passo = 0.25, opcoes: OpcoesSim = {}): ResultadoSim {
  const { padrao } = opcoes
  const prioridadeTalentos = opcoes.talentos ?? PRIORIDADE_TALENTOS
  const fim = horas * 3600
  // O jogador do sim liga a venda automática (opcional no jogo): é o que o impede de travar a bigorna offline.
  let s: GameState = { ...estadoInicial(0), autoVenda: true, ...opcoes.inicial }
  const compras: Compra[] = []
  const nivel10: Record<EstacaoProducao, number | null> = { mina: null, carvoaria: null, fornalha: null }
  const primeiraQualidade = nuloQualidades()
  const primeiraQualidadePorMaterial = Object.fromEntries(MATERIAIS.map((m) => [m, nuloQualidades()])) as Record<
    MaterialId,
    Record<Qualidade, number | null>
  >
  const itensPorQualidade = zeroQualidades()
  const itensPorMaterial = Object.fromEntries(MATERIAIS.map((m) => [m, zeroQualidades()])) as Record<
    MaterialId,
    PorQualidade
  >
  let bigornaDesbloqueada: number | null = null
  let primeiroFerreiro: number | null = null
  let itensForjados = 0

  const tempos: Record<
    'heroi1' | 'heroi2' | 'heroi3' | 'heroi4' | 'expedicao' | 'forno' | 'aco',
    number | null
  > = { heroi1: null, heroi2: null, heroi3: null, heroi4: null, expedicao: null, forno: null, aco: null }
  const tChefe: Record<ChefeId, number | null> = { golem: null, serpe: null }
  const rodadasChefe: Record<ChefeId, number | null> = { golem: null, serpe: null }
  const tConstrucao = Object.fromEntries(CONSTRUCOES.map((c) => [c, null])) as Record<ConstrucaoId, number | null>
  const marcosRep = MARCOS_REPUTACAO.map((minimo) => ({ minimo: minimo as number, t: null as number | null }))
  const reforjas: ReforjaSim[] = []
  const moedasPorDia: number[] = []
  const serieMoedas: ResultadoSim['serieMoedas'] = []
  let proximaSerie = 6 * 3600
  let moedasDeCiclosAnteriores = 0
  let inicioCiclo = 0
  const expedicoes = { enviadas: 0, sucessos: 0, falhas: 0 }
  const entregas = { entregues: 0, reputacao: 0 }

  const marcosRenda = [
    { rotulo: '5 min', t: 5 * 60 },
    { rotulo: '20 min', t: 20 * 60 },
    { rotulo: '1 h', t: 60 * 60 },
  ]
  const rendas: ResultadoSim['moedasPorSegundo'] = marcosRenda.map((m) => ({ ...m, valor: null }))
  // Histórico de moedasGanhas por segundo inteiro, para janelas de 60 s (só a primeira hora).
  const ganhasPorSegundo: number[] = [0]

  let ultimaCompra = 0
  let maiorEntre = { duracao: 0, inicio: 0 }
  let inicioSemComprar: number | null = null
  let maiorSem = { duracao: 0, inicio: 0 }
  let maiorValor = 0

  // Contratação: avaliada a cada 10 s (é a decisão mais cara) e logo após qualquer compra.
  let contratacao: ReturnType<typeof melhorContratacao> = null
  let proximaAvaliacao = 0
  let proximaRealocacao = 300

  const registrar = (t: number, c: Omit<Compra, 't'>) => {
    compras.push({ t, ...c })
    if (t - ultimaCompra > maiorEntre.duracao) maiorEntre = { duracao: t - ultimaCompra, inicio: ultimaCompra }
    ultimaCompra = t
    proximaAvaliacao = 0
  }

  const registrarForjados = (forjados: ResultadoTick['forjados'], t: number) => {
    for (const f of forjados) {
      itensForjados++
      const { qualidade, material } = f.item
      itensPorQualidade[qualidade]++
      itensPorMaterial[material][qualidade]++
      if (primeiraQualidade[qualidade] === null) primeiraQualidade[qualidade] = t
      if (primeiraQualidadePorMaterial[material][qualidade] === null) {
        primeiraQualidadePorMaterial[material][qualidade] = t
      }
    }
  }

  /** Meta de poupança: o herói, o Forno de aço e, por reputação, as construções (nessa ordem). */
  type Meta = { tipo: 'heroi' | 'forno' | 'construcao'; custo: number; id?: ConstrucaoId }
  const metaAtual = (): Meta | null => {
    if (s.herois.length === 0 && s.niveis.bigorna >= 1) return { tipo: 'heroi', custo: RECRUTAMENTO.custoPrimeiro }
    if (chefeDerrotado(s, 'golem') && s.niveis.forno < 1) {
      return { tipo: 'forno', custo: custoProximoNivel(s, 'forno') }
    }
    for (const id of ORDEM_CONSTRUCAO_SIM) {
      if (!temConstrucao(s, id) && construcaoLiberada(s, id)) {
        return { tipo: 'construcao', custo: DEF_CONSTRUCAO[id].custo, id }
      }
    }
    return null
  }

  /**
   * Enquanto poupa para uma meta, só compra o que se paga antes de a meta ficar pronta
   * (retorno = ganho de renda / custo; tempo de retorno = 1 / retorno).
   */
  const vale = (retorno: number, custo: number): boolean => {
    const meta = metaAtual()
    if (!meta) return true
    if (s.moedas - custo >= meta.custo) return true
    const renda = Math.max(1e-9, rendaEstavel(s))
    const faltam = Math.max(0, meta.custo - s.moedas) / renda
    return retorno > 0 && 1 / retorno < faltam
  }

  let t = 0
  let parou = false
  while (t < fim - 1e-9 && !parou) {
    // Fora de sessão: o jogo roda offline (com o teto) até a próxima abertura do app.
    if (padrao && !presenteEm(padrao, t, inicioCiclo)) {
      const tn = Math.min(fim, proximaPresenca(padrao, t, inicioCiclo))
      let decorrido = 0
      const r = applyOffline(s, tn * 1000, (rt) => {
        decorrido += OFFLINE.passoSegundos
        if (tempos.aco === null && rt.produzido.aco > 0) tempos.aco = t + decorrido
        registrarForjados(rt.forjados, t + decorrido)
      })
      s = r.estado
      t = tn
      continue
    }

    t += passo
    const agora = t * 1000
    const r = tickDetalhado(s, passo)
    s = avancarEncomendas({ ...r.estado, lastTick: agora }, agora)
    if (tempos.aco === null && r.produzido.aco > 0) tempos.aco = t
    registrarForjados(r.forjados, t)

    // Heróis: coleta o que voltou, veste o melhor, tenta os chefes e manda os livres em expedição.
    if (s.herois.length > 0) {
      const col = coletarTodas(s, agora)
      s = col.estado
      expedicoes.sucessos += col.coleta.sucessos
      expedicoes.falhas += col.coleta.falhas
      s = equiparMelhores(s)

      // Reforjar: com a Muralha e brasas suficientes, antes de mandar os heróis de novo.
      if (
        opcoes.brasasAlvo !== undefined &&
        temConstrucao(s, 'muralha') &&
        brasasDoCiclo(moedasDoCicloComPendentes(s, agora)) >= opcoes.brasasAlvo &&
        motivoNaoReforjar(s, agora) === null
      ) {
        const moedasDoCiclo = s.moedasGanhas
        const brasas = brasasDoCiclo(moedasDoCiclo)
        s = reforjar(s, agora)
        const compradas: TalentoId[] = []
        for (const id of prioridadeTalentos) {
          if (s.talentos.includes(id)) continue
          const novo = comprarTalento(s, id)
          if (novo === s) break // sem brasas para o próximo da lista: guarda as que sobram
          s = novo
          compradas.push(id)
          registrar(t, { tipo: 'talento', alvo: id, nivel: 1, custo: 0 })
        }
        reforjas.push({
          t,
          brasas,
          moedasDoCiclo,
          duracaoCiclo: t - inicioCiclo,
          compradas,
          brasasRestantes: s.brasas,
        })
        moedasDeCiclosAnteriores += moedasDoCiclo
        inicioCiclo = t
        contratacao = null
        inicioSemComprar = null
        if (opcoes.pararEmReforjas !== undefined && reforjas.length >= opcoes.pararEmReforjas) parou = true
      }

      for (const chefe of CHEFES_SIM) {
        if (chefeDerrotado(s, chefe) || !chefeDisponivel(s, chefe)) continue
        const livres = s.herois.filter((h) => !emExpedicao(s, h.id)).map((h) => h.id)
        if (livres.length === 0) continue
        const previsao = preverChefe(s, chefe, livres)
        if (previsao.vitoria) {
          s = lutarChefe(s, chefe, livres).estado
          tChefe[chefe] = t
          rodadasChefe[chefe] = previsao.rodadas
        }
      }
      const ocupacao = (seg: number) => (padrao ? proximaPresenca(padrao, t + seg, inicioCiclo) - t : seg)
      // Kit pronto para um chefe: o jogador segura os heróis em casa em vez de mandá-los de novo,
      // para lutar assim que todos voltarem (senão uma expedição longa atrasa a luta por horas).
      const guardarParaChefe = CHEFES_SIM.some(
        (c) =>
          !chefeDerrotado(s, c) &&
          chefeDisponivel(s, c) &&
          preverChefe({ ...s, expedicoes: [] }, c, s.herois.map((h) => h.id)).vitoria,
      )
      for (const h of s.herois) {
        if (guardarParaChefe || emExpedicao(s, h.id)) continue
        const tipo = melhorExpedicao(s, h.id, ocupacao)
        if (!tipo) continue
        s = partir(s, h.id, tipo, agora)
        expedicoes.enviadas++
        if (tempos.expedicao === null) tempos.expedicao = t
      }
    }

    // Heróis de graça: reputação (2º), Golem (3º), Taverna (4º) e talento (5º). Classe equilibrada.
    for (;;) {
      const vaga = proximaVaga(s)
      if (!vaga || !vaga.liberada || vaga.condicao.tipo === 'moedas') break
      s = recrutar(s, classeDoProximo(s))
      if (s.herois.length === 2) tempos.heroi2 = t
      if (s.herois.length === 3) tempos.heroi3 = t
      if (s.herois.length === 4 && tempos.heroi4 === null) tempos.heroi4 = t
    }

    for (const m of marcosRep) if (m.t === null && s.reputacao >= m.minimo) m.t = t

    s = entregarEncomendas(s, agora, entregas)
    s = venderInuteis(s).estado
    s = venderExcedente(s)

    if (s.niveis.bigorna >= 1) {
      // Aço quando há lingotes dele para a receita; senão ferro (a bigorna não fica parada).
      let material: MaterialId = 'ferro'
      if (s.niveis.forno >= 1) {
        const rAco = escolherReceita(s, 'aco')
        if (estoqueDe(s, 'aco') >= RECEITAS[rAco].lingotes) material = 'aco'
      }
      const receita = receitaDeEncomenda(s, material) ?? receitaParaKit(s, material) ?? escolherReceita(s, material)
      s = { ...s, automatico: true, ultimaReceita: receita, ultimoMaterial: material }
    }
    if (t >= proximaRealocacao) {
      proximaRealocacao = t + 300
      s = melhorAlocacao(s)
    }

    // Compra gulosa: espera juntar para o melhor retorno por moeda.
    for (;;) {
      // Metas de poupança: herói, forno e construções.
      const meta = metaAtual()
      if (meta && s.moedas >= meta.custo) {
        if (meta.tipo === 'heroi') {
          s = recrutar(s, classeDoProximo(s))
          tempos.heroi1 = t
          registrar(t, { tipo: 'heroi', alvo: s.herois[0]!.classe, nivel: 1, custo: meta.custo })
        } else if (meta.tipo === 'forno') {
          s = comprarUpgrade(s, 'forno')
          if (tempos.forno === null) tempos.forno = t
          registrar(t, { tipo: 'forno', alvo: 'forno', nivel: 1, custo: meta.custo })
          s = melhorAlocacao(s)
        } else {
          s = construir(s, meta.id!)
          if (tConstrucao[meta.id!] === null) tConstrucao[meta.id!] = t
          registrar(t, { tipo: 'construcao', alvo: meta.id!, nivel: 1, custo: meta.custo })
        }
        continue
      }

      if (t >= proximaAvaliacao) {
        contratacao = FERREIROS.some((id) => !s.ferreiros[id].contratado)
          ? melhorContratacao(s)
          : null
        proximaAvaliacao = t + 10
      }
      const up = melhorUpgrade(s)
      if (contratacao && contratacao.retorno > up.retorno) {
        if (s.moedas < contratacao.custo || !vale(contratacao.retorno, contratacao.custo)) break
        const custo = contratacao.custo
        const id = contratacao.id
        s = melhorAlocacao(contratar(s, id))
        contratacao = null
        if (primeiroFerreiro === null) primeiroFerreiro = t
        registrar(t, { tipo: 'ferreiro', alvo: id, nivel: 1, custo })
        continue
      }
      if (s.moedas < up.custo || !vale(up.retorno, up.custo)) break
      s = comprarUpgrade(s, up.estacao)
      registrar(t, { tipo: 'upgrade', alvo: up.estacao, nivel: s.niveis[up.estacao], custo: up.custo })
      if (up.estacao === 'bigorna' && bigornaDesbloqueada === null) bigornaDesbloqueada = t
      if (
        (up.estacao === 'mina' || up.estacao === 'carvoaria' || up.estacao === 'fornalha') &&
        s.niveis[up.estacao] >= 10 &&
        nivel10[up.estacao] === null
      ) {
        nivel10[up.estacao] = t
      }
      if (FERREIROS.some((id) => s.ferreiros[id].contratado)) s = melhorAlocacao(s)
    }

    // Intervalo "sem nada comprável": moedas abaixo da opção mais barata (upgrade ou ferreiro).
    let maisBarato = Math.min(...estacoesAbertas(s).map((e) => custoProximoNivel(s, e)))
    if (FERREIROS.some((id) => !s.ferreiros[id].contratado)) maisBarato = Math.min(maisBarato, custoContratar(s))
    if (s.moedas < maisBarato) {
      if (inicioSemComprar === null) inicioSemComprar = t - passo
      if (t - inicioSemComprar > maiorSem.duracao) maiorSem = { duracao: t - inicioSemComprar, inicio: inicioSemComprar }
    } else {
      inicioSemComprar = null
    }

    if (t <= 3700 && Math.floor(t) > ganhasPorSegundo.length - 1) ganhasPorSegundo[Math.floor(t)] = s.moedasGanhas
    for (const m of rendas) {
      if (m.valor === null && t >= m.t) {
        const inicio = ganhasPorSegundo[Math.max(0, Math.floor(m.t) - 60)] ?? 0
        m.valor = (s.moedasGanhas - inicio) / 60
      }
    }
    maiorValor = Math.max(maiorValor, maiorValorDe(s))
    if (t >= proximaSerie) {
      serieMoedas.push({ t, ciclo: reforjas.length + 1, moedasDoCiclo: s.moedasGanhas })
      proximaSerie += 6 * 3600
    }
    while (moedasPorDia.length < Math.floor(t / DIA)) moedasPorDia.push(moedasDeCiclosAnteriores + s.moedasGanhas)
  }

  if (t - ultimaCompra > maiorEntre.duracao) maiorEntre = { duracao: t - ultimaCompra, inicio: ultimaCompra }

  return {
    horas: t / 3600,
    compras,
    primeiraCompra: compras[0]?.t ?? null,
    nivel10,
    maiorIntervaloEntreCompras: maiorEntre,
    maiorIntervaloSemComprar: maiorSem,
    moedasPorSegundo: rendas,
    niveisFinais: { ...s.niveis },
    maiorValor,
    bigornaDesbloqueada,
    primeiraQualidade,
    primeiraQualidadePorMaterial,
    primeiroFerreiro,
    itensForjados,
    itensPorQualidade,
    itensPorMaterial,
    ferreirosFinais: FERREIROS.filter((id) => s.ferreiros[id].contratado).map((id) => ({
      id,
      nivel: s.ferreiros[id].nivel,
      estacao: s.ferreiros[id].estacao,
    })),
    primeiroHeroi: tempos.heroi1,
    segundoHeroi: tempos.heroi2,
    terceiroHeroi: tempos.heroi3,
    quartoHeroi: tempos.heroi4,
    primeiraExpedicao: tempos.expedicao,
    golemDerrotado: tChefe.golem,
    fornoComprado: tempos.forno,
    primeiroAco: tempos.aco,
    expedicoes,
    reputacaoFinal: s.reputacao,
    fragmentosFinais: s.fragmentos,
    heroisFinais: s.herois.map((h) => ({ nome: h.nome, classe: h.classe, nivel: h.nivel, poder: poderHeroi(h) })),
    rodadasDoGolem: rodadasChefe.golem,
    serpeDerrotada: tChefe.serpe,
    rodadasDaSerpe: rodadasChefe.serpe,
    construcoes: tConstrucao,
    reputacaoMarcos: marcosRep,
    reforjas,
    moedasPorDia,
    talentosFinais: [...s.talentos],
    brasasFinais: s.brasas,
    serieMoedas,
    encomendas: { entregues: entregas.entregues, expiradas: s.stats.encomendasExpiradas, reputacao: entregas.reputacao },
    estadoFinal: s,
  }
}
