import { useEffect, useRef, useState } from 'react'
import { NIVEIS_MARCO } from '../game/constants.ts'
import { formatar, formatarCusto, formatarTaxa } from '../game/format.ts'
import { Flutuantes, useFlutuantes } from './Flutuantes.tsx'
import { Sprite, type SpriteNome } from './Sprite.tsx'
import { SpriteEstacao } from './SpritesEvolucao.tsx'
import { nomeEstagio, type EstacaoVisual } from '../game/visual.ts'

interface Props {
  nome: string
  sprite: SpriteNome
  /** Quadros da faixa animada quando a estação está acesa. */
  animada?: boolean
  /** Sprite aceso (padrão: a fornalha). */
  spriteAceso?: SpriteNome
  nivel: number
  /** O que a estação entrega e quanto por segundo. */
  saida: { icone: SpriteNome; rotulo: string; porSegundo: number }
  proximaSaida: number
  proximoMarco: number | null
  custo: number
  podeComprar: boolean
  onMelhorar: () => void
  parada: boolean
  mensagemParada?: string
  gargalo: boolean
  /** Estação com estágios visuais (muda de cara e de nome a cada marco). */
  visual?: EstacaoVisual
}

export function StationCard(p: Props) {
  const { itens, adicionar, remover } = useFlutuantes(2)

  // Subiu de nível: o cartão pisca e um selo "Nível N" (ou "Produção x2!" no marco) salta do botão.
  const nivelAntes = useRef(p.nivel)
  const [subiu, setSubiu] = useState<{ id: number; texto: string; marco: boolean } | null>(null)
  useEffect(() => {
    if (p.nivel > nivelAntes.current) {
      const marco = (NIVEIS_MARCO as readonly number[]).includes(p.nivel)
      const novoNome = p.visual ? nomeEstagio(p.visual, p.nivel) : null
      setSubiu({ id: p.nivel, texto: marco ? (novoNome ? `${novoNome}! Produção x2` : 'Produção x2!') : `Nível ${p.nivel}`, marco })
    }
    nivelAntes.current = p.nivel
  }, [p.nivel])

  // Um "+N" suave a cada 3 s enquanto trabalha (nunca com a aba escondida).
  useEffect(() => {
    if (p.parada || p.saida.porSegundo <= 0) return
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        adicionar(`+${formatar(p.saida.porSegundo * 3)}`)
      }
    }, 3000)
    return () => window.clearInterval(id)
  }, [p.parada, p.saida.porSegundo, adicionar])

  const spriteAtual: SpriteNome = p.animada && !p.parada ? (p.spriteAceso ?? 'fornalha_acesa') : p.sprite
  const titulo = p.visual ? nomeEstagio(p.visual, p.nivel) : p.nome
  const classe = ['estacao', 'painel', p.parada ? 'fria' : 'quente', p.gargalo ? 'gargalo' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <article className={`${classe}${subiu ? ' subiu' : ''}`} aria-label={p.nome} key={subiu ? `s${subiu.id}` : undefined}>
      {subiu && (
        <span
          key={subiu.id}
          className={`estacao-pop ${subiu.marco ? 'marco' : ''}`}
          aria-hidden="true"
          onAnimationEnd={() => setSubiu(null)}
        >
          {subiu.texto}
        </span>
      )}
      <div className="estacao-arte">
        {p.visual ? (
          <SpriteEstacao estacao={p.visual} nivel={p.nivel} base={spriteAtual} escala={2} rotulo={titulo} />
        ) : (
          <Sprite nome={spriteAtual} escala={2} rotulo={p.nome} />
        )}
      </div>

      <div className="estacao-info">
        <div className="estacao-titulo">
          <h2>{titulo}</h2>
          <span className="nivel">nível {p.nivel}</span>
          {p.gargalo && <span className="etiqueta-gargalo">gargalo</span>}
        </div>
        <div className="estacao-taxa">
          <Sprite nome={p.saida.icone} escala={1} />
          <span>
            {formatarTaxa(p.saida.porSegundo)} {p.saida.rotulo}/s
          </span>
          <Flutuantes itens={itens} onFim={remover} subida={22} />
        </div>
        {/* Só o que pede ação: parada. O "próximo X/s" polui e não muda a decisão (o botão já diz o preço). */}
        {p.parada && <p className="estacao-aviso">{p.mensagemParada}</p>}
        {!p.parada && p.proximoMarco !== null && (
          <p className="estacao-dica">{`Nível ${p.proximoMarco}: produção x2${p.visual ? ' e melhoria visual' : ''}.`}</p>
        )}
      </div>

      <button
        type="button"
        className="botao botao-primario botao-melhorar"
        disabled={!p.podeComprar}
        onClick={p.onMelhorar}
        aria-label={`Melhorar ${p.nome} por ${formatarCusto(p.custo)} moedas`}
      >
        <span>Melhorar</span>
        <span className="botao-custo">
          <Sprite nome="icone_moeda" escala={1} />
          {formatarCusto(p.custo)}
        </span>
      </button>
    </article>
  )
}
