// Contadores do jogador (fatia 5). Vivem no save e SOBREVIVEM ao Reforjar: contam a vida toda do
// vilarejo, não só o ciclo. Alimentam as conquistas e a tela de estatísticas escondida (GDD §8).
// Tudo puro: o relógio e a visibilidade da aba ficam na store.
import type { GameState } from './state.ts'

export interface Estatisticas {
  lingotesFundidos: number
  itensForjados: number
  lendariosForjados: number
  /** Tarefas da bigorna concluídas (base do "% de forjas com minigame"). */
  forjasTotal: number
  /** Dessas, quantas tiveram a batida registrada (acertando ou errando). */
  forjasComBatida: number
  /** Sequência atual de batidas perfeitas. Forja automática não quebra nem soma; "bom" e "errou" zeram. */
  perfeitasSeguidas: number
  melhorSequenciaPerfeita: number
  encomendasEntregues: number
  encomendasExpiradas: number
  /** Entregas feitas com no máximo 1 min de prazo sobrando. */
  entregasNaHoraH: number
  sessoes: number
  tempoAtivoSegundos: number
}

export function estatisticasIniciais(): Estatisticas {
  return {
    lingotesFundidos: 0,
    itensForjados: 0,
    lendariosForjados: 0,
    forjasTotal: 0,
    forjasComBatida: 0,
    perfeitasSeguidas: 0,
    melhorSequenciaPerfeita: 0,
    encomendasEntregues: 0,
    encomendasExpiradas: 0,
    entregasNaHoraH: 0,
    sessoes: 0,
    tempoAtivoSegundos: 0,
  }
}

export const CAMPOS_ESTATISTICAS = Object.keys(estatisticasIniciais()) as (keyof Estatisticas)[]

/** Abrir o app (ou voltar depois de um bom tempo fora) é uma sessão. */
export function registrarSessao(s: GameState): GameState {
  return { ...s, stats: { ...s.stats, sessoes: s.stats.sessoes + 1 } }
}

/** Tempo com o app visível e em primeiro plano. Só o tick normal soma; o offline não conta. */
export function somarTempoAtivo(s: GameState, segundos: number): GameState {
  if (!(segundos > 0) || !Number.isFinite(segundos)) return s
  return { ...s, stats: { ...s.stats, tempoAtivoSegundos: s.stats.tempoAtivoSegundos + segundos } }
}

/** Fração (0..1) das forjas feitas com o minigame, ou null se ainda não há forja. */
export function fracaoComBatida(e: Estatisticas): number | null {
  return e.forjasTotal > 0 ? e.forjasComBatida / e.forjasTotal : null
}

/** Duração média de uma sessão em segundos, ou null sem sessão. */
export function duracaoMediaSessao(e: Estatisticas): number | null {
  return e.sessoes > 0 ? e.tempoAtivoSegundos / e.sessoes : null
}
