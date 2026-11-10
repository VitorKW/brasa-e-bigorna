import { useEffect } from 'react'
import { formatar, formatarCusto, formatarTaxa } from '../game/format.ts'
import { Flutuantes, useFlutuantes } from './Flutuantes.tsx'
import { Sprite, type SpriteNome } from './Sprite.tsx'

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
}

export function StationCard(p: Props) {
  const { itens, adicionar, remover } = useFlutuantes(2)

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
  const classe = ['estacao', 'painel', p.parada ? 'fria' : 'quente', p.gargalo ? 'gargalo' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <article className={classe} aria-label={p.nome}>
      <div className="estacao-arte">
        <Sprite nome={spriteAtual} escala={2} rotulo={p.nome} />
      </div>

      <div className="estacao-info">
        <div className="estacao-titulo">
          <h2>{p.nome}</h2>
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
        {p.parada ? (
          <p className="estacao-aviso">{p.mensagemParada}</p>
        ) : (
          <p className="estacao-dica">
            Próximo: {formatarTaxa(p.proximaSaida)}/s
            {p.proximoMarco ? ` · dobra no nível ${p.proximoMarco}` : ''}
          </p>
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
