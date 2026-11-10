import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { atributosHeroi, diferencaAtributos } from '../game/herois.ts'
import {
  NOME_SLOT,
  SLOTS,
  SLOT_DO_TIPO,
  atributosItem,
  nomeItem,
  poderDe,
  rotuloQualidade,
  type Item,
  type Slot,
} from '../game/items.ts'
import { useGame } from '../store.ts'
import { Diferenca, GradeAtributos, textoAtributosItem } from './Atributos.tsx'
import { COR_QUALIDADE } from './qualidade.ts'
import { Sprite } from './Sprite.tsx'

function LinhaItem({ item, children }: { item: Item; children: ReactNode }) {
  const cor = COR_QUALIDADE[item.qualidade]
  return (
    <li className="item item-equipar" style={{ borderColor: cor }}>
      <Sprite nome={`item_${item.tipo}_${item.material}`} escala={2} />
      <div className="item-texto">
        <span className="item-nome">{nomeItem(item)}</span>
        <span className="item-qualidade" style={{ color: cor }}>
          {rotuloQualidade(item.qualidade)}
        </span>
        <span className="item-ferreiro">{textoAtributosItem(atributosItem(item))}</span>
        {children}
      </div>
    </li>
  )
}

/** Folha de equipar: os 4 espaços do herói e, abaixo, o inventário filtrado pelo espaço escolhido. */
export function EquiparSheet({ heroiId, onFechar }: { heroiId: number; onFechar: () => void }) {
  const heroi = useGame((s) => s.jogo.herois.find((h) => h.id === heroiId))
  const itens = useGame((s) => s.jogo.itens)
  const inventarioCheio = useGame((s) => s.jogo.itens.length >= s.jogo.limiteInventario)
  const ocupado = useGame((s) => s.jogo.expedicoes.some((e) => e.heroi === heroiId))
  const equipar = useGame((s) => s.equipar)
  const desequipar = useGame((s) => s.desequipar)
  const [slot, setSlot] = useState<Slot>('arma')
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fechar.current?.focus()
    const aoTecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [onFechar])

  const candidatos = useMemo(
    () =>
      itens
        .filter((i) => SLOT_DO_TIPO[i.tipo] === slot)
        .sort((a, b) => poderDe(atributosItem(b)) - poderDe(atributosItem(a)) || b.id - a.id),
    [itens, slot],
  )

  if (!heroi) return null
  const atual = heroi.equipamento[slot]

  return (
    <div className="modal-fundo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal painel" role="dialog" aria-modal="true" aria-labelledby="titulo-equipar">
        <h2 id="titulo-equipar">Equipar {heroi.nome}</h2>
        <GradeAtributos a={atributosHeroi(heroi)} rotulo={`Atributos de ${heroi.nome}`} />
        {ocupado && <p className="estacao-aviso">Em expedição: o equipamento só muda quando ele voltar e o loot for coletado.</p>}

        <div className="slots" role="tablist" aria-label="Espaço de equipamento">
          {SLOTS.map((s) => {
            const item = heroi.equipamento[s]
            return (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={slot === s}
                className={`slot ${slot === s ? 'marcado' : ''}`}
                onClick={() => setSlot(s)}
              >
                {item ? <Sprite nome={`item_${item.tipo}_${item.material}`} escala={2} /> : <span className="slot-vazio" aria-hidden="true" />}
                <span>{NOME_SLOT[s]}</span>
                <small style={item ? { color: COR_QUALIDADE[item.qualidade] } : undefined}>
                  {item ? rotuloQualidade(item.qualidade) : 'vazio'}
                </small>
              </button>
            )
          })}
        </div>

        {atual && (
          <ul className="itens" aria-label={`${NOME_SLOT[slot]} equipada`}>
            <LinhaItem item={atual}>
              <span className="item-ferreiro">Equipado agora</span>
              <button
                type="button"
                className="botao botao-secundario item-acao"
                disabled={ocupado || inventarioCheio}
                onClick={() => desequipar(heroi.id, slot)}
              >
                {inventarioCheio ? 'Inventário cheio' : 'Tirar'}
              </button>
            </LinhaItem>
          </ul>
        )}

        <h3 className="sheet-subtitulo">No inventário ({candidatos.length})</h3>
        {candidatos.length === 0 ? (
          <p className="estacao-dica">
            Nenhum item de {NOME_SLOT[slot].toLowerCase()} no inventário. Forje um na bigorna.
          </p>
        ) : (
          <ul className="itens">
            {candidatos.map((i) => (
              <LinhaItem key={i.id} item={i}>
                <Diferenca d={diferencaAtributos(heroi, i)} />
                <button
                  type="button"
                  className="botao botao-primario item-acao"
                  disabled={ocupado}
                  onClick={() => equipar(heroi.id, i.id)}
                  aria-label={`Equipar ${nomeItem(i)}, ${rotuloQualidade(i.qualidade)}`}
                >
                  Equipar
                </button>
              </LinhaItem>
            ))}
          </ul>
        )}

        <button ref={fechar} type="button" className="botao botao-secundario botao-largo" onClick={onFechar}>
          Fechar
        </button>
      </div>
    </div>
  )
}
