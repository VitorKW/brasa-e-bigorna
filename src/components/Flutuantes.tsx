import { useCallback, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface Item {
  id: number
  texto: string
}

/** Números "+N" que sobem e somem. Poucos por vez, para não poluir. */
export function useFlutuantes(max = 3) {
  const [itens, setItens] = useState<Item[]>([])
  const contador = useRef(0)
  const adicionar = useCallback(
    (texto: string) => {
      const id = ++contador.current
      setItens((atual) => [...atual.slice(-(max - 1)), { id, texto }])
    },
    [max],
  )
  const remover = useCallback((id: number) => {
    setItens((atual) => atual.filter((i) => i.id !== id))
  }, [])
  return { itens, adicionar, remover }
}

interface Props {
  itens: Item[]
  onFim: (id: number) => void
  /** Distância da subida em px. */
  subida?: number
}

export function Flutuantes({ itens, onFim, subida = 28 }: Props) {
  const reduzir = useReducedMotion()
  return (
    <span className="flutuantes" aria-hidden="true">
      {itens.map((item) => (
        <motion.span
          key={item.id}
          className="flutuante"
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: reduzir ? 0 : -subida }}
          transition={{ duration: reduzir ? 1.2 : 0.9, ease: 'easeOut' }}
          onAnimationComplete={() => onFim(item.id)}
        >
          {item.texto}
        </motion.span>
      ))}
    </span>
  )
}
