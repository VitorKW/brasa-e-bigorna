import { PRECO_VENDA, custoUpgrade, type EstacaoId, type RecursoId } from './constants.ts'
import type { GameState } from './state.ts'

export function custoProximoNivel(s: GameState, estacao: EstacaoId): number {
  return custoUpgrade(estacao, s.niveis[estacao])
}

export function podeComprar(s: GameState, estacao: EstacaoId): boolean {
  return s.moedas >= custoProximoNivel(s, estacao)
}

/** Compra 1 nível. Sem moeda suficiente devolve o MESMO estado (sem efeito). */
export function comprarUpgrade(s: GameState, estacao: EstacaoId): GameState {
  const custo = custoProximoNivel(s, estacao)
  if (s.moedas < custo) return s
  return {
    ...s,
    moedas: s.moedas - custo,
    niveis: { ...s.niveis, [estacao]: s.niveis[estacao] + 1 },
  }
}

/**
 * Vende `quantidade` (ou 'tudo') de um recurso. A quantidade é limitada ao
 * estoque; valores inválidos ou <= 0 não fazem nada.
 */
export function vender(
  s: GameState,
  recurso: RecursoId,
  quantidade: number | 'tudo' = 'tudo',
): { estado: GameState; ganho: number } {
  const estoque = s.recursos[recurso]
  const qtd = quantidade === 'tudo' ? estoque : Math.min(quantidade, estoque)
  if (!(qtd > 0) || !Number.isFinite(qtd)) return { estado: s, ganho: 0 }
  const ganho = qtd * PRECO_VENDA[recurso]
  return {
    estado: {
      ...s,
      recursos: { ...s.recursos, [recurso]: estoque - qtd },
      moedas: s.moedas + ganho,
      moedasGanhas: s.moedasGanhas + ganho,
    },
    ganho,
  }
}
