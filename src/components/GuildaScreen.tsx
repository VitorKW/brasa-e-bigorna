import { useState } from 'react'
import { CONQUISTAS } from '../game/conquistas.ts'
import { maxHerois } from '../game/bonus.ts'
import { DEF_EXPEDICAO, segundosParaVoltar, voltou } from '../game/expedicoes.ts'
import { formatar, formatarCusto, formatarDuracao } from '../game/format.ts'
import {
  CLASSES,
  DEF_CLASSE,
  poderHeroi,
  proximaVaga,
  xpParaNivel,
  type ClasseId,
  type Heroi,
} from '../game/herois.ts'
import { NOME_SLOT, SLOTS, rotuloQualidade } from '../game/items.ts'
import { useGame } from '../store.ts'
import { ConquistasSheet } from './ConquistasSheet.tsx'
import { Dica } from './Dica.tsx'
import { EquiparSheet } from './EquiparSheet.tsx'
import { COR_QUALIDADE } from './qualidade.ts'
import { Sprite } from './Sprite.tsx'
import { SpriteHeroi } from './SpritesEvolucao.tsx'

function CartaoHeroi({ heroi, onEquipar }: { heroi: Heroi; onEquipar: (id: number) => void }) {
  const agora = useGame((s) => s.jogo.lastTick)
  const expedicao = useGame((s) => s.jogo.expedicoes.find((e) => e.heroi === heroi.id))
  const def = DEF_CLASSE[heroi.classe]
  const precisa = xpParaNivel(heroi.nivel)
  const pct = Math.min(100, Math.floor((heroi.xp / precisa) * 100))
  const voltouJa = expedicao ? voltou(expedicao, agora) : false
  const irPara = useGame((s) => s.irPara)
  const poderTotal = poderHeroi(heroi)

  let situacao = 'Na guilda, pronto para partir.'
  if (expedicao) {
    const nome = DEF_EXPEDICAO[expedicao.tipo].nome
    situacao = voltouJa
      ? `Voltou de ${nome} com o loot.`
      : `Em expedição: ${nome}. Volta em ${formatarDuracao(Math.ceil(segundosParaVoltar(expedicao, agora)))}.`
  }

  return (
    <li className="heroi painel" aria-label={`${heroi.nome}, ${def.nome}, nível ${heroi.nivel}`}>
      <div className="heroi-topo">
        <div className="heroi-arte">
          <SpriteHeroi heroi={heroi} andando={!!expedicao && !voltouJa} escala={3} rotulo={`${heroi.nome}, ${def.nome}`} fps={5} />
        </div>
        <div className="heroi-texto">
          <h3>{heroi.nome}</h3>
          <span className="heroi-classe">
            {def.nome} · nível {heroi.nivel}
          </span>
          <div className="barra barra-fina" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="XP para o próximo nível">
            <div className="barra-cheia" style={{ width: `${pct}%` }} />
          </div>
          <span className="heroi-xp">
            {Math.floor(heroi.xp)}/{Math.ceil(precisa)} XP
          </span>
        </div>
      </div>

      {/* Equipamento em uma linha: só o ícone com a cor da raridade. Atributos ficam no Equipar. */}
      <ul className="heroi-slots compactos" aria-label="Equipamento">
        {SLOTS.map((s) => {
          const item = heroi.equipamento[s]
          return (
            <li
              key={s}
              className="heroi-slot"
              style={item ? { borderColor: COR_QUALIDADE[item.qualidade] } : undefined}
              aria-label={`${NOME_SLOT[s]}: ${item ? rotuloQualidade(item.qualidade) : 'vazio'}`}
            >
              {item ? <Sprite nome={`item_${item.tipo}_${item.material}`} escala={2} /> : <span className="slot-vazio" aria-hidden="true" />}
            </li>
          )
        })}
        <li className="heroi-poder" aria-label={`Poder ${formatar(poderTotal)}`}>
          <small>Poder</small>
          <strong>{formatar(poderTotal)}</strong>
        </li>
      </ul>

      <p className="estacao-dica" role="status">
        {situacao}
      </p>

      {voltouJa ? (
        <button type="button" className="botao botao-primario botao-largo" onClick={() => irPara('mapa')}>
          Coletar no Mapa
        </button>
      ) : expedicao ? null : (
        <button
          type="button"
          className="botao botao-primario botao-largo"
          onClick={() => onEquipar(heroi.id)}
          aria-label={`Equipar ${heroi.nome}`}
        >
          Equipar
        </button>
      )}
    </li>
  )
}

function Recrutar() {
  const jogo = useGame((s) => s.jogo)
  const recrutar = useGame((s) => s.recrutar)
  const [classe, setClasse] = useState<ClasseId>('guerreiro')
  const vaga = proximaVaga(jogo)
  const maximo = maxHerois(jogo)

  if (!vaga) {
    return (
      <section className="secao painel" aria-label="Recrutar">
        <h2>Recrutar</h2>
        <p className="estacao-dica">O grupo está completo ({maximo} heróis).</p>
      </section>
    )
  }

  const { condicao } = vaga
  const reputacaoPct = condicao.tipo === 'reputacao' ? Math.min(100, Math.floor((jogo.reputacao / condicao.minimo) * 100)) : 0

  return (
    <section className="secao painel" aria-label="Recrutar">
      <div className="secao-topo">
        <h2>Recrutar</h2>
        <span className="secao-contagem">
          {jogo.herois.length}/{maximo}
        </span>
      </div>
      <p className="estacao-dica">{vaga.dica}</p>

      {condicao.tipo === 'reputacao' && (
        <>
          <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={condicao.minimo} aria-valuenow={Math.min(jogo.reputacao, condicao.minimo)} aria-label="Reputação">
            <div className="barra-cheia" style={{ width: `${reputacaoPct}%` }} />
          </div>
          <span className="heroi-xp">
            {formatar(Math.min(jogo.reputacao, condicao.minimo))}/{condicao.minimo} de reputação
          </span>
        </>
      )}

      {!(condicao.tipo === 'taverna' && !vaga.liberada) && (
        <div className="classes" role="radiogroup" aria-label="Classe">
          {CLASSES.map((c) => {
            const d = DEF_CLASSE[c]
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={classe === c}
                className={`classe ${classe === c ? 'marcada' : ''}`}
                onClick={() => setClasse(c)}
              >
                <Sprite nome={`heroi_${c}`} escala={2} />
                <span className="classe-nome">{d.nome}</span>
                <span className="classe-resumo">{d.resumo}</span>
              </button>
            )
          })}
        </div>
      )}

      {condicao.tipo === 'taverna' && !vaga.liberada ? (
        <button type="button" className="botao botao-secundario botao-largo" disabled>
          Aguardando a Taverna (construa no Vilarejo)
        </button>
      ) : (
        <button
          type="button"
          className="botao botao-primario botao-largo botao-recrutar"
          disabled={!vaga.liberada}
          onClick={() => recrutar(classe)}
        >
          <span>Recrutar {DEF_CLASSE[classe].nome.toLowerCase()}</span>
          {condicao.tipo === 'moedas' && (
            <span className="botao-custo">
              <Sprite nome="icone_moeda" escala={1} />
              {formatarCusto(condicao.custo)}
            </span>
          )}
        </button>
      )}
    </section>
  )
}

/** Aba Guilda: heróis, equipamento e recrutamento. */
export function GuildaScreen() {
  const herois = useGame((s) => s.jogo.herois)
  const conquistas = useGame((s) => s.jogo.conquistas.length)
  const semEquipamento = useGame((s) => s.jogo.herois.length === 1 && s.jogo.herois[0]!.equipamento.arma === null)
  const [equipando, setEquipando] = useState<number | null>(null)
  const [verConquistas, setVerConquistas] = useState(false)

  return (
    <>
      <button
        type="button"
        className="botao botao-secundario botao-largo botao-conquistas"
        onClick={() => setVerConquistas(true)}
        aria-label={`Conquistas e ajustes, ${conquistas} de ${CONQUISTAS.length}`}
      >
        <Sprite nome="icone_conquista" escala={2} />
        <span>Conquistas e ajustes</span>
        <span className="botao-sub">
          {conquistas}/{CONQUISTAS.length}
        </span>
      </button>
      <Dica id="heroi" visivel={semEquipamento}>
        Forje armas e armaduras na bigorna, toque em Equipar e mande o herói ao Mapa. Ele traz moedas, XP e reputação.
      </Dica>
      {herois.length === 0 ? (
        <section className="secao painel" aria-label="Heróis">
          <h2>Guilda</h2>
          <p className="estacao-dica">
            Ninguém por aqui ainda. Recrute um herói, forje armas e armaduras para ele e mande-o ao Mapa.
          </p>
        </section>
      ) : (
        <section className="secao painel" aria-label="Heróis">
          <div className="secao-topo">
            <h2>Heróis</h2>
            <span className="secao-contagem">{herois.length}</span>
          </div>
          <ul className="herois">
            {herois.map((h) => (
              <CartaoHeroi key={h.id} heroi={h} onEquipar={setEquipando} />
            ))}
          </ul>
        </section>
      )}
      <Recrutar />
      {equipando !== null && <EquiparSheet heroiId={equipando} onFechar={() => setEquipando(null)} />}
      {verConquistas && <ConquistasSheet onFechar={() => setVerConquistas(false)} />}
    </>
  )
}
