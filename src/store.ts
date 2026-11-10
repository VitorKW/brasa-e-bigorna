import { create } from 'zustand'
import { OFFLINE, type EstacaoId, type RecursoId } from './game/constants.ts'
import {
  alternarAutomatico,
  forjar as forjarRegra,
  registrarBatida as registrarBatidaRegra,
  removerDaFila as removerDaFilaRegra,
  type Forjado,
} from './game/bigorna.ts'
import { lutarChefe, type ChefeId, type RecompensaChefe, type ResultadoCombate } from './game/chefe.ts'
import {
  coletar as coletarRegra,
  coletarTodas as coletarTodasRegra,
  partir,
  type Coleta,
  type ExpedicaoId,
} from './game/expedicoes.ts'
import { desequipar as desequiparRegra, equipar as equiparRegra, recrutar as recrutarRegra, type ClasseId } from './game/herois.ts'
import { alocar as alocarRegra, contratar as contratarRegra, type FerreiroId } from './game/ferreiros.ts'
import { venderItem as venderItemRegra, venderPorQualidade } from './game/inventario.ts'
import type { MaterialId, Qualidade, ReceitaId, Slot } from './game/items.ts'
import { semente } from './game/rng.ts'
import { comprarUpgrade, vender as venderRegra } from './game/economy.ts'
import { applyOffline, type ResumoOffline } from './game/offline.ts'
import { desserializar, serializar } from './game/save.ts'
import { estadoInicial, type GameState } from './game/state.ts'
import { tickDetalhado } from './game/tick.ts'

const CHAVE_SAVE = 'brasa-e-bigorna:save'
const CHAVE_BACKUP = 'brasa-e-bigorna:save-backup'

/** Acima disso o intervalo vira "offline" (aba em segundo plano, celular bloqueado). */
const LIMITE_TICK_NORMAL_S = 5

function lerSave(): GameState | null {
  try {
    for (const chave of [CHAVE_SAVE, CHAVE_BACKUP]) {
      const bruto = localStorage.getItem(chave)
      const estado = bruto ? desserializar(bruto) : null
      if (estado) return estado
    }
  } catch {
    /* localStorage indisponível: joga sem salvar */
  }
  return null
}

function gravarSave(estado: GameState): void {
  try {
    const atual = localStorage.getItem(CHAVE_SAVE)
    // Só promove a backup se o save atual ainda for válido.
    if (atual && desserializar(atual)) localStorage.setItem(CHAVE_BACKUP, atual)
    localStorage.setItem(CHAVE_SAVE, serializar(estado))
  } catch {
    /* quota cheia ou modo privado */
  }
}

export type AbaId = 'forja' | 'guilda' | 'mapa'

/** Resultado de uma luta contra o chefe, para o replay. A recompensa já foi aplicada ao jogo. */
export interface CombateAtivo {
  id: number
  chefe: ChefeId
  resultado: ResultadoCombate
  recompensa: RecompensaChefe | null
}

interface Store {
  aba: AbaId
  jogo: GameState
  resumoOffline: ResumoOffline | null
  /** Último ganho de venda, para a UI mostrar o "+N" (id muda a cada venda). */
  ultimoGanho: { id: number; valor: number } | null
  /** Último item forjado com o app aberto (a UI mostra o '+1 Espada (rara)'). */
  ultimoForjado: { id: number; forjado: Forjado } | null
  /** Id do overlay da batida aberto agora (null = fechado). Só UI; não vai para o save. */
  batidaAtiva: number | null
  /** Combate em replay (null = nenhum). Só UI; não vai para o save. */
  combate: CombateAtivo | null
  /** Última coleta de expedições (a UI faz os números subirem). */
  ultimaColeta: { id: number; coleta: Coleta } | null
  irPara: (aba: AbaId) => void
  avancar: (now: number) => void
  melhorar: (estacao: EstacaoId) => void
  vender: (recurso: RecursoId | 'tudo') => void
  forjar: (receita: ReceitaId, comBatida?: boolean, material?: MaterialId) => void
  removerDaFila: (indice: number) => void
  alternarAutomatico: () => void
  /** Posição do toque (0..1) ou null se o tempo acabou. */
  registrarBatida: (posicao: number | null) => void
  fecharBatida: () => void
  contratar: (id: FerreiroId) => void
  alocar: (id: FerreiroId, estacao: EstacaoId | null) => void
  venderItem: (id: number) => void
  venderItens: (qualidade: Qualidade | 'todas') => void
  fecharResumo: () => void
  salvar: () => void
  recrutar: (classe: ClasseId) => void
  equipar: (heroiId: number, itemId: number) => void
  desequipar: (heroiId: number, slot: Slot) => void
  enviarExpedicao: (heroiId: number, tipo: ExpedicaoId) => void
  coletarExpedicao: (id: number) => void
  coletarTodas: () => void
  lutar: (chefe: ChefeId, heroiIds: number[]) => void
  fecharCombate: () => void
}

function iniciar(): Pick<Store, 'jogo' | 'resumoOffline'> {
  const agora = Date.now()
  const salvo = lerSave()
  if (!salvo) {
    return { jogo: estadoInicial(agora, semente(Math.random() * 2 ** 32)), resumoOffline: null }
  }
  const { estado, resumo } = applyOffline(salvo, agora)
  return {
    jogo: estado,
    resumoOffline: resumo.segundosSimulados > OFFLINE.minimoModalSegundos ? resumo : null,
  }
}

let contadorGanho = 0
let contadorForjado = 0
let contadorBatida = 0
let contadorColeta = 0
let contadorCombate = 0

export const useGame = create<Store>((set, get) => ({
  aba: 'forja',
  ...iniciar(),
  ultimoGanho: null,
  ultimoForjado: null,
  batidaAtiva: null,
  combate: null,
  ultimaColeta: null,

  irPara: (aba) => set({ aba }),

  avancar: (now) => {
    const { jogo } = get()
    const dt = (now - jogo.lastTick) / 1000
    if (dt < 0) {
      // Relógio voltou: realinha sem punir (GDD §4.5).
      set({ jogo: { ...jogo, lastTick: now } })
      return
    }
    if (dt > LIMITE_TICK_NORMAL_S) {
      const { estado, resumo } = applyOffline(jogo, now)
      set({
        jogo: estado,
        resumoOffline:
          resumo.segundosSimulados > OFFLINE.minimoModalSegundos ? resumo : get().resumoOffline,
      })
      return
    }
    const r = tickDetalhado(jogo, dt)
    const ultimo = r.forjados[r.forjados.length - 1]
    set({
      jogo: { ...r.estado, lastTick: now },
      ...(ultimo ? { ultimoForjado: { id: ++contadorForjado, forjado: ultimo } } : {}),
    })
  },

  melhorar: (estacao) => {
    const { jogo } = get()
    const novo = comprarUpgrade(jogo, estacao)
    if (novo !== jogo) set({ jogo: novo })
  },

  vender: (recurso) => {
    let estado = get().jogo
    let total = 0
    const alvos: RecursoId[] = recurso === 'tudo' ? ['minerio', 'carvao', 'lingote', 'aco'] : [recurso]
    for (const r of alvos) {
      const res = venderRegra(estado, r, 'tudo')
      estado = res.estado
      total += res.ganho
    }
    if (total > 0) set({ jogo: estado, ultimoGanho: { id: ++contadorGanho, valor: total } })
  },

  forjar: (receita, comBatida = false, material = 'ferro') => {
    const { jogo } = get()
    const novo = forjarRegra(jogo, receita, comBatida, material)
    if (novo === jogo) return
    set({ jogo: novo, batidaAtiva: comBatida && novo.forja?.minigame === 'pendente' ? ++contadorBatida : null })
  },

  removerDaFila: (indice) => set({ jogo: removerDaFilaRegra(get().jogo, indice) }),

  alternarAutomatico: () => set({ jogo: alternarAutomatico(get().jogo) }),

  registrarBatida: (posicao) => set({ jogo: registrarBatidaRegra(get().jogo, posicao) }),

  fecharBatida: () => set({ batidaAtiva: null }),

  contratar: (id) => {
    const { jogo } = get()
    const novo = contratarRegra(jogo, id)
    if (novo !== jogo) set({ jogo: novo })
  },

  alocar: (id, estacao) => {
    const { jogo } = get()
    const novo = alocarRegra(jogo, id, estacao)
    if (novo !== jogo) set({ jogo: novo })
  },

  venderItem: (id) => {
    const r = venderItemRegra(get().jogo, id)
    if (r.ganho > 0) set({ jogo: r.estado, ultimoGanho: { id: ++contadorGanho, valor: r.ganho } })
  },

  venderItens: (qualidade) => {
    const r = venderPorQualidade(get().jogo, qualidade)
    if (r.ganho > 0) set({ jogo: r.estado, ultimoGanho: { id: ++contadorGanho, valor: r.ganho } })
  },

  fecharResumo: () => set({ resumoOffline: null }),

  salvar: () => gravarSave(get().jogo),

  recrutar: (classe) => {
    const { jogo } = get()
    const novo = recrutarRegra(jogo, classe)
    if (novo !== jogo) set({ jogo: novo })
  },

  equipar: (heroiId, itemId) => {
    const { jogo } = get()
    const novo = equiparRegra(jogo, heroiId, itemId)
    if (novo !== jogo) set({ jogo: novo })
  },

  desequipar: (heroiId, slot) => {
    const { jogo } = get()
    const novo = desequiparRegra(jogo, heroiId, slot)
    if (novo !== jogo) set({ jogo: novo })
  },

  // O relógio das expedições é o do jogo (lastTick, atualizado a cada 200 ms), o mesmo que decide a volta.
  enviarExpedicao: (heroiId, tipo) => {
    const { jogo } = get()
    const novo = partir(jogo, heroiId, tipo, Date.now())
    if (novo !== jogo) set({ jogo: novo })
  },

  coletarExpedicao: (id) => {
    const { jogo } = get()
    const r = coletarRegra(jogo, id, Date.now())
    if (r.estado !== jogo) set({ jogo: r.estado, ultimaColeta: { id: ++contadorColeta, coleta: r.coleta } })
  },

  coletarTodas: () => {
    const { jogo } = get()
    const r = coletarTodasRegra(jogo, Date.now())
    if (r.estado !== jogo) set({ jogo: r.estado, ultimaColeta: { id: ++contadorColeta, coleta: r.coleta } })
  },

  lutar: (chefe, heroiIds) => {
    const { jogo } = get()
    const r = lutarChefe(jogo, chefe, heroiIds)
    if (r.resultado.equipe.length === 0) return
    set({
      jogo: r.estado,
      combate: { id: ++contadorCombate, chefe, resultado: r.resultado, recompensa: r.recompensa },
    })
  },

  fecharCombate: () => set({ combate: null }),
}))
