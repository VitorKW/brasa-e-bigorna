import {
  RECEITA_LINGOTE,
  producaoCarvoaria,
  producaoMina,
  velocidadeFornalha,
  type EstacaoId,
} from './constants.ts'
import type { GameState } from './state.ts'

export interface Taxas {
  minerio: number
  carvao: number
  /** Capacidade da fornalha (lingotes/s) com insumo à vontade. */
  fornalha: number
  /** Lingotes/s em regime, limitado pelo elo mais fraco da cadeia. */
  lingote: number
}

export function taxas(s: GameState): Taxas {
  const minerio = producaoMina(s.niveis.mina)
  const carvao = producaoCarvoaria(s.niveis.carvoaria)
  const fornalha = velocidadeFornalha(s.niveis.fornalha)
  const lingote = Math.min(
    fornalha,
    minerio / RECEITA_LINGOTE.minerio,
    carvao / RECEITA_LINGOTE.carvao,
  )
  return { minerio, carvao, fornalha, lingote }
}

export type EstadoFornalha = 'trabalhando' | 'sem-minerio' | 'sem-carvao'

export interface AnaliseCadeia {
  fornalha: EstadoFornalha
  /** Elo que limita a cadeia (empate favorece a fornalha). */
  gargalo: EstacaoId
}

/**
 * A fornalha está "parada por falta de insumo" quando a oferta é menor que o
 * que ela consome E o estoque não cobre 1 s de operação. Assim, um estoque
 * baixo com oferta sobrando (ex.: jogador vendeu tudo) não acende o alerta.
 */
export function analisarCadeia(s: GameState): AnaliseCadeia {
  const t = taxas(s)
  const porMinerio = t.minerio / RECEITA_LINGOTE.minerio
  const porCarvao = t.carvao / RECEITA_LINGOTE.carvao

  const faltaMinerio =
    porMinerio < t.fornalha && s.recursos.minerio < RECEITA_LINGOTE.minerio * t.fornalha
  const faltaCarvao =
    porCarvao < t.fornalha && s.recursos.carvao < RECEITA_LINGOTE.carvao * t.fornalha

  let fornalha: EstadoFornalha = 'trabalhando'
  if (faltaMinerio && (!faltaCarvao || porMinerio <= porCarvao)) fornalha = 'sem-minerio'
  else if (faltaCarvao) fornalha = 'sem-carvao'

  let gargalo: EstacaoId = 'fornalha'
  if (porMinerio < t.fornalha && porMinerio <= porCarvao) gargalo = 'mina'
  else if (porCarvao < t.fornalha) gargalo = 'carvoaria'

  return { fornalha, gargalo }
}
