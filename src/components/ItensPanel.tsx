import { useMemo } from 'react'
import { multVenda } from '../game/bonus.ts'
import { formatar } from '../game/format.ts'
import { contarPorQualidade } from '../game/inventario.ts'
import {
  QUALIDADES,
  nomeItem,
  nomeQualidade,
  rotuloQualidade,
  type Item,
  type Qualidade,
} from '../game/items.ts'
import { useGame } from '../store.ts'
import { COR_QUALIDADE } from './qualidade.ts'
import { Sprite } from './Sprite.tsx'

const PLURAL: Record<Qualidade, string> = {
  comum: 'comuns',
  incomum: 'incomuns',
  raro: 'raros',
  epico: 'épicos',
  lendario: 'lendários',
}

const ordemQualidade = (q: Qualidade) => QUALIDADES.indexOf(q)

function Linha({ item, mult, onVender }: { item: Item; mult: number; onVender: (id: number) => void }) {
  const valor = item.valor * mult
  const cor = COR_QUALIDADE[item.qualidade]
  const qual = nomeQualidade(item.qualidade, item.tipo)
  return (
    <li
      className="item"
      style={{ borderColor: cor }}
      aria-label={`${nomeItem(item)}, ${qual}, forjada por ${item.ferreiro}, vale ${formatar(valor)} moedas`}
    >
      <Sprite nome={`item_${item.tipo}_${item.material}`} escala={2} />
      <div className="item-texto">
        <span className="item-nome">{nomeItem(item)}</span>
        <span className="item-qualidade" style={{ color: cor }}>
          {rotuloQualidade(item.qualidade)}
        </span>
        <span className="item-ferreiro">por {item.ferreiro}</span>
      </div>
      <button
        type="button"
        className="botao botao-secundario item-vender"
        onClick={() => onVender(item.id)}
        aria-label={`Vender ${nomeItem(item)} por ${formatar(valor)} moedas`}
      >
        <Sprite nome="icone_moeda" escala={1} />
        {formatar(valor)}
      </button>
    </li>
  )
}

export function ItensPanel() {
  const itens = useGame((s) => s.jogo.itens)
  const mult = useGame((s) => multVenda(s.jogo))
  const limite = useGame((s) => s.jogo.limiteInventario)
  const venderItem = useGame((s) => s.venderItem)
  const venderItens = useGame((s) => s.venderItens)

  const ordenados = useMemo(
    () => [...itens].sort((a, b) => ordemQualidade(b.qualidade) - ordemQualidade(a.qualidade) || b.id - a.id),
    [itens],
  )
  const contagem = contarPorQualidade(itens)
  const total = itens.reduce((t, i) => t + i.valor, 0) * mult
  const cheio = itens.length >= limite

  return (
    <section className="secao painel" aria-label="Itens forjados">
      <div className="secao-topo">
        <h2>Itens</h2>
        <span className={`secao-contagem ${cheio ? 'cheio' : ''}`}>
          {itens.length}/{limite}
          {cheio ? ' · cheio' : ''}
        </span>
      </div>

      {itens.length === 0 ? (
        <p className="estacao-dica">Nada forjado ainda. Escolha uma receita na bigorna.</p>
      ) : (
        <>
          <div className="massa" role="group" aria-label="Vender em massa">
            {QUALIDADES.filter((q) => contagem[q] > 0).map((q) => (
              <button
                key={q}
                type="button"
                className="botao botao-secundario massa-botao"
                style={{ borderColor: COR_QUALIDADE[q] }}
                onClick={() => venderItens(q)}
              >
                <span>
                  Vender {PLURAL[q]} ({contagem[q]})
                </span>
                <span className="botao-sub">
                  +{formatar(itens.filter((i) => i.qualidade === q).reduce((t, i) => t + i.valor, 0) * mult)}
                </span>
              </button>
            ))}
            <button type="button" className="botao botao-primario massa-botao" onClick={() => venderItens('todas')}>
              <span>Vender todos os itens</span>
              <span className="botao-sub">+{formatar(total)}</span>
            </button>
          </div>
          <ul className="itens">
            {ordenados.map((i) => (
              <Linha key={i.id} item={i} mult={mult} onVender={venderItem} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
