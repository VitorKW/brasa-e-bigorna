import { useLayoutEffect, useRef, useState } from 'react'

/**
 * As cenas são desenhadas em pixels de arte (ex.: 176×88) e escaladas para a largura disponível.
 * Devolve a ref da caixa e a escala atual (nunca menor que 1).
 */
export function useEscalaCena(larguraArte: number) {
  const caixa = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(2)
  useLayoutEffect(() => {
    const el = caixa.current
    if (!el) return
    const medir = () => setEscala(Math.max(1, el.clientWidth / larguraArte))
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [larguraArte])
  return { caixa, escala }
}
