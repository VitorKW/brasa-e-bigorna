import type { CSSProperties } from 'react'
import type { Heroi } from '../game/herois.ts'
import { auraHeroi, camadasEstacao, camadasHeroi, type EstacaoVisual } from '../game/visual.ts'
import { COR_QUALIDADE } from './qualidade.ts'
import { Sprite, type SpriteNome } from './Sprite.tsx'

/**
 * Estação com as melhorias visuais do estágio: a arte-base (parada, acesa ou batendo) e, por cima,
 * as camadas de cada marco alcançado. As camadas são transparentes e do mesmo tamanho da base.
 */
export function SpriteEstacao({
  estacao,
  nivel,
  base,
  escala = 2,
  fps,
  rotulo,
}: {
  estacao: EstacaoVisual
  nivel: number
  /** Sprite de baixo (ex.: 'fornalha_acesa' quando trabalha). */
  base: SpriteNome
  escala?: number
  fps?: number
  rotulo?: string
}) {
  return (
    <span className="sprite-pilha" role={rotulo ? 'img' : undefined} aria-label={rotulo}>
      <Sprite nome={base} escala={escala} fps={fps} />
      {camadasEstacao(estacao, nivel).map((c) => (
        <span key={c} className="sprite-camada">
          <Sprite nome={c} escala={escala} />
        </span>
      ))}
    </span>
  )
}

/** Herói vestido com o que está usando, e uma aura da cor da melhor peça (rara ou acima). */
export function SpriteHeroi({
  heroi,
  andando = false,
  escala = 2,
  fps,
  rotulo,
}: {
  heroi: Pick<Heroi, 'classe' | 'equipamento'>
  andando?: boolean
  escala?: number
  fps?: number
  rotulo?: string
}) {
  const aura = auraHeroi(heroi)
  return (
    <span
      className={`sprite-pilha ${aura ? `aura aura-${aura}` : ''}`}
      style={aura ? ({ '--aura': COR_QUALIDADE[aura] } as CSSProperties) : undefined}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
    >
      <Sprite nome={andando ? `heroi_${heroi.classe}_andando` : `heroi_${heroi.classe}`} escala={escala} fps={fps} />
      {camadasHeroi(heroi).map((c) => (
        <span key={c} className="sprite-camada">
          <Sprite nome={c} escala={escala} />
        </span>
      ))}
    </span>
  )
}
