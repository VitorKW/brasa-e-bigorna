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
import { EncomendasPanel } from './EncomendasPanel.tsx'
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

/** Aba Vilarejo: primeiro as encomendas (têm prazo), depois as obras. As prontas viram uma fileira de selos. */
export function VilarejoScreen() {
  const reputacao = useGame((s) => s.jogo.reputacao)
  const construcoes = useGame((s) => s.jogo.construcoes)
  const feitas = CONSTRUCOES.filter((id) => construcoes.includes(id))
  const faltam = CONSTRUCOES.filter((id) => !construcoes.includes(id))

  return (
    <>
      <EncomendasPanel />

      <section className="secao painel" aria-label="Construções">
        <div className="secao-topo">
          <h2>Obras</h2>
          <span className="secao-contagem">
            {feitas.length}/{CONSTRUCOES.length}
          </span>
        </div>
        <p className="estacao-dica dica-icone">
          <Sprite nome="icone_reputacao" escala={1} /> {formatar(reputacao)} de reputação: ela abre as obras e não se gasta.
        </p>
        {feitas.length > 0 && (
          <ul className="obras-feitas" aria-label="Construídas">
            {feitas.map((id) => (
              <li key={id} title={DEF_CONSTRUCAO[id].efeito}>
                <Sprite nome={`construcao_${id}`} escala={1} />
                <span>{DEF_CONSTRUCAO[id].nome}</span>
              </li>
            ))}
          </ul>
        )}
        {faltam.length > 0 && (
          <ul className="construcoes">
            {faltam.map((id) => (
              <CartaoConstrucao key={id} id={id} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
