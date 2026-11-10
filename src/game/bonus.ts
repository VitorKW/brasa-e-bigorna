// Bônus permanentes e de construção, aplicados pelas funções puras do jogo (produção, venda, teto
// offline, qualidade, expedições, vagas de herói). Um lugar só para o sim e a UI lerem os mesmos números.
import { OFFLINE } from './constants.ts'
import { ARMAZEM_HORAS, FATOR_SEGUNDA_FORNALHA, MERCADO_BONUS, temConstrucao } from './construcoes.ts'
import type { GameState } from './state.ts'
import { EFEITO, temTalento } from './talentos.ts'

type Dados = Pick<GameState, 'talentos' | 'construcoes' | 'brasas'>

/** Brasas não gastas: +2 % de produção cada. */
export const bonusBrasas = (s: Pick<GameState, 'brasas'>): number => 1 + EFEITO.brasaPassiva * s.brasas

/** Multiplicador de toda a produção (cinco estações): brasas não gastas e "Fogo ancestral". */
export function multProducaoGlobal(s: Dados): number {
  return bonusBrasas(s) * (temTalento(s, 'fornalheiro_4') ? 1 + EFEITO.fogoAncestral : 1)
}

/** Mina e Carvoaria ("Veios generosos"). */
export const multMinaCarvoaria = (s: Dados): number => (temTalento(s, 'fornalheiro_3') ? 1 + EFEITO.veios : 1)

/** Fornalha: "Foles novos" e Segunda fornalha. */
export function multFornalha(s: Dados): number {
  return (
    (temTalento(s, 'fornalheiro_1') ? 1 + EFEITO.foles : 1) *
    (temConstrucao(s, 'segunda_fornalha') ? FATOR_SEGUNDA_FORNALHA : 1)
  )
}

/** Forno de aço: "Foles novos". */
export const multForno = (s: Dados): number => (temTalento(s, 'fornalheiro_1') ? 1 + EFEITO.foles : 1)

/** Preço de venda de recursos e itens (Mercado). */
export const multVenda = (s: Dados): number => (temConstrucao(s, 'mercado') ? 1 + MERCADO_BONUS : 1)

/** Teto da produção offline em segundos: 2 h + Armazém + talentos, no máximo 12 h. */
export function tetoOfflineSegundos(s: Dados): number {
  let horas = OFFLINE.tetoSegundos / 3600
  if (temConstrucao(s, 'armazem')) horas += ARMAZEM_HORAS
  if (temTalento(s, 'fornalheiro_2')) horas += EFEITO.sonoHoras
  if (temTalento(s, 'capitao_4')) horas += EFEITO.vigiasHoras
  return Math.min(horas * 3600, OFFLINE.tetoMaximoSegundos)
}

/** Qualidade fixa somada ao Q de todo item ("Mão firme", "Obra-prima"). */
export function bonusQualidadeTalentos(s: Dados): number {
  return (temTalento(s, 'mestre_1') ? EFEITO.maoFirmeQ : 0) + (temTalento(s, 'mestre_4') ? EFEITO.obraPrimaQ : 0)
}

/** XP dos ferreiros ("Escola de ofício"). */
export const multXpFerreiro = (s: Dados): number => (temTalento(s, 'mestre_3') ? 1 + EFEITO.escolaXp : 1)

/** Quantos heróis o grupo comporta: 4, mais o "Quinto herói". */
export const maxHerois = (s: Dados): number => 4 + (temTalento(s, 'capitao_2') ? EFEITO.quintoHeroi : 0)

export interface BonusExpedicao {
  /** Somado à chance de sucesso (antes do limite de 5 a 95 %). */
  chance: number
  /** Multiplicador de moedas e de XP. */
  loot: number
}

export const BONUS_EXPEDICAO_ZERO: Readonly<BonusExpedicao> = { chance: 0, loot: 1 }

export function bonusExpedicao(s: Dados): BonusExpedicao {
  return {
    chance: temTalento(s, 'capitao_3') ? EFEITO.rotaSegura : 0,
    loot: temTalento(s, 'capitao_1') ? 1 + EFEITO.bandeira : 1,
  }
}
