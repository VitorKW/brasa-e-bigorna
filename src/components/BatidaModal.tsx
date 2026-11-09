import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { BATIDA, avaliarBatida, posicaoMarcador, zonasDe } from '../game/batida.ts'
import { NOME_TIPO, type ResultadoBatida } from '../game/items.ts'
import { useGame } from '../store.ts'

const TEXTO_RESULTADO: Record<ResultadoBatida, string> = {
  perfeito: 'Perfeito!',
  bom: 'Boa batida!',
  errou: 'Errou a batida. O item sai com o bônus automático.',
  automatico: '',
}

/** Quanto o resultado fica na tela antes de fechar. */
const TEMPO_RESULTADO_MS = 900

/**
 * Overlay do minigame (3 s). O marcador é desenhado direto no DOM por requestAnimationFrame
 * (sem re-render por quadro). O sorteio do item já foi gravado antes de este overlay abrir.
 */
export function BatidaModal() {
  const ativa = useGame((s) => s.batidaAtiva)
  return ativa === null ? null : <Overlay key={ativa} />
}

function Overlay() {
  const reduzir = useReducedMotion() ?? false
  const forja = useGame((s) => s.jogo.forja)
  const registrar = useGame((s) => s.registrarBatida)
  const fechar = useGame((s) => s.fecharBatida)
  const [resultado, setResultado] = useState<ResultadoBatida | null>(null)

  const marcador = useRef<HTMLDivElement>(null)
  const tempo = useRef<HTMLDivElement>(null)
  const inicio = useRef(performance.now())
  const resolvido = useRef(false)
  const alvo = useRef(forja?.alvo ?? 0.5)
  const nomeItem = forja ? NOME_TIPO[forja.receita].toLowerCase() : 'item'

  const resolver = useCallback(
    (posicao: number | null) => {
      if (resolvido.current) return
      resolvido.current = true
      const r = avaliarBatida(posicao, zonasDe(alvo.current))
      registrar(posicao)
      setResultado(r)
      if (r === 'perfeito' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15)
      }
      window.setTimeout(fechar, TEMPO_RESULTADO_MS)
    },
    [registrar, fechar],
  )

  const bater = useCallback(() => {
    const t = (performance.now() - inicio.current) / 1000
    if (t > BATIDA.duracaoSegundos) return resolver(null)
    resolver(posicaoMarcador(t, reduzir))
  }, [resolver, reduzir])

  // Marcador e contagem regressiva; ao fim dos 3 s sem toque, conta como erro.
  useEffect(() => {
    let raf = 0
    const quadro = () => {
      if (resolvido.current) return
      const t = (performance.now() - inicio.current) / 1000
      if (t >= BATIDA.duracaoSegundos) return resolver(null)
      if (marcador.current) marcador.current.style.left = `${posicaoMarcador(t, reduzir) * 100}%`
      if (tempo.current) tempo.current.style.transform = `scaleX(${1 - t / BATIDA.duracaoSegundos})`
      raf = requestAnimationFrame(quadro)
    }
    raf = requestAnimationFrame(quadro)
    // Rede de segurança: rAF não roda com a aba escondida.
    const limite = window.setTimeout(() => resolver(null), BATIDA.duracaoSegundos * 1000 + 200)
    return () => {
      cancelAnimationFrame(raf)
      window.clearTimeout(limite)
    }
  }, [resolver, reduzir])

  // Se o estado já foi resolvido por outro caminho (ex.: voltou do offline), fecha.
  const pendente = forja?.minigame === 'pendente'
  useEffect(() => {
    if (!pendente && !resolvido.current) fechar()
  }, [pendente, fechar])

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        bater()
      }
    }
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [bater])

  const z = zonasDe(alvo.current)
  const faixa = (meia: number) => ({
    left: `${(z.alvo - meia) * 100}%`,
    width: `${meia * 2 * 100}%`,
  })

  return (
    <div className="modal-fundo">
      <div className="modal painel" role="dialog" aria-modal="true" aria-labelledby="titulo-batida">
        <h2 id="titulo-batida">Dê a batida</h2>
        <p className="modal-texto">
          Toque quando o marcador cruzar a zona clara. A {nomeItem} só ganha com isso, nunca perde.
        </p>

        <div className="batida-barra" aria-hidden="true">
          <div className="batida-zona bom" style={faixa(BATIDA.meiaBom)} />
          <div className="batida-zona perfeito" style={faixa(BATIDA.meiaPerfeito)} />
          <div ref={marcador} className="batida-marcador" />
        </div>
        <div className="batida-legenda" aria-hidden="true">
          <span><i className="amostra perfeito" /> perfeito</span>
          <span><i className="amostra bom" /> bom</span>
        </div>

        <div className="batida-tempo" aria-hidden="true">
          <div ref={tempo} className="batida-tempo-cheio" />
        </div>

        <p className="batida-resultado" role="status" aria-live="assertive">
          {resultado ? TEXTO_RESULTADO[resultado] : ''}
        </p>

        <button
          type="button"
          className="botao botao-primario botao-largo batida-botao"
          onPointerDown={(e) => {
            e.preventDefault()
            bater()
          }}
          onKeyDown={(e) => e.key === ' ' || e.key === 'Enter' ? e.preventDefault() : undefined}
          disabled={resultado !== null}
        >
          Bater
        </button>
      </div>
    </div>
  )
}
