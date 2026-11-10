import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { NOME_TIPO, nomeQualidade, type Qualidade } from '../game/items.ts'
import { useGame } from '../store.ts'
import { COR_QUALIDADE } from './qualidade.ts'
import { Sprite } from './Sprite.tsx'

interface Voo {
  id: number
  de: { x: number; y: number }
  para: { x: number; y: number }
}

const centro = (el: Element | null, padrao: { x: number; y: number }) => {
  if (!el) return padrao
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

/**
 * Ao vender, moedinhas saem do botão e voam até o contador de moedas, que dá um pulo.
 * Puramente decorativo: com movimento reduzido não aparece nada (o "+N" da barra continua).
 */
export function MoedasVoando() {
  const ultimoGanho = useGame((s) => s.ultimoGanho)
  const reduzir = useReducedMotion()
  const [voos, setVoos] = useState<Voo[]>([])
  const visto = useRef<number | null>(ultimoGanho?.id ?? null)

  useEffect(() => {
    if (!ultimoGanho || ultimoGanho.id === visto.current) return
    visto.current = ultimoGanho.id
    if (reduzir) return
    const de = centro(document.querySelector('.vender-tudo'), { x: window.innerWidth / 2, y: window.innerHeight - 140 })
    const para = centro(document.querySelector('.chip-moedas .sprite'), { x: 40, y: 30 })
    setVoos((v) => [...v.slice(-1), { id: ultimoGanho.id, de, para }])
    const chip = document.querySelector('.chip-moedas')
    const t = window.setTimeout(() => {
      chip?.classList.remove('pulo')
      void (chip as HTMLElement | null)?.offsetWidth
      chip?.classList.add('pulo')
    }, 520)
    return () => window.clearTimeout(t)
  }, [ultimoGanho, reduzir])

  return (
    <div className="efeitos-camada" aria-hidden="true">
      {voos.map((v) =>
        Array.from({ length: 7 }, (_, i) => {
          const espalha = (i - 3) * 14
          return (
            <motion.div
              key={`${v.id}-${i}`}
              className="moeda-voando"
              initial={{ x: v.de.x + espalha - 8, y: v.de.y - 8, scale: 0.6, opacity: 0 }}
              animate={{
                x: [v.de.x + espalha - 8, v.de.x + espalha * 1.6 - 8, v.para.x - 8],
                y: [v.de.y - 8, v.de.y - 70 - Math.abs(espalha), v.para.y - 8],
                scale: [0.6, 1.2, 0.8],
                opacity: [0, 1, 1],
              }}
              transition={{ duration: 0.65, delay: i * 0.035, ease: 'easeIn', times: [0, 0.35, 1] }}
              onAnimationComplete={() => {
                if (i === 6) setVoos((atual) => atual.filter((x) => x.id !== v.id))
              }}
            >
              <Sprite nome="icone_moeda" escala={1} />
            </motion.div>
          )
        }),
      )}
    </div>
  )
}

const RARAS: readonly Qualidade[] = ['epico', 'lendario']

/** Peça épica ou lendária saindo da bigorna: o item aparece grande, com brilho da cor da raridade. */
export function RevelacaoItem() {
  const ultimoForjado = useGame((s) => s.ultimoForjado)
  const reduzir = useReducedMotion()
  const visto = useRef<number | null>(ultimoForjado?.id ?? null)
  const [atual, setAtual] = useState<typeof ultimoForjado>(null)
  const ultimaVez = useRef(0)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (!ultimoForjado || ultimoForjado.id === visto.current) return
    visto.current = ultimoForjado.id
    const { item, batida } = ultimoForjado.forjado
    if (!RARAS.includes(item.qualidade)) return
    // Peça da batida (o jogador estava olhando) sempre aparece. Na forja automática, que pode soltar
    // peças a cada fração de segundo, só uma lendária a cada 30 s: festa, não enxurrada.
    const agora = Date.now()
    if (batida === 'automatico' && (item.qualidade !== 'lendario' || agora - ultimaVez.current < 30_000)) return
    ultimaVez.current = agora
    setAtual(ultimoForjado)
    // O timer fica num ref: a próxima peça forjada não pode cancelar o fechamento desta.
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setAtual(null), 1800)
  }, [ultimoForjado])

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    },
    [],
  )

  const item = atual?.forjado.item
  const cor = item ? COR_QUALIDADE[item.qualidade] : undefined

  return (
    <div className="efeitos-camada revelacao-area" aria-live="polite">
      <AnimatePresence>
        {item && (
          <motion.div
            key={atual!.id}
            className="revelacao"
            style={{ '--cor': cor } as CSSProperties}
            initial={{ opacity: 0, scale: reduzir ? 1 : 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduzir ? 1 : 1.15 }}
            transition={{ type: reduzir ? 'tween' : 'spring', stiffness: 380, damping: 18, duration: reduzir ? 0 : undefined }}
            onClick={() => setAtual(null)}
          >
            <span className="revelacao-raios" aria-hidden="true" />
            <Sprite nome={`item_${item.tipo}_${item.material}`} escala={5} />
            <span className="revelacao-nome" style={{ color: cor }}>
              {NOME_TIPO[item.tipo]} {nomeQualidade(item.qualidade, item.tipo)}!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
