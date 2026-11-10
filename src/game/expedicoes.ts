// Expedições (GDD §4.2): chance de sucesso, loot, partida e coleta.
//
// Decisões da fatia 3:
// - O resultado (sucesso ou falha), o loot e o fragmento são SORTEADOS e GRAVADOS na partida.
//   A volta é decidida só pelo timestamp (`fim`), então funciona offline e reabrir o app
//   não permite rerrolar (GDD §4.5).
// - 1 herói por expedição; o grupo todo só se junta para o chefe.
// - O loot espera a coleta (um toque). Até lá o herói continua "em expedição".
import { BONUS_EXPEDICAO_ZERO, bonusExpedicao, type BonusExpedicao } from './bonus.ts'
import { proximo } from './rng.ts'
import { acharHeroi, darXpHeroi, DEF_CLASSE, emExpedicao, poderHeroi, substituirHeroi } from './herois.ts'
import type { GameState } from './state.ts'
import type { ChefeId } from './chefe.ts'

export const REGIOES = ['vale', 'serra'] as const
export type RegiaoId = (typeof REGIOES)[number]

export interface DefRegiao {
  nome: string
  descricao: string
  /** Chefe que precisa estar derrotado para a região abrir (null = aberta desde o início). */
  exige: ChefeId | null
}

export const DEF_REGIAO: Record<RegiaoId, DefRegiao> = {
  vale: { nome: 'Vale da Bigorna', descricao: 'Pastos, riachos e ruínas ao redor do vilarejo.', exige: null },
  serra: {
    nome: 'Serra Cinzenta',
    descricao: 'Picos de pedra fria, onde o aço nasce. Só se entra depois do Golem.',
    exige: 'golem',
  },
}

export const EXPEDICOES = ['trilha', 'moinho', 'gruta', 'passo', 'desfiladeiro', 'pico'] as const
export type ExpedicaoId = (typeof EXPEDICOES)[number]

export interface DefExpedicao {
  regiao: RegiaoId
  nome: string
  /** Duração em segundos. */
  segundos: number
  /** Dificuldade D (GDD §4.2). */
  dificuldade: number
}

export const DEF_EXPEDICAO: Record<ExpedicaoId, DefExpedicao> = {
  trilha: { regiao: 'vale', nome: 'Trilha do Riacho', segundos: 2 * 60, dificuldade: 40 },
  moinho: { regiao: 'vale', nome: 'Moinho Abandonado', segundos: 10 * 60, dificuldade: 70 },
  gruta: { regiao: 'vale', nome: 'Gruta dos Ecos', segundos: 30 * 60, dificuldade: 110 },
  passo: { regiao: 'serra', nome: 'Passo dos Ventos', segundos: 60 * 60, dificuldade: 300 },
  desfiladeiro: { regiao: 'serra', nome: 'Desfiladeiro da Cinza', segundos: 4 * 3600, dificuldade: 550 },
  pico: { regiao: 'serra', nome: 'Pico do Corvo', segundos: 8 * 3600, dificuldade: 800 },
}

export const EXPEDICAO = {
  moedasBase: 15,
  moedasExpoenteD: 0.8,
  moedasExpoenteHoras: 0.5,
  /** XP do herói = D / 2. */
  xpPorDificuldade: 0.5,
  /** Chance de fragmento = 10 % × horas (limitada a 100 %). */
  fragmentoPorHora: 0.1,
  /** Falha devolve 30 % das moedas e do XP (GDD §9: sem punição). */
  fracaoFalha: 0.3,
  chanceMin: 0.05,
  chanceMax: 0.95,
  /**
   * Reputação por sucesso (fatia 4, `[suposição]` calibrada pelo sim): `K × horas^0,5 / (1 + reputação / R)`.
   * A raiz da duração tira a vantagem das expedições curtas e repetidas (a Trilha de 2 min
   * rendia 765 de reputação em 2 h); o divisor é um retorno decrescente pela reputação acumulada,
   * para a Muralha (1 000) não ser trivial nem um gargalo absurdo. Ver GDD §4.2 e §4.5.
   */
  reputacaoK: 17,
  reputacaoExpoenteHoras: 0.5,
  reputacaoR: 1000,
} as const

export interface Expedicao {
  id: number
  heroi: number
  tipo: ExpedicaoId
  /** Timestamps em ms (o mesmo relógio de `GameState.lastTick`). */
  inicio: number
  fim: number
  /** Sorteado na partida e gravado. */
  sucesso: boolean
  /** Chance que valia na partida (só informativo). */
  chance: number
  /** Loot já resolvido (falha já vem com 30 % e sem reputação nem fragmento). */
  moedas: number
  xp: number
  reputacao: number
  fragmentos: number
}

export const horasDe = (tipo: ExpedicaoId): number => DEF_EXPEDICAO[tipo].segundos / 3600

/** p = limitar(0,5 + (P − D) / (2D) + bônus, 0,05, 0,95). O bônus vem do talento Rota segura. */
export function chanceSucesso(poder: number, dificuldade: number, bonus = 0): number {
  const p = 0.5 + (poder - dificuldade) / (2 * dificuldade) + bonus
  return Math.min(EXPEDICAO.chanceMax, Math.max(EXPEDICAO.chanceMin, p))
}

/** Moedas no sucesso, sem bônus de classe: 15 × D^0,8 × horas^0,5. */
export function moedasBase(tipo: ExpedicaoId): number {
  const d = DEF_EXPEDICAO[tipo].dificuldade
  return (
    EXPEDICAO.moedasBase *
    Math.pow(d, EXPEDICAO.moedasExpoenteD) *
    Math.pow(horasDe(tipo), EXPEDICAO.moedasExpoenteHoras)
  )
}

/**
 * Reputação de um sucesso, dada a reputação que o jogador já tem (retorno decrescente).
 * `K × horas^0,5 / (1 + reputação / R)`. Pode ser fracionária; a UI mostra uma casa.
 */
export function reputacaoDe(tipo: ExpedicaoId, reputacaoAtual = 0): number {
  const base = EXPEDICAO.reputacaoK * Math.pow(horasDe(tipo), EXPEDICAO.reputacaoExpoenteHoras)
  return base / (1 + Math.max(0, reputacaoAtual) / EXPEDICAO.reputacaoR)
}

export function chanceFragmento(tipo: ExpedicaoId, bonusLoot: number): number {
  return Math.min(1, EXPEDICAO.fragmentoPorHora * horasDe(tipo) * (1 + bonusLoot))
}

export interface PrevisaoExpedicao {
  chance: number
  poder: number
  /** Loot no sucesso (a falha rende 30 % das moedas e do XP). */
  moedas: number
  xp: number
  reputacao: number
  chanceFragmento: number
}

/** O que a UI mostra antes de mandar: tudo calculado, nada sorteado. */
export function preverExpedicao(
  poder: number,
  bonusLoot: number,
  tipo: ExpedicaoId,
  bonus: BonusExpedicao = BONUS_EXPEDICAO_ZERO,
  reputacaoAtual = 0,
): PrevisaoExpedicao {
  const d = DEF_EXPEDICAO[tipo].dificuldade
  return {
    chance: chanceSucesso(poder, d, bonus.chance),
    poder,
    moedas: moedasBase(tipo) * (1 + bonusLoot) * bonus.loot,
    xp: d * EXPEDICAO.xpPorDificuldade * bonus.loot,
    reputacao: reputacaoDe(tipo, reputacaoAtual),
    chanceFragmento: chanceFragmento(tipo, bonusLoot),
  }
}

export function expedicaoLiberada(s: GameState, tipo: ExpedicaoId): boolean {
  const exige = DEF_REGIAO[DEF_EXPEDICAO[tipo].regiao].exige
  return exige === null || s.chefesDerrotados.includes(exige)
}

export type MotivoNaoPartir = 'sem-heroi' | 'ocupado' | 'bloqueada'

export function motivoNaoPartir(s: GameState, heroiId: number, tipo: ExpedicaoId): MotivoNaoPartir | null {
  if (!acharHeroi(s, heroiId)) return 'sem-heroi'
  if (emExpedicao(s, heroiId)) return 'ocupado'
  if (!expedicaoLiberada(s, tipo)) return 'bloqueada'
  return null
}

/**
 * Manda o herói. Sorteia e grava, na hora: sucesso, fragmento e o loot final.
 * Sempre consome 2 sorteios do RNG (haja ou não fragmento a sortear), para o resto
 * da sequência não depender do resultado.
 */
export function partir(s: GameState, heroiId: number, tipo: ExpedicaoId, now: number): GameState {
  if (motivoNaoPartir(s, heroiId, tipo) !== null) return s
  const h = acharHeroi(s, heroiId)!
  const bonus = DEF_CLASSE[h.classe].bonusLoot
  const prev = preverExpedicao(poderHeroi(h), bonus, tipo, bonusExpedicao(s), s.reputacao)

  const a = proximo(s.rng)
  const b = proximo(a.rng)
  const sucesso = a.valor < prev.chance
  const fragmento = sucesso && b.valor < prev.chanceFragmento
  const fator = sucesso ? 1 : EXPEDICAO.fracaoFalha

  const exp: Expedicao = {
    id: s.proximoIdExpedicao,
    heroi: heroiId,
    tipo,
    inicio: now,
    fim: now + DEF_EXPEDICAO[tipo].segundos * 1000,
    sucesso,
    chance: prev.chance,
    moedas: prev.moedas * fator,
    xp: prev.xp * fator,
    reputacao: sucesso ? prev.reputacao : 0,
    fragmentos: fragmento ? 1 : 0,
  }
  return {
    ...s,
    rng: b.rng,
    expedicoes: [...s.expedicoes, exp],
    proximoIdExpedicao: s.proximoIdExpedicao + 1,
  }
}

export const voltou = (e: Expedicao, now: number): boolean => now >= e.fim

/** Segundos que faltam para voltar (0 se já voltou). */
export function segundosParaVoltar(e: Expedicao, now: number): number {
  return Math.max(0, (e.fim - now) / 1000)
}

/** Expedições que já voltaram e esperam a coleta. */
export function retornosPendentes(s: GameState, now: number): Expedicao[] {
  return s.expedicoes.filter((e) => voltou(e, now))
}

export interface Coleta {
  moedas: number
  xp: number
  reputacao: number
  fragmentos: number
  sucessos: number
  falhas: number
}

export const COLETA_ZERO: Readonly<Coleta> = { moedas: 0, xp: 0, reputacao: 0, fragmentos: 0, sucessos: 0, falhas: 0 }

export function somarColeta(a: Coleta, e: Expedicao): Coleta {
  return {
    moedas: a.moedas + e.moedas,
    xp: a.xp + e.xp,
    reputacao: a.reputacao + e.reputacao,
    fragmentos: a.fragmentos + e.fragmentos,
    sucessos: a.sucessos + (e.sucesso ? 1 : 0),
    falhas: a.falhas + (e.sucesso ? 0 : 1),
  }
}

/** Coleta uma expedição que já voltou: credita moedas, XP, reputação e fragmentos. */
export function coletar(s: GameState, expedicaoId: number, now: number): { estado: GameState; coleta: Coleta } {
  const e = s.expedicoes.find((x) => x.id === expedicaoId)
  if (!e || !voltou(e, now)) return { estado: s, coleta: { ...COLETA_ZERO } }
  let estado: GameState = {
    ...s,
    expedicoes: s.expedicoes.filter((x) => x.id !== expedicaoId),
    moedas: s.moedas + e.moedas,
    moedasGanhas: s.moedasGanhas + e.moedas,
    reputacao: s.reputacao + e.reputacao,
    fragmentos: s.fragmentos + e.fragmentos,
  }
  const h = acharHeroi(estado, e.heroi)
  if (h) estado = substituirHeroi(estado, darXpHeroi(h, e.xp))
  return { estado, coleta: somarColeta({ ...COLETA_ZERO }, e) }
}

/** Coleta tudo que já voltou. */
export function coletarTodas(s: GameState, now: number): { estado: GameState; coleta: Coleta } {
  let estado = s
  let coleta: Coleta = { ...COLETA_ZERO }
  for (const e of retornosPendentes(s, now)) {
    const r = coletar(estado, e.id, now)
    estado = r.estado
    coleta = {
      moedas: coleta.moedas + r.coleta.moedas,
      xp: coleta.xp + r.coleta.xp,
      reputacao: coleta.reputacao + r.coleta.reputacao,
      fragmentos: coleta.fragmentos + r.coleta.fragmentos,
      sucessos: coleta.sucessos + r.coleta.sucessos,
      falhas: coleta.falhas + r.coleta.falhas,
    }
  }
  return { estado, coleta }
}


