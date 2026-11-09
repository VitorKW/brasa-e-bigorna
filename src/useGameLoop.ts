import { useEffect } from 'react'
import { useGame } from './store.ts'

const INTERVALO_TICK_MS = 200
const INTERVALO_SAVE_MS = 5000

/** Loop de jogo: tick a cada 200 ms, save a cada 5 s e ao esconder a aba. */
export function useGameLoop(): void {
  useEffect(() => {
    const { avancar, salvar } = useGame.getState()
    let ultimoSave = Date.now()

    const id = window.setInterval(() => {
      const agora = Date.now()
      avancar(agora)
      if (agora - ultimoSave >= INTERVALO_SAVE_MS) {
        salvar()
        ultimoSave = agora
      }
    }, INTERVALO_TICK_MS)

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'hidden') {
        salvar()
        ultimoSave = Date.now()
      } else {
        avancar(Date.now()) // volta do segundo plano: aplica o tempo fora
      }
    }
    const aoSair = () => salvar()

    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    window.addEventListener('pagehide', aoSair)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.removeEventListener('pagehide', aoSair)
    }
  }, [])
}
