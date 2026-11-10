// Heróis (GDD §3, §4.2 e §5): classes, atributos, nível, equipamento e recrutamento.
// Tudo puro. Nada aqui sabe de tempo real: o relógio entra por parâmetro nas expedições.
import { maxHerois } from './bonus.ts'
import { temConstrucao } from './construcoes.ts'
import {
  ATRIBUTOS_ZERO,
  SLOTS,
  SLOT_DO_TIPO,
  atributosItem,
  poderDe,
  type Atributos,
  type Item,
  type Slot,
} from './items.ts'
import type { GameState } from './state.ts'

export const CLASSES = ['guerreiro', 'guardia', 'batedor'] as const
export type ClasseId = (typeof CLASSES)[number]

export interface DefClasse {
  nome: string
  resumo: string
  /**
   * Como o poder base se divide entre ATQ, DEF e PV (somam 1). O PV vale 10 pontos de vida por
   * ponto de poder, porque o poder de expedição conta PV/10 (GDD §4.2).
   */
  pesos: { atq: number; def: number; pv: number }
  /** Quanto do poder base a classe recebe. O batedor paga o loot e a velocidade com 10 % de poder. */
  fatorPoder: number
  /** VEL no nível 1 (decide a ordem no combate; não entra no poder de expedição). */
  velBase: number
  /** Bônus de moedas e de chance de fragmento nas expedições. */
  bonusLoot: number
  /** Nomes em pt-BR, originais, sorteados em ordem a cada recrutamento da classe. */
  nomes: readonly string[]
}

export const DEF_CLASSE: Record<ClasseId, DefClasse> = {
  guerreiro: {
    nome: 'Guerreiro',
    resumo: 'Ataque alto. Derruba o chefe mais rápido.',
    pesos: { atq: 0.55, def: 0.2, pv: 0.25 },
    fatorPoder: 1,
    velBase: 10,
    bonusLoot: 0,
    nomes: ['Bento', 'Tadeu', 'Heitor', 'Olavo'],
  },
  guardia: {
    nome: 'Guardiã',
    resumo: 'Defesa e vida. Aguenta o chefe por mais rodadas.',
    pesos: { atq: 0.2, def: 0.4, pv: 0.4 },
    fatorPoder: 1,
    velBase: 6,
    bonusLoot: 0,
    nomes: ['Dalva', 'Marlene', 'Cleide', 'Odete'],
  },
  batedor: {
    nome: 'Batedor',
    resumo: 'Rápido, com 20 % a mais de loot nas expedições.',
    pesos: { atq: 0.4, def: 0.2, pv: 0.4 },
    fatorPoder: 0.9,
    velBase: 16,
    bonusLoot: 0.2,
    nomes: ['Zeca', 'Tião', 'Nenê', 'Juca'],
  },
}

export const HEROI = {
  /** Poder base no nível 1 e o crescimento por nível: 20 × 1,12^(n−1). */
  poderBase: 20,
  poderTaxa: 1.12,
  /** XP para sair do nível n: 50 × 1,25^(n−1). */
  xpBase: 50,
  xpTaxa: 1.25,
  /** Pontos de PV por ponto de poder. */
  pvPorPoder: 10,
  /** A VEL cresce 2 % por nível. */
  velPorNivel: 0.02,
  maximo: 4,
} as const

export type Equipamento = Record<Slot, Item | null>

export interface Heroi {
  id: number
  nome: string
  classe: ClasseId
  nivel: number
  xp: number
  equipamento: Equipamento
}

export const equipamentoVazio = (): Equipamento => ({ arma: null, escudo: null, armadura: null, elmo: null })

/** Poder base de um herói de nível n (antes da classe): 20 × 1,12^(n−1). */
export function poderBaseNivel(n: number): number {
  return HEROI.poderBase * Math.pow(HEROI.poderTaxa, n - 1)
}

/** Atributos só da classe e do nível, sem itens. */
export function atributosBase(classe: ClasseId, nivel: number): Atributos {
  const def = DEF_CLASSE[classe]
  const poder = poderBaseNivel(nivel) * def.fatorPoder
  return {
    atq: Math.round(poder * def.pesos.atq),
    def: Math.round(poder * def.pesos.def),
    pv: Math.round(poder * def.pesos.pv * HEROI.pvPorPoder),
    vel: Math.round(def.velBase * (1 + HEROI.velPorNivel * (nivel - 1))),
  }
}

/** Atributos finais: classe e nível mais todos os itens equipados. A VEL nunca cai abaixo de 1. */
export function atributosHeroi(h: Pick<Heroi, 'classe' | 'nivel' | 'equipamento'>): Atributos {
  const total: Atributos = { ...atributosBase(h.classe, h.nivel) }
  for (const slot of SLOTS) {
    const item = h.equipamento[slot]
    if (!item) continue
    const a = atributosItem(item)
    total.pv += a.pv
    total.atq += a.atq
    total.def += a.def
    total.vel += a.vel
  }
  total.vel = Math.max(1, total.vel)
  return total
}

/** Poder de expedição do herói: ATQ + DEF + PV/10. */
export function poderHeroi(h: Pick<Heroi, 'classe' | 'nivel' | 'equipamento'>): number {
  return poderDe(atributosHeroi(h))
}

/** XP para sair do nível n. */
export function xpParaNivel(n: number): number {
  return HEROI.xpBase * Math.pow(HEROI.xpTaxa, n - 1)
}

/** Dá XP ao herói, subindo quantos níveis couberem. */
export function darXpHeroi(h: Heroi, xp: number): Heroi {
  if (!(xp > 0)) return h
  let { nivel, xp: atual } = h
  atual += xp
  for (;;) {
    const precisa = xpParaNivel(nivel)
    if (atual < precisa) break
    atual -= precisa
    nivel++
  }
  return { ...h, nivel, xp: atual }
}

export function substituirHeroi(s: GameState, h: Heroi): GameState {
  return { ...s, herois: s.herois.map((x) => (x.id === h.id ? h : x)) }
}

export function acharHeroi(s: GameState, id: number): Heroi | undefined {
  return s.herois.find((h) => h.id === id)
}

/** Em expedição ou esperando a coleta do loot: não troca de equipamento nem luta. */
export function emExpedicao(s: GameState, heroiId: number): boolean {
  return s.expedicoes.some((e) => e.heroi === heroiId)
}

// ---------------------------------------------------------------------------
// Equipamento
// ---------------------------------------------------------------------------

/** Equipa um item do inventário. O item sai do inventário; o que estava no espaço volta para lá. */
export function equipar(s: GameState, heroiId: number, itemId: number): GameState {
  const h = acharHeroi(s, heroiId)
  const item = s.itens.find((i) => i.id === itemId)
  if (!h || !item || emExpedicao(s, heroiId)) return s
  const slot = SLOT_DO_TIPO[item.tipo]
  const anterior = h.equipamento[slot]
  const itens = s.itens.filter((i) => i.id !== itemId)
  if (anterior) itens.push(anterior) // troca: o inventário não muda de tamanho
  const novo: Heroi = { ...h, equipamento: { ...h.equipamento, [slot]: item } }
  return { ...substituirHeroi(s, novo), itens }
}

/** Devolve o item do espaço ao inventário. Sem espaço no inventário, não faz nada. */
export function desequipar(s: GameState, heroiId: number, slot: Slot): GameState {
  const h = acharHeroi(s, heroiId)
  if (!h || emExpedicao(s, heroiId)) return s
  const item = h.equipamento[slot]
  if (!item || s.itens.length >= s.limiteInventario) return s
  const novo: Heroi = { ...h, equipamento: { ...h.equipamento, [slot]: null } }
  return { ...substituirHeroi(s, novo), itens: [...s.itens, item] }
}

/** Diferença de atributos se o item fosse equipado agora (positivo = melhora). */
export function diferencaAtributos(h: Heroi, item: Item): Atributos {
  const slot = SLOT_DO_TIPO[item.tipo]
  const novo = atributosItem(item)
  const atual = h.equipamento[slot] ? atributosItem(h.equipamento[slot]!) : ATRIBUTOS_ZERO
  return {
    pv: novo.pv - atual.pv,
    atq: novo.atq - atual.atq,
    def: novo.def - atual.def,
    vel: novo.vel - atual.vel,
  }
}

// ---------------------------------------------------------------------------
// Recrutamento
// ---------------------------------------------------------------------------

/**
 * Como cada vaga de herói se abre (GDD §5, adaptado na fatia 3; ver GDD §9):
 * 1ª por moedas, 2ª com reputação (que vem das expedições), 3ª ao derrotar o Golem,
 * 4ª com a Taverna (construção), 5ª só com o talento "Quinto herói" (fatia 4).
 */
export const RECRUTAMENTO = {
  /** Achado pelo sim: o primeiro herói chega por volta dos 10 min. */
  custoPrimeiro: 3500,
  reputacaoSegundo: 150,
} as const

export type CondicaoVaga =
  | { tipo: 'moedas'; custo: number }
  | { tipo: 'reputacao'; minimo: number }
  | { tipo: 'chefe'; chefe: 'golem' }
  | { tipo: 'taverna' }
  | { tipo: 'talento' }

export interface Vaga {
  /** 0 = primeiro herói. */
  indice: number
  condicao: CondicaoVaga
  /** Dá para recrutar agora? */
  liberada: boolean
  /** Falta pouco? (texto de apoio da UI) */
  dica: string
}

const CONDICOES: readonly CondicaoVaga[] = [
  { tipo: 'moedas', custo: RECRUTAMENTO.custoPrimeiro },
  { tipo: 'reputacao', minimo: RECRUTAMENTO.reputacaoSegundo },
  { tipo: 'chefe', chefe: 'golem' },
  { tipo: 'taverna' },
  { tipo: 'talento' },
]

/** A próxima vaga a abrir, ou null se o grupo está completo. */
export function proximaVaga(s: GameState): Vaga | null {
  const indice = s.herois.length
  const condicao = CONDICOES[indice]
  if (!condicao || indice >= maxHerois(s)) return null
  switch (condicao.tipo) {
    case 'moedas':
      return {
        indice,
        condicao,
        liberada: s.moedas >= condicao.custo,
        dica: 'Contratar o primeiro herói custa moedas.',
      }
    case 'reputacao':
      return {
        indice,
        condicao,
        liberada: s.reputacao >= condicao.minimo,
        dica: `Chega com ${condicao.minimo} de reputação. As expedições bem-sucedidas rendem reputação.`,
      }
    case 'chefe':
      return {
        indice,
        condicao,
        liberada: s.chefesDerrotados.includes(condicao.chefe),
        dica: 'Chega ao derrotar o Golem de Escória.',
      }
    case 'taverna':
      return {
        indice,
        condicao,
        liberada: temConstrucao(s, 'taverna'),
        dica: 'Chega com a Taverna, que o vilarejo constrói com reputação.',
      }
    case 'talento':
      return { indice, condicao, liberada: true, dica: 'Um herói a mais, graças ao talento Quinto herói.' }
  }
}

/** Nome livre da classe (em ordem; se acabarem, repete com número). */
export function nomeLivre(s: GameState, classe: ClasseId): string {
  const usados = new Set(s.herois.map((h) => h.nome))
  const lista = DEF_CLASSE[classe].nomes
  for (const n of lista) if (!usados.has(n)) return n
  return `${lista[0]!} ${s.herois.length + 1}`
}

/** Recruta um herói de nível 1 da classe escolhida, se a vaga estiver aberta. */
export function recrutar(s: GameState, classe: ClasseId): GameState {
  const vaga = proximaVaga(s)
  if (!vaga || !vaga.liberada) return s
  const heroi: Heroi = {
    id: s.proximoIdHeroi,
    nome: nomeLivre(s, classe),
    classe,
    nivel: 1,
    xp: 0,
    equipamento: equipamentoVazio(),
  }
  const custo = vaga.condicao.tipo === 'moedas' ? vaga.condicao.custo : 0
  return {
    ...s,
    moedas: s.moedas - custo,
    herois: [...s.herois, heroi],
    proximoIdHeroi: s.proximoIdHeroi + 1,
  }
}
