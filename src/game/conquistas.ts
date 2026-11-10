// Conquistas (GDD §5, fatia 5). Cada uma é uma função pura do estado: o jogo confere depois de cada
// tick e desbloqueia o que passou a valer. Os contadores vêm de `stats`, que sobrevive ao Reforjar,
// então nada se perde ao recomeçar. Conquista desbloqueada fica para sempre.
import { CONSTRUCOES, temConstrucao } from './construcoes.ts'
import type { GameState } from './state.ts'

export const CONQUISTAS = [
  'primeiro_lingote',
  'cem_itens',
  'primeira_lendaria',
  'dez_perfeitas',
  'primeiro_heroi',
  'golem',
  'primeiro_aco',
  'grupo_completo',
  'primeira_entrega',
  'na_hora_h',
  'dez_entregas',
  'reputacao_mil',
  'serpe',
  'todas_obras',
  'primeiro_reforjar',
  'dois_reforjars',
] as const
export type ConquistaId = (typeof CONQUISTAS)[number]

export interface DefConquista {
  nome: string
  descricao: string
  cumpre: (s: GameState) => boolean
}

export const DEF_CONQUISTA: Record<ConquistaId, DefConquista> = {
  primeiro_lingote: {
    nome: 'Primeiro lingote',
    descricao: 'A fornalha fundiu o primeiro lingote.',
    cumpre: (s) => s.stats.lingotesFundidos >= 1,
  },
  cem_itens: {
    nome: 'Cem peças',
    descricao: 'Forje 100 itens na bigorna.',
    cumpre: (s) => s.stats.itensForjados >= 100,
  },
  primeira_lendaria: {
    nome: 'Primeira lendária',
    descricao: 'Forje um item lendário.',
    cumpre: (s) => s.stats.lendariosForjados >= 1,
  },
  dez_perfeitas: {
    nome: 'Mão de ourives',
    descricao: 'Acerte 10 batidas perfeitas seguidas.',
    cumpre: (s) => s.stats.melhorSequenciaPerfeita >= 10,
  },
  primeiro_heroi: {
    nome: 'Alguém na guilda',
    descricao: 'Recrute o primeiro herói.',
    cumpre: (s) => s.herois.length >= 1,
  },
  golem: {
    nome: 'Golem derrotado',
    descricao: 'Derrube o Golem de Escória.',
    cumpre: (s) => s.chefesDerrotados.includes('golem'),
  },
  primeiro_aco: {
    nome: 'Aço no fogo',
    descricao: 'Construa o Forno de aço.',
    cumpre: (s) => s.niveis.forno >= 1 || s.chefesDerrotados.includes('serpe') || s.reforjas > 0,
  },
  grupo_completo: {
    nome: 'Grupo completo',
    descricao: 'Tenha quatro heróis na guilda.',
    cumpre: (s) => s.herois.length >= 4,
  },
  primeira_entrega: {
    nome: 'Cliente satisfeito',
    descricao: 'Entregue a primeira encomenda.',
    cumpre: (s) => s.stats.encomendasEntregues >= 1,
  },
  na_hora_h: {
    nome: 'Na hora H',
    descricao: 'Entregue uma encomenda com 1 minuto ou menos de prazo sobrando.',
    cumpre: (s) => s.stats.entregasNaHoraH >= 1,
  },
  dez_entregas: {
    nome: 'Ferreiro de confiança',
    descricao: 'Entregue 10 encomendas.',
    cumpre: (s) => s.stats.encomendasEntregues >= 10,
  },
  reputacao_mil: {
    nome: 'Nome conhecido',
    descricao: 'Chegue a 1 000 de reputação.',
    cumpre: (s) => s.reputacao >= 1000,
  },
  serpe: {
    nome: 'Serpe de Cinza derrotada',
    descricao: 'Derrube a Serpe na Serra Cinzenta.',
    cumpre: (s) => s.chefesDerrotados.includes('serpe'),
  },
  todas_obras: {
    nome: 'Vilarejo de pedra',
    descricao: 'Construa as cinco obras do vilarejo.',
    cumpre: (s) => CONSTRUCOES.every((c) => temConstrucao(s, c)),
  },
  primeiro_reforjar: {
    nome: 'Primeiro Reforjar',
    descricao: 'Reforje a forja pela primeira vez.',
    cumpre: (s) => s.reforjas >= 1,
  },
  dois_reforjars: {
    nome: 'A forja não esquece',
    descricao: 'Reforje duas vezes.',
    cumpre: (s) => s.reforjas >= 2,
  },
}

/** Conquistas cujas condições já valem e que ainda não foram desbloqueadas. */
export function novasConquistas(s: GameState): ConquistaId[] {
  return CONQUISTAS.filter((id) => !s.conquistas.includes(id) && DEF_CONQUISTA[id].cumpre(s))
}

/**
 * Desbloqueia o que passou a valer. Sem novidade devolve o MESMO estado (a store chama isso a cada tick).
 */
export function aplicarConquistas(s: GameState): { estado: GameState; novas: ConquistaId[] } {
  const novas = novasConquistas(s)
  if (novas.length === 0) return { estado: s, novas }
  return { estado: { ...s, conquistas: [...s.conquistas, ...novas] }, novas }
}
