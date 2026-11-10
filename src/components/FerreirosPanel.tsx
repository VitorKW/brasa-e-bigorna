import type { EstacaoId } from '../game/constants.ts'
import {
  FERREIROS,
  FERREIROS_DEF,
  ferreiroEm,
  custoContratar,
  quantosContratados,
  xpParaProximo,
  type FerreiroId,
} from '../game/ferreiros.ts'
import { formatarCusto } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Sprite } from './Sprite.tsx'

const NOME_ESTACAO: Record<EstacaoId, string> = {
  mina: 'Mina',
  carvoaria: 'Carvoaria',
  fornalha: 'Fornalha',
  forno: 'Forno de aço',
  bigorna: 'Bigorna',
}

function Ferreiro({ id }: { id: FerreiroId }) {
  const jogo = useGame((s) => s.jogo)
  const contratar = useGame((s) => s.contratar)
  const alocar = useGame((s) => s.alocar)
  const def = FERREIROS_DEF[id]
  const f = jogo.ferreiros[id]
  const custo = custoContratar(jogo)
  const precisa = xpParaProximo(f.nivel)

  return (
    <li className={`ferreiro ${f.contratado ? '' : 'livre'}`}>
      <div className="ferreiro-topo">
        <Sprite nome={`ferreiro_${id}`} escala={2} rotulo={def.nome} />
        <div className="ferreiro-texto">
          <span className="ferreiro-nome">{def.nome}</span>
          <span className="ferreiro-passiva">{def.passiva}</span>
          {f.contratado && (
            <span className="ferreiro-nivel">
              nível {f.nivel} · {Math.floor(f.xp)}/{Math.ceil(precisa)} XP
            </span>
          )}
        </div>
      </div>

      {!f.contratado ? (
        <button
          type="button"
          className="botao botao-primario botao-largo ferreiro-contratar"
          disabled={jogo.moedas < custo}
          onClick={() => contratar(id)}
          aria-label={`Contratar ${def.nome} por ${formatarCusto(custo)} moedas`}
        >
          <span>Contratar</span>
          <span className="botao-custo">
            <Sprite nome="icone_moeda" escala={1} />
            {formatarCusto(custo)}
          </span>
        </button>
      ) : (
        <>
          <div className="barra barra-fina" aria-hidden="true">
            <div className="barra-cheia" style={{ width: `${Math.min(100, (f.xp / precisa) * 100)}%` }} />
          </div>
          <div className="postos" role="group" aria-label={`Posto de ${def.nome}`}>
            {def.estacoes.filter((e) => e !== 'forno' || jogo.niveis.forno >= 1).map((e) => {
              const aqui = f.estacao === e
              const outro = ferreiroEm(jogo, e)
              const ocupante = outro && outro !== id ? FERREIROS_DEF[outro].nome : null
              return (
                <button
                  key={e}
                  type="button"
                  className={`botao posto ${aqui ? 'botao-primario' : 'botao-secundario'}`}
                  aria-pressed={aqui}
                  onClick={() => alocar(id, aqui ? null : e)}
                  aria-label={
                    aqui
                      ? `Tirar ${def.nome} da ${NOME_ESTACAO[e]}`
                      : `Pôr ${def.nome} na ${NOME_ESTACAO[e]}${ocupante ? `, no lugar de ${ocupante}` : ''}`
                  }
                >
                  {NOME_ESTACAO[e]}
                  {aqui && <small>no posto</small>}
                  {!aqui && ocupante && <small>troca</small>}
                </button>
              )
            })}
          </div>
          {f.estacao === null && <p className="estacao-aviso">Sem posto. Escolha uma estação para ele trabalhar.</p>}
        </>
      )}
    </li>
  )
}

export function FerreirosPanel() {
  const jogo = useGame((s) => s.jogo)
  const contratados = quantosContratados(jogo)

  return (
    <section className="secao painel" aria-label="Ferreiros">
      <div className="secao-topo">
        <h2>Ferreiros</h2>
        <span className="secao-contagem">
          {contratados}/{FERREIROS.length}
        </span>
      </div>
      <p className="estacao-dica">Um ferreiro por estação. Eles sobem de nível trabalhando.</p>
      <ul className="ferreiros">
        {FERREIROS.map((id) => (
          <Ferreiro key={id} id={id} />
        ))}
      </ul>
    </section>
  )
}
