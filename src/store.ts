import { create } from 'zustand'
import { OFFLINE, type EstacaoId, type RecursoId } from './game/constants.ts'
import { comprarUpgrade, vender as venderRegra } from './game/economy.ts'
import { applyOffline, type ResumoOffline } from './game/offline.ts'
import { desserializar, serializar } from './game/save.ts'
import { estadoInicial, type GameState } from './game/state.ts'
import { tick } from './game/tick.ts'

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
  avancar: (now: number) => void
  melhorar: (estacao: EstacaoId) => void
  vender: (recurso: RecursoId | 'tudo') => void
  fecharResumo: () => void
  salvar: () => void
}

function iniciar(): Pick<Store, 'jogo' | 'resumoOffline'> {
  const agora = Date.now()
  const salvo = lerSave()
  if (!salvo) return { jogo: estadoInicial(agora), resumoOffline: null }
  const { estado, resumo } = applyOffline(salvo, agora)
  return {
    jogo: estado,
    resumoOffline: resumo.segundosSimulados > OFFLINE.minimoModalSegundos ? resumo : null,
  }
}

let contadorGanho = 0

export const useGame = create<Store>((set, get) => ({
  ...iniciar(),
  ultimoGanho: null,

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
    set({ jogo: { ...tick(jogo, dt), lastTick: now } })
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

  fecharResumo: () => set({ resumoOffline: null }),

  salvar: () => gravarSave(get().jogo),
}))
