import { create } from 'zustand'
import { OFFLINE, type EstacaoId, type RecursoId } from './game/constants.ts'
import {
  alternarAutomatico,
  forjar as forjarRegra,
  registrarBatida as registrarBatidaRegra,
  removerDaFila as removerDaFilaRegra,
  type Forjado,
} from './game/bigorna.ts'
import { alocar as alocarRegra, contratar as contratarRegra, type FerreiroId } from './game/ferreiros.ts'
import { venderItem as venderItemRegra, venderPorQualidade } from './game/inventario.ts'
import type { Qualidade, ReceitaId } from './game/items.ts'
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

interface Store {
  jogo: GameState
  resumoOffline: ResumoOffline | null
  /** Último ganho de venda, para a UI mostrar o "+N" (id muda a cada venda). */
  ultimoGanho: { id: number; valor: number } | null
  /** Último item forjado com o app aberto (a UI mostra o '+1 Espada (rara)'). */
  ultimoForjado: { id: number; forjado: Forjado } | null
  /** Id do overlay da batida aberto agora (null = fechado). Só UI; não vai para o save. */
  batidaAtiva: number | null
  avancar: (now: number) => void
  melhorar: (estacao: EstacaoId) => void
  vender: (recurso: RecursoId | 'tudo') => void
  forjar: (receita: ReceitaId, comBatida?: boolean) => void
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

export const useGame = create<Store>((set, get) => ({
  ...iniciar(),
  ultimoGanho: null,
  ultimoForjado: null,
  batidaAtiva: null,

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
    const alvos: RecursoId[] = recurso === 'tudo' ? ['minerio', 'carvao', 'lingote'] : [recurso]
    for (const r of alvos) {
      const res = venderRegra(estado, r, 'tudo')
      estado = res.estado
      total += res.ganho
    }
    if (total > 0) set({ jogo: estado, ultimoGanho: { id: ++contadorGanho, valor: total } })
  },

  forjar: (receita, comBatida = false) => {
    const { jogo } = get()
    const novo = forjarRegra(jogo, receita, comBatida)
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
}))
