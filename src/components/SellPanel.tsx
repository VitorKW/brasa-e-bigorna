import { PRECO_VENDA, type RecursoId } from '../game/constants.ts'
import { formatar } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Sprite, type SpriteNome } from './Sprite.tsx'

const ITENS: { id: RecursoId; rotulo: string; icone: SpriteNome }[] = [
  { id: 'minerio', rotulo: 'minério', icone: 'icone_minerio' },
  { id: 'carvao', rotulo: 'carvão', icone: 'icone_carvao' },
  { id: 'lingote', rotulo: 'lingotes', icone: 'icone_lingote' },
]

export function SellPanel() {
  const recursos = useGame((s) => s.jogo.recursos)
  const vender = useGame((s) => s.vender)
  const valorTotal = ITENS.reduce((t, i) => t + recursos[i.id] * PRECO_VENDA[i.id], 0)

  return (
    <section className="vender painel" aria-label="Vender">
      <div className="vender-grade">
        {ITENS.map((i) => (
          <button
            key={i.id}
            type="button"
            className="botao botao-secundario"
            disabled={Math.floor(recursos[i.id]) < 1}
            onClick={() => vender(i.id)}
          >
            <Sprite nome={i.icone} escala={1} />
            <span>Vender {i.rotulo}</span>
            <span className="botao-sub">+{formatar(recursos[i.id] * PRECO_VENDA[i.id])}</span>
          </button>
        ))}
        <button
          type="button"
          className="botao botao-primario"
          disabled={Math.floor(valorTotal) < 1}
          onClick={() => vender('tudo')}
        >
          <span>Vender tudo</span>
          <span className="botao-sub">+{formatar(valorTotal)}</span>
        </button>
      </div>
    </section>
  )
}
