import { useState } from 'react'
import { multVenda } from '../game/bonus.ts'
import { PRECO_VENDA, type RecursoId } from '../game/constants.ts'
import { formatar } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Sprite, type SpriteNome } from './Sprite.tsx'

const ITENS: { id: RecursoId; rotulo: string; icone: SpriteNome }[] = [
  { id: 'minerio', rotulo: 'Minério', icone: 'icone_minerio' },
  { id: 'carvao', rotulo: 'Carvão', icone: 'icone_carvao' },
  { id: 'lingote', rotulo: 'Lingotes', icone: 'icone_lingote' },
  { id: 'aco', rotulo: 'Aço', icone: 'icone_lingote_aco' },
]

/**
 * Venda: um botão grande ("Vender tudo") e, escondido atrás de "Separar", um por recurso. Quem quer
 * guardar lingotes para a bigorna abre; o resto do tempo a tela fica limpa.
 */
export function SellPanel() {
  const recursos = useGame((s) => s.jogo.recursos)
  const temAco = useGame((s) => s.jogo.niveis.forno >= 1 || s.jogo.recursos.aco > 0)
  const mult = useGame((s) => multVenda(s.jogo))
  const vender = useGame((s) => s.vender)
  const [aberto, setAberto] = useState(false)
  const lista = ITENS.filter((i) => i.id !== 'aco' || temAco)
  const valorTotal = lista.reduce((t, i) => t + recursos[i.id] * PRECO_VENDA[i.id] * mult, 0)

  return (
    <section className="vender painel" aria-label="Vender">
      {aberto && (
        <div className="vender-grade">
          {lista.map((i) => (
            <button
              key={i.id}
              type="button"
              className="botao botao-secundario"
              disabled={Math.floor(recursos[i.id]) < 1}
              onClick={() => vender(i.id)}
              aria-label={`Vender ${i.rotulo.toLowerCase()} por ${formatar(recursos[i.id] * PRECO_VENDA[i.id] * mult)} moedas`}
            >
              <Sprite nome={i.icone} escala={1} />
              <span>{i.rotulo}</span>
              <span className="botao-sub">+{formatar(recursos[i.id] * PRECO_VENDA[i.id] * mult)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="vender-linha">
        <button
          type="button"
          className="botao botao-primario vender-tudo"
          disabled={Math.floor(valorTotal) < 1}
          onClick={() => vender('tudo')}
        >
          <span>Vender tudo</span>
          <span className="botao-custo">
            <Sprite nome="icone_moeda" escala={1} />+{formatar(valorTotal)}
          </span>
        </button>
        <button
          type="button"
          className="botao botao-secundario vender-separar"
          aria-expanded={aberto}
          onClick={() => setAberto((a) => !a)}
        >
          {aberto ? 'Fechar' : 'Separar'}
        </button>
      </div>
    </section>
  )
}
