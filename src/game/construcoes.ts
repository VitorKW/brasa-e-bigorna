// Construções do vilarejo (GDD §5). Liberadas por reputação, que é um limiar e não se gasta,
// e pagas com moedas `[suposição]` (para a compra ter peso). Funções puras.
import type { ChefeId } from './chefe.ts'
import type { GameState } from './state.ts'

export const CONSTRUCOES = ['segunda_fornalha', 'armazem', 'taverna', 'mercado', 'muralha'] as const
export type ConstrucaoId = (typeof CONSTRUCOES)[number]

export interface DefConstrucao {
  nome: string
  /** Reputação mínima (limiar: não é gasta). */
  reputacao: number
  /** Custo em moedas, calibrado pelo sim `[suposição]`. */
  custo: number
  /** Chefe que precisa estar derrotado (só a Muralha). */
  exige: ChefeId | null
  descricao: string
  /** Texto curto do efeito, para a UI. */
  efeito: string
}

/**
 * A Segunda fornalha multiplica a velocidade da fornalha por este fator `[suposição]`. Ajustado pelo sim: com ×2
 * a fornalha deixava lingotes de sobra, a bigorna forjava ferro em paralelo ao aço e os épicos de ferro passavam de
 * 10 % nas primeiras 3 h (meta do GDD §4.4); com ×1,5 ficam em ~9,7 %.
 */
export const FATOR_SEGUNDA_FORNALHA = 1.5
export const ARMAZEM_HORAS = 2
export const MERCADO_BONUS = 0.15

export const DEF_CONSTRUCAO: Record<ConstrucaoId, DefConstrucao> = {
  segunda_fornalha: {
    nome: 'Segunda fornalha',
    reputacao: 50,
    custo: 3_000,
    exige: null,
    descricao: 'Uma fornalha gêmea ao lado da primeira.',
    efeito: 'Fornalha 50 % mais rápida.',
  },
  armazem: {
    nome: 'Armazém',
    reputacao: 150,
    custo: 25_000,
    exige: null,
    descricao: 'Mais espaço para a forja guardar o que produz sozinha.',
    efeito: `+${ARMAZEM_HORAS} h no teto de produção offline.`,
  },
  taverna: {
    nome: 'Taverna',
    reputacao: 400,
    // Fatia 5: 11 M -> 32 M. A venda automática multiplicou a renda por ~2,8; 31 a 32 M é a faixa em que a Serpe cai
    // entre 24 h e 28 h 36 min em todos os passos do sim (GDD §4.2, notas da fatia 5).
    custo: 32_000_000,
    exige: null,
    descricao: 'Aventureiros param aqui para beber e ouvir propostas.',
    efeito: 'Abre a 4ª vaga de herói.',
  },
  mercado: {
    nome: 'Mercado',
    reputacao: 650,
    custo: 9_000_000, // fatia 5: era 10 M
    exige: null,
    descricao: 'Barracas, balanças e gente de fora comprando.',
    efeito: `+${Math.round(MERCADO_BONUS * 100)} % no preço de venda de recursos e itens.`,
  },
  muralha: {
    nome: 'Muralha',
    reputacao: 1000,
    custo: 18_000_000, // fatia 5: era 12 M; sai ~7 h 30 min depois da Serpe (era 27 h)
    exige: 'serpe',
    descricao: 'Com a Serpe de Cinza vencida, o vilarejo ergue pedra e vira cidade.',
    efeito: 'Libera o Reforjar.',
  },
}

export const temConstrucao = (s: Pick<GameState, 'construcoes'>, id: ConstrucaoId): boolean =>
  s.construcoes.includes(id)

export type MotivoNaoConstruir = 'construida' | 'reputacao' | 'chefe' | 'moedas'

/** Por que ainda não dá para construir (a primeira razão que falta), ou null se dá. */
export function motivoNaoConstruir(s: GameState, id: ConstrucaoId): MotivoNaoConstruir | null {
  const d = DEF_CONSTRUCAO[id]
  if (temConstrucao(s, id)) return 'construida'
  if (s.reputacao < d.reputacao) return 'reputacao'
  if (d.exige && !s.chefesDerrotados.includes(d.exige)) return 'chefe'
  if (s.moedas < d.custo) return 'moedas'
  return null
}

/** A reputação e o chefe já estão em dia (falta no máximo pagar)? */
export function construcaoLiberada(s: GameState, id: ConstrucaoId): boolean {
  const m = motivoNaoConstruir(s, id)
  return m === null || m === 'moedas'
}

/** Constrói e cobra as moedas. Qualquer pendência devolve o MESMO estado. */
export function construir(s: GameState, id: ConstrucaoId): GameState {
  if (motivoNaoConstruir(s, id) !== null) return s
  return { ...s, moedas: s.moedas - DEF_CONSTRUCAO[id].custo, construcoes: [...s.construcoes, id] }
}
