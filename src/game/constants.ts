// Curvas do GDD §4.2 (fatias 1 e 2). Funções puras, sem React.

/** Estações que produzem de forma contínua (a bigorna trabalha por tarefas, em bigorna.ts). */
export const ESTACOES_PRODUCAO = ['mina', 'carvoaria', 'fornalha'] as const
export type EstacaoProducao = (typeof ESTACOES_PRODUCAO)[number]

export const ESTACOES = [...ESTACOES_PRODUCAO, 'bigorna'] as const
export type EstacaoId = (typeof ESTACOES)[number]

export const RECURSOS = ['minerio', 'carvao', 'lingote'] as const
export type RecursoId = (typeof RECURSOS)[number]

/** Custo do upgrade n -> n+1 = base * taxa^n. */
export const CUSTO_UPGRADE: Record<EstacaoId, { base: number; taxa: number }> = {
  mina: { base: 10, taxa: 1.15 },
  carvoaria: { base: 15, taxa: 1.15 },
  fornalha: { base: 50, taxa: 1.18 },
  /** Nível 0 = bloqueada: o custo do nível 0 -> 1 é o custo de desbloqueio. */
  bigorna: { base: 200, taxa: 1.2 },
}

/** Tempo de forja = base * 0,92^(n-1) (GDD §4.2). */
export const BIGORNA = {
  fatorTempoPorNivel: 0.92,
  /** Custo do nível 0 -> 1 (desbloqueio). Os níveis seguintes seguem 200 × 1,2^n. Achado pelo sim. */
  custoDesbloqueio: 500,
} as const

/** Produção por segundo no nível 1 (mina e carvoaria). */
export const PRODUCAO_BASE = { mina: 1, carvoaria: 0.5 } as const

export const FORNALHA = { base: 0.25, bonusPorNivel: 0.15 } as const

/** Insumos por lingote (GDD §3). */
export const RECEITA_LINGOTE = { minerio: 2, carvao: 1 } as const

export const PRECO_VENDA: Record<RecursoId, number> = {
  minerio: 0.2,
  carvao: 0.3,
  lingote: 2,
}

/** Níveis em que a produção dobra (acumulativo). */
export const NIVEIS_MARCO = [10, 25, 50, 100] as const

export const OFFLINE = {
  tetoSegundos: 2 * 60 * 60,
  passoSegundos: 10,
  /** Abaixo disso o modal "Enquanto você estava fora" não aparece. */
  minimoModalSegundos: 30,
} as const

export const MOEDAS_INICIAIS = 10
export const SAVE_VERSION = 2

/** marco(n) = 2 ^ (quantidade de marcos já atingidos). */
export function marco(n: number): number {
  let m = 1
  for (const nivel of NIVEIS_MARCO) if (n >= nivel) m *= 2
  return m
}

/** Custo para subir a estação do nível n para n+1. */
export function custoUpgrade(estacao: EstacaoId, n: number): number {
  if (estacao === 'bigorna' && n === 0) return BIGORNA.custoDesbloqueio
  const { base, taxa } = CUSTO_UPGRADE[estacao]
  return base * Math.pow(taxa, n)
}

/** Tempo (s) para forjar um item no nível n da bigorna, sem bônus de ferreiro. */
export function tempoForjaBase(segundosBase: number, n: number): number {
  return segundosBase * Math.pow(BIGORNA.fatorTempoPorNivel, Math.max(0, n - 1))
}

export function producaoMina(n: number): number {
  return PRODUCAO_BASE.mina * n * marco(n)
}

export function producaoCarvoaria(n: number): number {
  return PRODUCAO_BASE.carvoaria * n * marco(n)
}

/** Velocidade da fornalha em lingotes/s (capacidade, se houver insumo). */
export function velocidadeFornalha(n: number): number {
  return FORNALHA.base * (1 + FORNALHA.bonusPorNivel * (n - 1)) * marco(n)
}
