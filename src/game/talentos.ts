// Árvore de talentos (GDD §5): 3 ramos, 4 tiers cada (12 nós). Brasas Ancestrais pagam os talentos;
// as que sobram dão +2 % de produção cada (por isso gastar tem um custo de oportunidade).
// Cada nó é aplicado por uma função pura em bonus.ts. Funções puras.
import type { GameState } from './state.ts'

export const RAMOS = ['fornalheiro', 'mestre', 'capitao'] as const
export type RamoId = (typeof RAMOS)[number]

export const TALENTOS = [
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
] as const
export type TalentoId = (typeof TALENTOS)[number]

/** Custo em brasas por tier (1 a 4) `[suposição]`: 1, 2, 3, 5. */
export const CUSTO_TIER = [1, 2, 3, 5] as const

/** Valores dos efeitos, num só lugar para os testes e a UI. */
export const EFEITO = {
  /** Brasa não gasta: +2 % de produção cada. */
  brasaPassiva: 0.02,
  foles: 0.3, // fornalheiro_1: fornalha e forno +30 %
  sonoHoras: 2, // fornalheiro_2: +2 h de teto offline
  veios: 0.5, // fornalheiro_3: mina e carvoaria +50 %
  fogoAncestral: 0.3, // fornalheiro_4: toda a produção +30 %
  maoFirmeQ: 5, // mestre_1
  pisoBigorna: 5, // mestre_2: a bigorna nunca fica abaixo do nível 5
  escolaXp: 0.5, // mestre_3: ferreiros ganham +50 % de XP
  obraPrimaQ: 10, // mestre_4
  bandeira: 0.2, // capitao_1: +20 % de moedas e XP nas expedições
  quintoHeroi: 1, // capitao_2: +1 vaga de herói (= +1 expedição simultânea)
  rotaSegura: 0.1, // capitao_3: +10 pontos de chance de sucesso
  vigiasHoras: 4, // capitao_4: +4 h de teto offline
} as const

export interface DefTalento {
  ramo: RamoId
  /** 1 a 4. */
  tier: 1 | 2 | 3 | 4
  nome: string
  descricao: string
}

export const DEF_RAMO: Record<RamoId, { nome: string; resumo: string }> = {
  fornalheiro: { nome: 'Fornalheiro', resumo: 'Produção' },
  mestre: { nome: 'Mestre de forja', resumo: 'Qualidade' },
  capitao: { nome: 'Capitão da guilda', resumo: 'Expedições' },
}

export const DEF_TALENTO: Record<TalentoId, DefTalento> = {
  fornalheiro_1: { ramo: 'fornalheiro', tier: 1, nome: 'Foles novos', descricao: 'Fornalha e Forno de aço 30 % mais rápidos.' },
  fornalheiro_2: { ramo: 'fornalheiro', tier: 2, nome: 'Sono tranquilo', descricao: '+2 h no teto de produção offline.' },
  fornalheiro_3: { ramo: 'fornalheiro', tier: 3, nome: 'Veios generosos', descricao: 'Mina e Carvoaria produzem 50 % a mais.' },
  fornalheiro_4: { ramo: 'fornalheiro', tier: 4, nome: 'Fogo ancestral', descricao: 'Toda a produção 30 % maior.' },
  mestre_1: { ramo: 'mestre', tier: 1, nome: 'Mão firme', descricao: '+5 de qualidade em todo item forjado.' },
  mestre_2: { ramo: 'mestre', tier: 2, nome: 'Bigorna de herança', descricao: 'A bigorna nunca fica abaixo do nível 5, nem depois de Reforjar.' },
  mestre_3: { ramo: 'mestre', tier: 3, nome: 'Escola de ofício', descricao: 'Ferreiros ganham 50 % mais XP.' },
  mestre_4: { ramo: 'mestre', tier: 4, nome: 'Obra-prima', descricao: '+10 de qualidade em todo item forjado.' },
  capitao_1: { ramo: 'capitao', tier: 1, nome: 'Bandeira da guilda', descricao: 'Expedições rendem 20 % mais moedas e XP.' },
  capitao_2: { ramo: 'capitao', tier: 2, nome: 'Quinto herói', descricao: '+1 vaga de herói, e uma expedição a mais ao mesmo tempo.' },
  capitao_3: { ramo: 'capitao', tier: 3, nome: 'Rota segura', descricao: '+10 pontos de chance de sucesso nas expedições.' },
  capitao_4: { ramo: 'capitao', tier: 4, nome: 'Vigias da noite', descricao: '+4 h no teto de produção offline.' },
}

export const custoTalento = (id: TalentoId): number => CUSTO_TIER[DEF_TALENTO[id].tier - 1]!

export const talentosDoRamo = (ramo: RamoId): TalentoId[] => TALENTOS.filter((t) => DEF_TALENTO[t].ramo === ramo)

export const temTalento = (s: Pick<GameState, 'talentos'>, id: TalentoId): boolean => s.talentos.includes(id)

/** O tier anterior do mesmo ramo (null no tier 1). */
export function preRequisito(id: TalentoId): TalentoId | null {
  const d = DEF_TALENTO[id]
  if (d.tier === 1) return null
  return talentosDoRamo(d.ramo).find((t) => DEF_TALENTO[t].tier === d.tier - 1) ?? null
}

/** Brasas gastas em talentos. */
export const brasasGastas = (talentos: readonly TalentoId[]): number => talentos.reduce((t, id) => t + custoTalento(id), 0)

export type MotivoNaoComprarTalento = 'comprado' | 'pre-requisito' | 'brasas'

export function motivoNaoComprarTalento(s: GameState, id: TalentoId): MotivoNaoComprarTalento | null {
  if (temTalento(s, id)) return 'comprado'
  const pre = preRequisito(id)
  if (pre && !temTalento(s, pre)) return 'pre-requisito'
  if (s.brasas < custoTalento(id)) return 'brasas'
  return null
}

/** Piso de nível das estações dado pelos talentos (bigorna 5 com "Bigorna de herança"). */
export function pisoDeNiveis(s: Pick<GameState, 'talentos'>): Partial<GameState['niveis']> {
  return temTalento(s, 'mestre_2') ? { bigorna: EFEITO.pisoBigorna } : {}
}

/** Sobe as estações abaixo do piso (vale na hora da compra e a cada Reforjar). */
export function aplicarPiso(s: GameState): GameState {
  const piso = pisoDeNiveis(s)
  let niveis = s.niveis
  for (const [estacao, minimo] of Object.entries(piso) as [keyof GameState['niveis'], number][]) {
    if (niveis[estacao] < minimo) niveis = { ...niveis, [estacao]: minimo }
  }
  return niveis === s.niveis ? s : { ...s, niveis }
}

/** Compra o talento: gasta brasas, exige o tier anterior do ramo. Pendência = MESMO estado. */
export function comprarTalento(s: GameState, id: TalentoId): GameState {
  if (motivoNaoComprarTalento(s, id) !== null) return s
  return aplicarPiso({ ...s, brasas: s.brasas - custoTalento(id), talentos: [...s.talentos, id] })
}
