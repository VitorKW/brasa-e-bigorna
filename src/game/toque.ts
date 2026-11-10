// Toque na cena da forja (fatia 6): o jogador ativo "ajuda" as estações com o dedo.
// Cada toque vale uma fração de segundo da produção da estação, com um piso para que, no começo,
// cavar com o dedo faça diferença de verdade. Mais tarde o idle domina e o toque vira tempero:
// com o intervalo mínimo entre toques, um dedo rápido (uns 6 toques/s) soma no máximo ~60 % à
// produção de UMA estação enquanto durar o esforço. O sim não toca: o balanceamento parado não muda.
import { taxas } from './chain.ts'
import { RECEITA_LINGOTE } from './constants.ts'
import type { GameState } from './state.ts'

export const TOQUE = {
  /** Segundos de produção que cada toque rende. */
  segundos: 0.1,
  /** Intervalo mínimo entre toques na mesma estação (a store ignora os que vierem antes). */
  intervaloMinMs: 100,
  /** Mínimo por toque na mina e na carvoaria (o começo do jogo é cavar). */
  pisoMina: 1,
  pisoCarvoaria: 0.5,
  /** Mínimo de lingotes por toque na fornalha (se houver insumo). */
  pisoFornalha: 0.5,
  /** Na bigorna, cada martelada adianta esta fração da peça. */
  avancoBigorna: 0.08,
} as const

export type AlvoToque = 'mina' | 'carvoaria' | 'fornalha' | 'bigorna'

export interface ResultadoToque {
  estado: GameState
  /** Quanto rendeu (minério, carvão, lingotes ou % da peça). 0 = o toque não fez nada. */
  ganho: number
}

const nada = (s: GameState): ResultadoToque => ({ estado: s, ganho: 0 })

export function tocar(s: GameState, alvo: AlvoToque): ResultadoToque {
  const t = taxas(s)
  switch (alvo) {
    case 'mina': {
      const ganho = Math.max(TOQUE.pisoMina, t.minerio * TOQUE.segundos)
      return { estado: { ...s, recursos: { ...s.recursos, minerio: s.recursos.minerio + ganho } }, ganho }
    }
    case 'carvoaria': {
      const ganho = Math.max(TOQUE.pisoCarvoaria, t.carvao * TOQUE.segundos)
      return { estado: { ...s, recursos: { ...s.recursos, carvao: s.recursos.carvao + ganho } }, ganho }
    }
    case 'fornalha': {
      // Atiçar o fogo funde na hora uma fração de segundo da fornalha, se houver insumo no estoque.
      const quer = Math.max(TOQUE.pisoFornalha, t.fornalha * TOQUE.segundos)
      const ganho = Math.floor(
        Math.min(quer, s.recursos.minerio / RECEITA_LINGOTE.minerio, s.recursos.carvao / RECEITA_LINGOTE.carvao) * 100,
      ) / 100
      if (ganho <= 0) return nada(s)
      return {
        estado: {
          ...s,
          recursos: {
            ...s.recursos,
            minerio: s.recursos.minerio - ganho * RECEITA_LINGOTE.minerio,
            carvao: s.recursos.carvao - ganho * RECEITA_LINGOTE.carvao,
            lingote: s.recursos.lingote + ganho,
          },
          stats: { ...s.stats, lingotesFundidos: s.stats.lingotesFundidos + ganho },
        },
        ganho,
      }
    }
    case 'bigorna': {
      const f = s.forja
      // Só martela peça em andamento: nem a pronta, nem a que espera a batida do minigame.
      if (!f || f.progresso >= 1 || f.minigame === 'pendente') return nada(s)
      const progresso = Math.min(0.999, f.progresso + TOQUE.avancoBigorna)
      const ganho = progresso - f.progresso
      if (ganho <= 0) return nada(s)
      return { estado: { ...s, forja: { ...f, progresso } }, ganho }
    }
  }
}
