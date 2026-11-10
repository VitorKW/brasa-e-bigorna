import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DEF_CONQUISTA } from '../game/conquistas.ts'
import { useGame } from '../store.ts'
import { Sprite } from './Sprite.tsx'

const DURACAO_MS = 4500

/**
 * Aviso discreto de conquista: um cartão pequeno no alto, sem tomar a tela nem pedir toque.
 * Várias de uma vez viram um só aviso ("e mais 2"). Com movimento reduzido só aparece e some.
 */
export function ToastConquista() {
  const fila = useGame((s) => s.avisoConquistas)
  const fechar = useGame((s) => s.fecharAvisoConquistas)
  const reduzir = useReducedMotion()
  const primeira = fila[0]

  useEffect(() => {
    if (!primeira) return
    const id = window.setTimeout(fechar, DURACAO_MS)
    return () => window.clearTimeout(id)
  }, [primeira, fila.length, fechar])

  return (
    <div className="toast-area" aria-live="polite" aria-atomic="true">
      <AnimatePresence>
        {primeira && (
          <motion.div
            key="toast"
            className="toast painel"
            initial={{ opacity: 0, y: reduzir ? 0 : -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduzir ? 0 : 0.2 }}
          >
            <Sprite nome="icone_conquista" escala={2} />
            <div className="toast-texto">
              <span className="toast-titulo">Conquista: {DEF_CONQUISTA[primeira].nome}</span>
              <span className="toast-sub">
                {DEF_CONQUISTA[primeira].descricao}
                {fila.length > 1 ? ` E mais ${fila.length - 1}.` : ''}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
