// Encomendas do vilarejo (GDD §5, fatia 5). 8 moradores fixos pedem itens com qualidade mínima e
// prazo; pagam 1,5 × o valor do pedido e 10 a 50 de reputação. Até 3 abertas ao mesmo tempo.
//
// Decisões `[suposição]`:
// - Os pedidos nascem do RNG do estado e ficam gravados no save: reabrir o app não rerrola nada.
// - O prazo é um timestamp (ms). Pedido vencido some sem punição (só um contador); outro aparece
//   depois de uma espera sorteada.
// - O pedido acompanha o jogador: aço só depois do Forno; a qualidade pedida nunca passa do que a
//   bigorna dá com chance razoável hoje (`faixaQ`).
// - A entrega usa itens do INVENTÁRIO (os equipados não contam) e gasta os mais baratos que servem.
//   O aço serve a um pedido de ferro; o contrário não.
// - A recompensa é fixa e aparece no cartão: 1,5 × quantidade × valor do item na qualidade mínima.
import { faixaQ } from './bigorna.ts'
import { inteiro, proximo } from './rng.ts'
import {
  MULT_MATERIAL,
  MULT_QUALIDADE,
  NOME_MATERIAL,
  NOME_TIPO,
  QUALIDADES,
  Q_MINIMO,
  GENERO_TIPO,
  TIPOS_ITEM,
  valorItem,
  type Item,
  type MaterialId,
  type Qualidade,
  type TipoItem,
} from './items.ts'
import type { GameState } from './state.ts'

export const NPCS = ['quiteria', 'amaro', 'tonico', 'jurema', 'ines', 'dito', 'almir', 'zuleica'] as const
export type NpcId = (typeof NPCS)[number]

export interface DefNpc {
  nome: string
  papel: string
  /** O que o morador pede, com a fala de cada pedido. As chaves são as preferências. */
  falas: Partial<Record<TipoItem, string>>
  /** Exigente: aceita pedir uma qualidade acima do que o jogador acerta com folga. */
  exigente: boolean
  /** Compra em quantidade (mascate, sargento). */
  quantidade: boolean
}

export const DEF_NPC: Record<NpcId, DefNpc> = {
  quiteria: {
    nome: 'Quitéria',
    papel: 'taverneira',
    falas: {
      machado: 'A lenha da taverna não racha sozinha, e freguês de manhã não ajuda.',
      escudo: 'Briga de sábado à noite pede escudo. Bandeja já virou peneira.',
      elmo: 'Cabeça dura de freguês pede elmo, e eu pago em dobro o conserto.',
    },
    exigente: false,
    quantidade: false,
  },
  amaro: {
    nome: 'Sargento Amaro',
    papel: 'sargento da guarda',
    falas: {
      espada: 'A guarda está com as lâminas cegas. Sem fio, sem ronda.',
      escudo: 'Escudo bom segura o portão e o moral da rapaziada.',
      armadura: 'Meus rapazes não vão para a ronda de camisa.',
      elmo: 'Elmo amassado só enfeita. Preciso de elmo de verdade.',
    },
    exigente: false,
    quantidade: true,
  },
  tonico: {
    nome: 'Tônico',
    papel: 'lavrador',
    falas: {
      machado: 'A roça avançou na mata. Sem machado, a mata avança de volta.',
      escudo: 'Lobo na horta. Tampa de panela não segura, escudo segura.',
    },
    exigente: false,
    quantidade: false,
  },
  jurema: {
    nome: 'Jurema',
    papel: 'mascate',
    falas: {
      espada: 'Freguês de estrada paga bem por lâmina de verdade.',
      machado: 'Machado não encalha. Nunca encalhou na minha carroça.',
      escudo: 'Levo na carroça e vendo na feira da serra.',
      elmo: 'Elmo brilhando na vitrine atrai comprador.',
      armadura: 'Armadura é investimento, dizia meu pai.',
    },
    exigente: false,
    quantidade: true,
  },
  ines: {
    nome: 'Inês',
    papel: 'caçadora',
    falas: {
      espada: 'Lobo-cinzento voltou à mata. Quero lâmina curta e honesta.',
      machado: 'Machado de mão serve na trilha e serve no urso.',
      armadura: 'Couro não segura garra de urso. Aço, talvez.',
    },
    exigente: false,
    quantidade: false,
  },
  dito: {
    nome: 'Dito',
    papel: 'menestrel',
    falas: {
      espada: 'A balada do Golem pede uma espada de verdade no palco.',
      escudo: 'Escudo bem polido faz meio espetáculo, o resto é voz.',
      elmo: 'Elmo para o refrão. Pluma eu mesmo arrumo.',
    },
    exigente: false,
    quantidade: false,
  },
  almir: {
    nome: 'Prefeito Almir',
    papel: 'prefeito',
    falas: {
      armadura: 'Para a festa da cidade, uma armadura que reluza. Pago o justo.',
      elmo: 'A guarda cívica precisa de elmos à altura do vilarejo.',
      escudo: 'Escudos novos para o desfile. Nada de arranhão, por favor.',
    },
    exigente: true,
    quantidade: false,
  },
  zuleica: {
    nome: 'Dona Zuleica',
    papel: 'curandeira',
    falas: {
      escudo: 'Minha tenda de cura precisa de um escudo na porta, minha filha.',
      armadura: 'Quem vigia os feridos merece armadura boa.',
      elmo: 'Cabeça quebrada é o que mais chega aqui. Mais elmos, por favor.',
    },
    exigente: false,
    quantidade: false,
  },
}

export const ENCOMENDA = {
  maxAbertas: 3,
  /** Paga 1,5 × valor do pedido (GDD §5). */
  recompensaMult: 1.5,
  reputacaoMin: 10,
  reputacaoMax: 50,
  /** Peso (quantidade × mult. de qualidade × mult. de material) em que a reputação chega ao máximo. */
  pesoReputacaoMax: 60,
  /** Prazo = base + quantidade + sorteio de 0 a extra, em horas. */
  prazoBaseHoras: 2,
  prazoExtraHoras: 2,
  /** Espera até surgir outra encomenda, sorteada entre os dois valores (minutos). `[suposição]` ajustada pelo sim. */
  esperaMinMin: 45,
  esperaMaxMin: 120,
  /** Chance de o pedido ser de aço quando o Forno existe. */
  chanceAco: 0.6,
  /** O pedido só pede qualidade que a bigorna entrega com pelo menos esta chance (exigentes: a segunda). */
  chanceMinima: 0.5,
  chanceMinimaExigente: 0.25,
  /** "Em cima da hora": entregar com no máximo isto de prazo sobrando. */
  naHoraHSegundos: 60,
} as const

export interface Encomenda {
  id: number
  npc: NpcId
  tipo: TipoItem
  material: MaterialId
  /** Qualidade mínima. */
  qualidade: Qualidade
  quantidade: number
  /** Timestamps em ms (o mesmo relógio de `lastTick`). */
  criada: number
  prazo: number
  /** Moedas e reputação fixas, gravadas na criação. */
  recompensa: number
  reputacao: number
}

const indiceQ = (q: Qualidade): number => QUALIDADES.indexOf(q)

/** Tipos que o morador gosta de pedir. */
export const tiposDoNpc = (npc: NpcId): TipoItem[] => TIPOS_ITEM.filter((t) => DEF_NPC[npc].falas[t] !== undefined)

export const falaDe = (e: Pick<Encomenda, 'npc' | 'tipo'>): string => DEF_NPC[e.npc].falas[e.tipo] ?? ''

// ---------------------------------------------------------------------------
// Texto do pedido: "2 espadas de ferro, incomuns ou melhores"
// ---------------------------------------------------------------------------

const PLURAL_TIPO: Record<TipoItem, string> = {
  espada: 'espadas',
  machado: 'machados',
  escudo: 'escudos',
  elmo: 'elmos',
  armadura: 'armaduras',
}

const ADJ: Record<Qualidade, { m: [string, string]; f: [string, string] } | null> = {
  comum: null,
  incomum: { m: ['incomum', 'incomuns'], f: ['incomum', 'incomuns'] },
  raro: { m: ['raro', 'raros'], f: ['rara', 'raras'] },
  epico: { m: ['épico', 'épicos'], f: ['épica', 'épicas'] },
  lendario: { m: ['lendário', 'lendários'], f: ['lendária', 'lendárias'] },
}

/** "incomum ou melhor", "raras ou melhores", "qualquer qualidade". */
export function textoQualidadeMinima(e: Pick<Encomenda, 'tipo' | 'qualidade' | 'quantidade'>): string {
  const adj = ADJ[e.qualidade]
  if (!adj) return 'qualquer qualidade'
  const plural = e.quantidade > 1 ? 1 : 0
  const forma = adj[GENERO_TIPO[e.tipo]][plural]
  return `${forma} ou ${plural ? 'melhores' : 'melhor'}`
}

export function textoPedido(e: Pick<Encomenda, 'tipo' | 'material' | 'qualidade' | 'quantidade'>): string {
  const nome = e.quantidade > 1 ? PLURAL_TIPO[e.tipo] : NOME_TIPO[e.tipo].toLowerCase()
  return `${e.quantidade} ${nome} de ${NOME_MATERIAL[e.material]}, ${textoQualidadeMinima(e)}`
}

// ---------------------------------------------------------------------------
// Quais itens servem
// ---------------------------------------------------------------------------

/** O item cumpre o pedido? Aço serve a pedido de ferro; qualidade igual ou maior. */
export function itemServe(item: Item, e: Pick<Encomenda, 'tipo' | 'material' | 'qualidade'>): boolean {
  if (item.tipo !== e.tipo) return false
  if (e.material === 'aco' && item.material !== 'aco') return false
  return indiceQ(item.qualidade) >= indiceQ(e.qualidade)
}

const maisBarato = (a: Item, b: Item): number => a.valor - b.valor || a.id - b.id

/**
 * Itens do inventário que a entrega gastaria: os `quantidade` mais baratos que servem, ou null
 * se faltam. Itens equipados não estão no inventário, então nunca entram.
 */
export function itensDaEntrega(s: Pick<GameState, 'itens'>, e: Encomenda, excluir?: ReadonlySet<number>): Item[] | null {
  const servem = s.itens.filter((i) => itemServe(i, e) && !excluir?.has(i.id)).sort(maisBarato)
  return servem.length >= e.quantidade ? servem.slice(0, e.quantidade) : null
}

/** Quantos itens do inventário servem ao pedido (limitado à quantidade pedida, para a barra "1/2"). */
export function quantosServem(s: Pick<GameState, 'itens'>, e: Encomenda): number {
  return Math.min(e.quantidade, s.itens.filter((i) => itemServe(i, e)).length)
}

/** Ids que as encomendas abertas "reservam": a venda automática não toca neles. */
export function itensDeEncomendas(s: Pick<GameState, 'itens' | 'encomendas'>): Set<number> {
  const reservados = new Set<number>()
  for (const e of s.encomendas) {
    const servem = s.itens.filter((i) => itemServe(i, e) && !reservados.has(i.id)).sort(maisBarato)
    for (const i of servem.slice(0, e.quantidade)) reservados.add(i.id)
  }
  return reservados
}

// ---------------------------------------------------------------------------
// Geração
// ---------------------------------------------------------------------------

/** Maior índice de qualidade que a bigorna entrega com pelo menos `chance` de acerto (no automático). */
export function qualidadeMaximaPedida(s: GameState, material: MaterialId, chance: number): number {
  const f = faixaQ(s, material)
  const largura = Math.max(1, f.max - f.min + 1)
  let melhor = 0
  QUALIDADES.forEach((q, i) => {
    const p = Math.min(1, Math.max(0, (f.max - Q_MINIMO[q] + 1) / largura))
    if (p >= chance) melhor = i
  })
  return melhor
}

/** Reputação do pedido: 10 a 50, em escala logarítmica do peso (quantidade × qualidade × material). */
export function reputacaoDoPedido(quantidade: number, qualidade: Qualidade, material: MaterialId): number {
  const peso = quantidade * MULT_QUALIDADE[qualidade] * MULT_MATERIAL[material]
  const frac = Math.min(1, Math.max(0, Math.log(peso) / Math.log(ENCOMENDA.pesoReputacaoMax)))
  return Math.round(ENCOMENDA.reputacaoMin + (ENCOMENDA.reputacaoMax - ENCOMENDA.reputacaoMin) * frac)
}

export function recompensaDoPedido(
  tipo: TipoItem,
  material: MaterialId,
  qualidade: Qualidade,
  quantidade: number,
): number {
  return ENCOMENDA.recompensaMult * quantidade * valorItem(tipo, material, qualidade)
}

/**
 * Cria UMA encomenda nova, se couber (bigorna construída, vaga livre, morador livre). Sorteia tudo com
 * o RNG do estado e agenda a próxima. `agora` é o relógio em ms.
 */
export function gerarEncomenda(s: GameState, agora: number): GameState {
  if (s.niveis.bigorna < 1 || s.encomendas.length >= ENCOMENDA.maxAbertas) return s
  const livres = NPCS.filter((n) => !s.encomendas.some((e) => e.npc === n))
  if (livres.length === 0) return s

  let rng = s.rng
  const sortear = (max: number): number => {
    const r = inteiro(rng, max)
    rng = r.rng
    return r.valor
  }
  const sortearReal = (): number => {
    const r = proximo(rng)
    rng = r.rng
    return r.valor
  }

  const npc = livres[sortear(livres.length - 1)]!
  const def = DEF_NPC[npc]
  const tipos = tiposDoNpc(npc)
  const tipo = tipos[sortear(tipos.length - 1)]!
  const material: MaterialId = s.niveis.forno >= 1 && sortearReal() < ENCOMENDA.chanceAco ? 'aco' : 'ferro'

  // Qualidade: no limite do que o jogador acerta (50 %), ou um ou dois degraus abaixo.
  const maxIdx = qualidadeMaximaPedida(s, material, def.exigente ? ENCOMENDA.chanceMinimaExigente : ENCOMENDA.chanceMinima)
  const r = sortearReal()
  const idx = Math.max(0, maxIdx - (r < 0.5 ? 0 : r < 0.8 ? 1 : 2))
  const qualidade = QUALIDADES[idx]!

  // Quantidade: 1 (40 %), 2 (40 %), 3 (20 %); quem compra em volume pede um a mais, no máximo 3.
  const rq = sortearReal()
  let quantidade = rq < 0.4 ? 1 : rq < 0.8 ? 2 : 3
  if (def.quantidade && quantidade < 3) quantidade++

  const horas = ENCOMENDA.prazoBaseHoras + quantidade + sortear(ENCOMENDA.prazoExtraHoras)
  const espera = ENCOMENDA.esperaMinMin + sortear(ENCOMENDA.esperaMaxMin - ENCOMENDA.esperaMinMin)

  const encomenda: Encomenda = {
    id: s.proximoIdEncomenda,
    npc,
    tipo,
    material,
    qualidade,
    quantidade,
    criada: agora,
    prazo: agora + horas * 3_600_000,
    recompensa: recompensaDoPedido(tipo, material, qualidade, quantidade),
    reputacao: reputacaoDoPedido(quantidade, qualidade, material),
  }
  return {
    ...s,
    rng,
    encomendas: [...s.encomendas, encomenda],
    proximoIdEncomenda: s.proximoIdEncomenda + 1,
    proximaEncomenda: agora + espera * 60_000,
  }
}

/**
 * Passa o relógio: o que venceu some (sem punição, só o contador) e, se for a hora, surge uma nova.
 * No máximo UMA nova por chamada, mesmo depois de horas fora: o tempo de espera é o ritmo do vilarejo.
 * Devolve o MESMO estado quando nada muda (a store chama isso a cada tick).
 */
export function avancarEncomendas(s: GameState, agora: number): GameState {
  let e = s
  const vivas = s.encomendas.filter((x) => x.prazo > agora)
  if (vivas.length !== s.encomendas.length) {
    e = {
      ...s,
      encomendas: vivas,
      stats: { ...s.stats, encomendasExpiradas: s.stats.encomendasExpiradas + (s.encomendas.length - vivas.length) },
    }
  }
  if (e.niveis.bigorna >= 1 && e.encomendas.length < ENCOMENDA.maxAbertas && agora >= e.proximaEncomenda) {
    e = gerarEncomenda(e, agora)
  }
  return e
}

// ---------------------------------------------------------------------------
// Entrega
// ---------------------------------------------------------------------------

export interface Entrega {
  npc: NpcId
  moedas: number
  reputacao: number
  /** Prazo que sobrava, em segundos. */
  sobraSegundos: number
}

export type MotivoNaoEntregar = 'inexistente' | 'vencida' | 'faltam-itens'

export function motivoNaoEntregar(s: GameState, id: number, agora: number): MotivoNaoEntregar | null {
  const e = s.encomendas.find((x) => x.id === id)
  if (!e) return 'inexistente'
  if (e.prazo <= agora) return 'vencida'
  if (!itensDaEntrega(s, e)) return 'faltam-itens'
  return null
}

/** Entrega: gasta os itens mais baratos que servem e paga. Qualquer pendência devolve o MESMO estado. */
export function entregar(s: GameState, id: number, agora: number): { estado: GameState; entrega: Entrega | null } {
  if (motivoNaoEntregar(s, id, agora) !== null) return { estado: s, entrega: null }
  const e = s.encomendas.find((x) => x.id === id)!
  const usados = new Set(itensDaEntrega(s, e)!.map((i) => i.id))
  const sobraSegundos = (e.prazo - agora) / 1000
  const estado: GameState = {
    ...s,
    itens: s.itens.filter((i) => !usados.has(i.id)),
    moedas: s.moedas + e.recompensa,
    moedasGanhas: s.moedasGanhas + e.recompensa,
    reputacao: s.reputacao + e.reputacao,
    encomendas: s.encomendas.filter((x) => x.id !== id),
    stats: {
      ...s.stats,
      encomendasEntregues: s.stats.encomendasEntregues + 1,
      entregasNaHoraH: s.stats.entregasNaHoraH + (sobraSegundos <= ENCOMENDA.naHoraHSegundos ? 1 : 0),
    },
  }
  return { estado, entrega: { npc: e.npc, moedas: e.recompensa, reputacao: e.reputacao, sobraSegundos } }
}
