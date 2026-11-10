import { useEffect, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import { analisarCadeia } from '../game/chain.ts'
import { ferreiroEm } from '../game/ferreiros.ts'
import { formatar } from '../game/format.ts'
import type { AlvoToque } from '../game/toque.ts'
import { useGame } from '../store.ts'
import { Sprite, type SpriteNome } from './Sprite.tsx'
import { SpriteEstacao } from './SpritesEvolucao.tsx'
import { useEscalaCena } from './useEscalaCena.ts'

/** Tamanho nativo da cena (pixels da arte). O palco é escalado para caber na largura da tela. */
const W = 176
const H = 88

interface Ponto {
  alvo: AlvoToque
  nome: string
  /** Canto superior esquerdo do sprite, em pixels da arte. */
  x: number
  y: number
  icone: SpriteNome
  /** Cor das lascas que voam no toque. */
  lasca: string
  /** O que dizer quando o toque não rende nada. */
  semEfeito: string
}

const PONTOS: readonly Ponto[] = [
  { alvo: 'mina', nome: 'Mina', x: 2, y: 30, icone: 'icone_minerio', lasca: '#c7743f', semEfeito: '' },
  { alvo: 'carvoaria', nome: 'Carvoaria', x: 44, y: 30, icone: 'icone_carvao', lasca: '#3d3437', semEfeito: '' },
  { alvo: 'fornalha', nome: 'Fornalha', x: 88, y: 30, icone: 'icone_lingote', lasca: '#f29a3a', semEfeito: 'Falta minério ou carvão' },
  { alvo: 'bigorna', nome: 'Bigorna', x: 120, y: 33, icone: 'icone_lingote', lasca: '#ffd47a', semEfeito: 'Nada na bigorna' },
]

interface Efeito {
  id: number
  x: number
  y: number
  texto: string
  icone: SpriteNome | null
  lasca: string | null
  falhou: boolean
}

let contador = 0

/**
 * Cena viva da forja: o fundo em pixel art com as estações por cima. Tudo reage ao estado (fogo aceso,
 * fumaça, carrinho rodando, ferreiro martelando) e ao dedo: cada toque cava, atiça ou martela.
 */
export function CenaForja() {
  const jogo = useGame((s) => s.jogo)
  const tocarCena = useGame((s) => s.tocarCena)
  // Convite a tocar: fica dentro da cena e some sozinho no primeiro toque que rende (sem botão "Entendi").
  const convidar = useGame((s) => !s.jogo.dicasVistas.includes('cena'))
  const dispensarDica = useGame((s) => s.dispensarDica)
  const reduzir = useReducedMotion()
  const { caixa, escala } = useEscalaCena(W)
  const [efeitos, setEfeitos] = useState<Efeito[]>([])
  const [tocado, setTocado] = useState<{ alvo: AlvoToque; id: number; falhou: boolean } | null>(null)

  useEffect(() => {
    if (!tocado) return
    const id = window.setTimeout(() => setTocado(null), 160)
    return () => window.clearTimeout(id)
  }, [tocado])

  const { fornalha } = analisarCadeia(jogo)
  const fogoAceso = fornalha === 'trabalhando' && jogo.niveis.fornalha >= 1
  const bigornaDePe = jogo.niveis.bigorna >= 1
  const martelando = bigornaDePe && jogo.forja !== null && jogo.forja.progresso < 1 && jogo.forja.minigame !== 'pendente'
  const ferreiro = ferreiroEm(jogo, 'bigorna')

  const aoTocar = (p: Ponto) => {
    if (p.alvo === 'bigorna' && !bigornaDePe) return
    const ganho = tocarCena(p.alvo)
    if (ganho === null) return
    const falhou = ganho <= 0
    if (!falhou && convidar) dispensarDica('cena')
    setTocado({ alvo: p.alvo, id: ++contador, falhou })
    if (!falhou && 'vibrate' in navigator) navigator.vibrate?.(8)
    const texto = falhou
      ? p.semEfeito
      : p.alvo === 'bigorna'
        ? 'Tchang!'
        : `+${ganho < 10 ? String(Math.round(ganho * 10) / 10).replace('.', ',') : formatar(ganho)}`
    const e: Efeito = {
      id: contador,
      x: p.x + 16,
      y: p.y + 4,
      texto,
      icone: falhou || p.alvo === 'bigorna' ? null : p.icone,
      lasca: falhou || reduzir ? null : p.lasca,
      falhou,
    }
    setEfeitos((atual) => [...atual.slice(-5), e])
  }

  const palco = { width: W, height: H, transform: `scale(${escala})` } as CSSProperties

  return (
    <>
      <div className="cena" ref={caixa} style={{ height: H * escala }}>
        <div className="cena-palco" style={palco}>
          <Sprite nome="cena_forja" escala={1} />

          {/* Vida que não depende do dedo: fumaça, brilho do fogo, carrinho nos trilhos. */}
          <span className="cena-fumaca" style={{ left: 58, top: 26 }} aria-hidden="true" />
          {fogoAceso && <span className="cena-brilho" style={{ left: 84, top: 34 }} aria-hidden="true" />}
          {fogoAceso && <span className="cena-fumaca forte" style={{ left: 108, top: 24 }} aria-hidden="true" />}
          <div className={`cena-carrinho ${fogoAceso ? 'andando' : ''}`} aria-hidden="true">
            <Sprite nome="carrinho" escala={1} />
          </div>

          {PONTOS.map((p) => {
            const trancada = p.alvo === 'bigorna' && !bigornaDePe
            let sprite: SpriteNome = p.alvo
            if (p.alvo === 'fornalha' && fogoAceso) sprite = 'fornalha_acesa'
            if (p.alvo === 'bigorna' && martelando) sprite = 'bigorna_batendo'
            const classe = [
              'cena-ponto',
              trancada ? 'trancada' : '',
              tocado?.alvo === p.alvo ? (tocado.falhou ? 'negado' : 'tocado') : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <button
                key={p.alvo}
                type="button"
                className={classe}
                style={{ left: p.x, top: p.y }}
                onPointerDown={(ev) => {
                  ev.preventDefault()
                  aoTocar(p)
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault()
                    aoTocar(p)
                  }
                }}
                aria-label={trancada ? `${p.nome}: ainda não construída` : `Tocar na ${p.nome.toLowerCase()}`}
              >
                <SpriteEstacao estacao={p.alvo} nivel={jogo.niveis[p.alvo]} base={sprite} escala={1} fps={martelando && p.alvo === 'bigorna' ? 8 : 6} />
              </button>
            )
          })}

          {bigornaDePe && ferreiro && (
            <div className="cena-ferreiro" aria-hidden="true">
              <Sprite nome={`ferreiro_${ferreiro}`} escala={1} />
            </div>
          )}

          {convidar && (
            <span className="cena-convite" aria-hidden="true">
              Toque para cavar
            </span>
          )}

          {efeitos.map((e) => (
            <span
              key={e.id}
              className={`cena-efeito ${e.falhou ? 'falhou' : ''}`}
              style={{ left: e.x, top: e.y }}
              onAnimationEnd={(ev) => {
                if (ev.target === ev.currentTarget) setEfeitos((a) => a.filter((x) => x.id !== e.id))
              }}
              aria-hidden="true"
            >
              <span className="cena-efeito-texto">
                {e.icone && <Sprite nome={e.icone} escala={1} />}
                {e.texto}
              </span>
              {e.lasca &&
                [0, 1, 2, 3, 4].map((i) => {
                  const ang = -Math.PI / 2 + (i - 2) * 0.55
                  const estilo = {
                    background: e.lasca ?? undefined,
                    '--dx': `${Math.cos(ang) * 14}px`,
                    '--dy': `${Math.sin(ang) * 12}px`,
                  } as CSSProperties
                  return <span key={i} className="cena-lasca" style={estilo} />
                })}
            </span>
          ))}
        </div>
      </div>
    </>
  )
}
