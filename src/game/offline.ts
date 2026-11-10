import { tetoOfflineSegundos } from './bonus.ts'
import { OFFLINE } from './constants.ts'
import { abandonarMinigame, inventarioCheio } from './bigorna.ts'
import { avancarEncomendas } from './encomendas.ts'
import { COLETA_ZERO, somarColeta, type Coleta, type ExpedicaoId } from './expedicoes.ts'
import type { Qualidade } from './items.ts'
import type { GameState } from './state.ts'
import { PRODUZIDO_ZERO, tickDetalhado, type Produzido, type ResultadoTick } from './tick.ts'

/** Expedições que voltaram enquanto o app estava fechado (o loot espera a coleta no Mapa). */
export interface ResumoExpedicoes {
  voltaram: { heroi: string; expedicao: ExpedicaoId; sucesso: boolean }[]
  /** Soma do loot já sorteado na partida. */
  loot: Coleta
}

export interface ResumoOffline {
  /** Tempo real que passou desde o último tick (>= 0). */
  segundosAusente: number
  /** Tempo efetivamente simulado (limitado pelo teto). */
  segundosSimulados: number
  limitadoPeloTeto: boolean
  /** Total bruto produzido (minério/carvão produzidos; lingotes fundidos). */
  produzido: Produzido
  /** Itens forjados enquanto o app estava fechado, por qualidade (sem minigame). */
  forjados: Record<Qualidade, number>
  totalForjados: number
  /** A bigorna parou porque o inventário encheu. */
  inventarioCheio: boolean
  expedicoes: ResumoExpedicoes
  /** Venda automática (fatia 5): itens que a bigorna fez e o jogo vendeu sozinho enquanto você estava fora. */
  vendidosAuto: number
  ganhoAuto: number
}

/**
 * Simula o tempo em que o app ficou fechado, em passos de 10 s para respeitar
 * gargalos. Relógio que voltou (intervalo negativo) é ignorado sem punição.
 * Um minigame que ficou aberto vale o bônus automático (sem segunda chance).
 */
export function applyOffline(
  s: GameState,
  now: number,
  /** Chamado a cada passo simulado (o simulador usa para contar itens e marcos; o jogo não precisa). */
  observador?: (passo: ResultadoTick) => void,
): { estado: GameState; resumo: ResumoOffline } {
  const bruto = (now - s.lastTick) / 1000
  const segundosAusente = Number.isFinite(bruto) && bruto > 0 ? bruto : 0
  const teto = tetoOfflineSegundos(s)
  const segundosSimulados = Math.min(segundosAusente, teto)

  // Voltaram durante a ausência: o fim cai depois do último tick e até agora. O teto de 2 h só
  // vale para a produção: uma expedição de 8 h volta no relógio, esteja o app aberto ou não.
  const voltaram = s.expedicoes.filter((e) => e.fim > s.lastTick && e.fim <= now)
  const expedicoes: ResumoExpedicoes = {
    voltaram: voltaram.map((e) => ({
      heroi: s.herois.find((h) => h.id === e.heroi)?.nome ?? 'Herói',
      expedicao: e.tipo,
      sucesso: e.sucesso,
    })),
    loot: voltaram.reduce(somarColeta, { ...COLETA_ZERO }),
  }

  let estado = abandonarMinigame(s)
  const produzido: Produzido = { ...PRODUZIDO_ZERO }
  const forjados: Record<Qualidade, number> = { comum: 0, incomum: 0, raro: 0, epico: 0, lendario: 0 }
  let totalForjados = 0
  let vendidosAuto = 0
  let ganhoAuto = 0
  let restante = segundosSimulados
  while (restante > 1e-9) {
    const dt = Math.min(OFFLINE.passoSegundos, restante)
    const r = tickDetalhado(estado, dt)
    estado = r.estado
    observador?.(r)
    produzido.minerio += r.produzido.minerio
    produzido.carvao += r.produzido.carvao
    produzido.lingote += r.produzido.lingote
    produzido.aco += r.produzido.aco
    vendidosAuto += r.vendaAuto.quantidade
    ganhoAuto += r.vendaAuto.ganho
    for (const f of r.forjados) {
      forjados[f.item.qualidade]++
      totalForjados++
    }
    restante -= dt
  }

  // Encomendas: o que venceu some e, se for a hora, surge um pedido novo (no máximo um por abertura).
  estado = avancarEncomendas(estado, now)

  return {
    estado: { ...estado, lastTick: now },
    resumo: {
      segundosAusente,
      segundosSimulados,
      limitadoPeloTeto: segundosAusente > teto,
      produzido,
      forjados,
      totalForjados,
      inventarioCheio: estado.niveis.bigorna >= 1 && inventarioCheio(estado) && totalForjados > 0,
      expedicoes,
      vendidosAuto,
      ganhoAuto,
    },
  }
}
