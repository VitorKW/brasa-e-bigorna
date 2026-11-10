import { FORNO, RECEITA_ACO, RECEITA_LINGOTE, type RecursoId } from './constants.ts'
import { avancarBigorna, type Forjado } from './bigorna.ts'
import { taxas } from './chain.ts'
import { XP_DIVISOR, darXp } from './ferreiros.ts'
import { venderInuteis } from './inventario.ts'
import type { GameState } from './state.ts'

export type Produzido = Record<RecursoId, number>

export const PRODUZIDO_ZERO: Readonly<Produzido> = { minerio: 0, carvao: 0, lingote: 0, aco: 0 }

/**
 * Com a bigorna ativa, passos grandes (offline: 10 s) são fatiados em até 1 s, para que a
 * bigorna não perca tempo esperando lingotes que chegariam no meio do passo.
 */
const SUBPASSO_SEGUNDOS = 1

/** Venda automática (fatia 5): o que a bigorna entregou e o estado vendeu sozinho no intervalo. */
export interface VendaAuto {
  quantidade: number
  ganho: number
}

export interface ResultadoTick {
  estado: GameState
  produzido: Produzido
  /** Itens concluídos neste intervalo, na ordem. */
  forjados: Forjado[]
  vendaAuto: VendaAuto
}

const VENDA_AUTO_ZERO: Readonly<VendaAuto> = { quantidade: 0, ganho: 0 }

/** Um passo sem fatiar: mina/carvoaria/fornalha, XP dos ferreiros e bigorna. */
function passo(s: GameState, dt: number): ResultadoTick {
  const t = taxas(s)
  const minerioProd = t.minerio * dt
  const carvaoProd = t.carvao * dt
  const minerio = s.recursos.minerio + minerioProd
  const carvao = s.recursos.carvao + carvaoProd

  const lingotes = Math.min(
    t.fornalha * dt,
    minerio / RECEITA_LINGOTE.minerio,
    carvao / RECEITA_LINGOTE.carvao,
  )

  let estado: GameState = {
    ...s,
    recursos: {
      minerio: minerio - lingotes * RECEITA_LINGOTE.minerio,
      carvao: carvao - lingotes * RECEITA_LINGOTE.carvao,
      lingote: s.recursos.lingote + lingotes,
      aco: s.recursos.aco,
    },
    stats: { ...s.stats, lingotesFundidos: s.stats.lingotesFundidos + lingotes },
  }
  estado = darXp(estado, 'mina', minerioProd / XP_DIVISOR.mina)
  estado = darXp(estado, 'carvoaria', carvaoProd / XP_DIVISOR.carvoaria)
  estado = darXp(estado, 'fornalha', lingotes / XP_DIVISOR.fornalha)

  // Forno de aço: pega os lingotes e o carvão que sobraram da fornalha (a fornalha tem prioridade
  // no carvão). Para quando o estoque de aço enche, para não engolir lingotes de ferro à toa.
  let aco = 0
  if (s.niveis.forno >= 1) {
    aco = Math.max(
      0,
      Math.min(
        t.forno * dt,
        estado.recursos.lingote / RECEITA_ACO.lingote,
        estado.recursos.carvao / RECEITA_ACO.carvao,
        FORNO.estoqueMaximo - estado.recursos.aco,
      ),
    )
    estado = {
      ...estado,
      recursos: {
        ...estado.recursos,
        lingote: estado.recursos.lingote - aco * RECEITA_ACO.lingote,
        carvao: estado.recursos.carvao - aco * RECEITA_ACO.carvao,
        aco: estado.recursos.aco + aco,
      },
    }
    estado = darXp(estado, 'forno', aco / XP_DIVISOR.forno)
  }

  const b = avancarBigorna(estado, dt)
  // Venda automática: só confere quando a bigorna concluiu algo neste passo.
  let vendaAuto: VendaAuto = { ...VENDA_AUTO_ZERO }
  let final = b.estado
  if (final.autoVenda && b.forjados.length > 0) {
    const v = venderInuteis(final)
    final = v.estado
    vendaAuto = { quantidade: v.vendidos, ganho: v.ganho }
  }
  return {
    estado: final,
    produzido: { minerio: minerioProd, carvao: carvaoProd, lingote: lingotes, aco },
    forjados: b.forjados,
    vendaAuto,
  }
}

/**
 * Avança `dt` segundos. Mina e carvoaria produzem; a fornalha converte
 * 2 minério + 1 carvão por lingote, limitada pela velocidade e pelo estoque
 * (gargalo: sem insumo, ela simplesmente não produz). A bigorna consome lingotes.
 * Não mexe em `lastTick`: quem chama decide o relógio.
 */
export function tickDetalhado(s: GameState, dtSeconds: number): ResultadoTick {
  if (!(dtSeconds > 0) || !Number.isFinite(dtSeconds)) {
    return { estado: s, produzido: { ...PRODUZIDO_ZERO }, forjados: [], vendaAuto: { ...VENDA_AUTO_ZERO } }
  }
  if (s.niveis.bigorna < 1 || dtSeconds <= SUBPASSO_SEGUNDOS) return passo(s, dtSeconds)

  let estado = s
  const produzido: Produzido = { ...PRODUZIDO_ZERO }
  const forjados: Forjado[] = []
  const vendaAuto: VendaAuto = { ...VENDA_AUTO_ZERO }
  let restante = dtSeconds
  while (restante > 1e-9) {
    const r = passo(estado, Math.min(SUBPASSO_SEGUNDOS, restante))
    estado = r.estado
    produzido.minerio += r.produzido.minerio
    produzido.carvao += r.produzido.carvao
    produzido.lingote += r.produzido.lingote
    produzido.aco += r.produzido.aco
    forjados.push(...r.forjados)
    vendaAuto.quantidade += r.vendaAuto.quantidade
    vendaAuto.ganho += r.vendaAuto.ganho
    restante -= SUBPASSO_SEGUNDOS
  }
  return { estado, produzido, forjados, vendaAuto }
}

export function tick(s: GameState, dtSeconds: number): GameState {
  return tickDetalhado(s, dtSeconds).estado
}
