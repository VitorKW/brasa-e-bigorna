import { chefeDerrotado, DEF_CHEFE } from '../game/chefe.ts'
import {
  CONSTRUCOES,
  DEF_CONSTRUCAO,
  motivoNaoConstruir,
  temConstrucao,
  type ConstrucaoId,
} from '../game/construcoes.ts'
import { formatar, formatarCusto } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Sprite } from './Sprite.tsx'

function CartaoConstrucao({ id }: { id: ConstrucaoId }) {
  const jogo = useGame((s) => s.jogo)
  const construir = useGame((s) => s.construir)
  const def = DEF_CONSTRUCAO[id]
  const feita = temConstrucao(jogo, id)
  const motivo = motivoNaoConstruir(jogo, id)
  const reputacaoOk = jogo.reputacao >= def.reputacao
  const pct = Math.min(100, Math.floor((jogo.reputacao / def.reputacao) * 100))
  const chefe = def.exige ? DEF_CHEFE[def.exige] : null
  const chefeOk = def.exige === null || chefeDerrotado(jogo, def.exige)

  return (
    <li className={`construcao painel ${feita ? 'feita' : ''} ${!feita && !reputacaoOk ? 'fechada' : ''}`} aria-label={def.nome}>
      <div className="construcao-topo">
        <Sprite nome={`construcao_${id}`} escala={2} rotulo={def.nome} />
        <div className="construcao-texto">
          <h3>{def.nome}</h3>
          <span className="construcao-efeito">{def.efeito}</span>
          <span className="estacao-dica">{def.descricao}</span>
        </div>
      </div>

      {feita ? (
        <p className="resultado-ok">Construída.</p>
      ) : (
        <>
          {!reputacaoOk && (
            <>
              <div
                className="barra barra-fina"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={def.reputacao}
                aria-valuenow={Math.floor(jogo.reputacao)}
                aria-label={`Reputação para ${def.nome}`}
              >
                <div className="barra-cheia" style={{ width: `${pct}%` }} />
              </div>
              <span className="heroi-xp">
                {formatar(jogo.reputacao)}/{def.reputacao} de reputação
              </span>
            </>
          )}
          {reputacaoOk && !chefeOk && chefe && (
            <p className="estacao-aviso">Antes, derrote {chefe.nome} no Mapa.</p>
          )}
          <button
            type="button"
            className="botao botao-primario botao-largo botao-recrutar"
            disabled={motivo !== null}
            onClick={() => construir(id)}
            aria-label={`Construir ${def.nome} por ${formatarCusto(def.custo)} moedas`}
          >
            <span>{motivo === 'reputacao' || motivo === 'chefe' ? 'Ainda não' : 'Construir'}</span>
            <span className="botao-custo">
              <Sprite nome="icone_moeda" escala={1} />
              {formatarCusto(def.custo)}
            </span>
          </button>
        </>
      )}
    </li>
  )
}

/** Aba Vilarejo: construções liberadas por reputação (que não se gasta) e pagas com moedas. */
export function VilarejoScreen() {
  const reputacao = useGame((s) => s.jogo.reputacao)
  const construidas = useGame((s) => s.jogo.construcoes.length)

  return (
    <>
      <section className="secao painel" aria-label="Construções">
        <div className="secao-topo">
          <h2>Vilarejo</h2>
          <span className="secao-contagem">
            {construidas}/{CONSTRUCOES.length}
          </span>
        </div>
        <p className="estacao-dica">
          <Sprite nome="icone_reputacao" escala={1} /> {formatar(reputacao)} de reputação. Ela só abre portas: não se gasta.
          Cada obra também custa moedas.
        </p>
        <ul className="construcoes">
          {CONSTRUCOES.map((id) => (
            <CartaoConstrucao key={id} id={id} />
          ))}
        </ul>
      </section>

      <section className="secao painel encomendas" aria-label="Encomendas">
        <div className="secao-topo">
          <h2>Encomendas</h2>
          <span className="secao-contagem">em breve</span>
        </div>
        <p className="estacao-dica">Os moradores vão bater à porta com pedidos. Por enquanto, a forja é toda sua.</p>
      </section>
    </>
  )
}
