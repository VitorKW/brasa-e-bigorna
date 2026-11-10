import { useState } from 'react'
import { DEF_CHEFE, chefeDerrotado, preverChefe, type ChefeId } from '../game/chefe.ts'
import {
  DEF_EXPEDICAO,
  DEF_REGIAO,
  EXPEDICOES,
  REGIOES,
  expedicaoLiberada,
  preverExpedicao,
  retornosPendentes,
  segundosParaVoltar,
  voltou,
  type Expedicao,
  type ExpedicaoId,
  type RegiaoId,
} from '../game/expedicoes.ts'
import { formatar, formatarDuracao } from '../game/format.ts'
import { DEF_CLASSE, acharHeroi, emExpedicao, poderHeroi, type Heroi } from '../game/herois.ts'
import { useGame } from '../store.ts'
import { Sprite } from './Sprite.tsx'


const pct = (p: number) => `${Math.round(p * 100)} %`

/** Texto curto de uma duração em segundos: "2 min", "1 h", "8 h". */
const duracao = (s: number) => formatarDuracao(s)

function textoRestante(e: Expedicao, agora: number): string {
  const s = Math.ceil(segundosParaVoltar(e, agora))
  return `volta em ${formatarDuracao(s)}`
}

function CartaoAndamento({ e }: { e: Expedicao }) {
  const agora = useGame((s) => s.jogo.lastTick)
  const heroi = useGame((s) => acharHeroi(s.jogo, e.heroi))
  const coletar = useGame((s) => s.coletarExpedicao)
  const def = DEF_EXPEDICAO[e.tipo]
  const chegou = voltou(e, agora)
  const andamento = Math.min(1, Math.max(0, (agora - e.inicio) / (e.fim - e.inicio)))
  const nome = heroi?.nome ?? 'Herói'

  if (!chegou) {
    return (
      <li className="andamento painel quente" aria-label={`${nome} em ${def.nome}`}>
        <Sprite nome={`heroi_${heroi?.classe ?? 'guerreiro'}_andando`} escala={2} fps={5} />
        <div className="andamento-texto">
          <span className="andamento-titulo">
            {nome} · {def.nome}
          </span>
          <div
            className="barra barra-fina"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.floor(andamento * 100)}
            aria-label={`Progresso da expedição de ${nome}`}
          >
            <div className="barra-cheia" style={{ width: `${andamento * 100}%` }} />
          </div>
          <span className="estacao-dica">{textoRestante(e, agora)}</span>
        </div>
      </li>
    )
  }

  return (
    <li className={`andamento painel ${e.sucesso ? 'pronto' : 'falhou'}`} aria-label={`${nome} voltou de ${def.nome}`}>
      <Sprite nome={`heroi_${heroi?.classe ?? 'guerreiro'}`} escala={2} />
      <div className="andamento-texto">
        <span className="andamento-titulo">
          {nome} voltou · {def.nome}
        </span>
        <span className={e.sucesso ? 'resultado-ok' : 'resultado-falha'}>
          {e.sucesso ? 'Sucesso' : 'Falhou, mas voltou com um pouco'}
        </span>
        <span className="loot">
          <span>
            <Sprite nome="icone_moeda" escala={1} /> +{formatar(e.moedas)}
          </span>
          <span>+{formatar(e.xp)} XP</span>
          {e.reputacao > 0 && (
            <span>
              <Sprite nome="icone_reputacao" escala={1} /> +{e.reputacao}
            </span>
          )}
          {e.fragmentos > 0 && (
            <span>
              <Sprite nome="icone_fragmento" escala={1} /> +{e.fragmentos}
            </span>
          )}
        </span>
      </div>
      <button type="button" className="botao botao-primario andamento-coletar" onClick={() => coletar(e.id)}>
        Coletar
      </button>
    </li>
  )
}

function CartaoExpedicao({
  tipo,
  heroi,
  liberada,
}: {
  tipo: ExpedicaoId
  heroi: Heroi | undefined
  liberada: boolean
}) {
  const enviar = useGame((s) => s.enviarExpedicao)
  const def = DEF_EXPEDICAO[tipo]
  const prev = heroi ? preverExpedicao(poderHeroi(heroi), DEF_CLASSE[heroi.classe].bonusLoot, tipo) : null
  const arriscada = prev !== null && prev.chance < 0.3

  return (
    <li className={`expedicao painel ${liberada ? '' : 'fechada'}`} aria-label={def.nome}>
      <div className="expedicao-topo">
        <h4>{def.nome}</h4>
        <span className="expedicao-meta">
          {duracao(def.segundos)} · dificuldade {def.dificuldade}
        </span>
      </div>

      {liberada && prev ? (
        <>
          <div className="chance">
            <span>
              Chance de sucesso <strong>{pct(prev.chance)}</strong>
            </span>
            <div
              className="barra barra-fina"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(prev.chance * 100)}
              aria-label="Chance de sucesso"
            >
              <div className="barra-cheia" style={{ width: `${prev.chance * 100}%` }} />
            </div>
          </div>
          <p className="loot-esperado">
            <span>
              <Sprite nome="icone_moeda" escala={1} /> {formatar(prev.moedas)}
            </span>
            <span>{formatar(prev.xp)} XP</span>
            <span>
              <Sprite nome="icone_reputacao" escala={1} /> {prev.reputacao}
            </span>
            <span>
              <Sprite nome="icone_fragmento" escala={1} /> {pct(prev.chanceFragmento)}
            </span>
          </p>
          {arriscada && <p className="estacao-aviso">Arriscado: se falhar, volta com só 30 % do loot.</p>}
        </>
      ) : (
        <p className="estacao-dica">
          {liberada ? 'Recrute um herói na Guilda para mandar em expedição.' : 'Região bloqueada.'}
        </p>
      )}

      <button
        type="button"
        className="botao botao-primario botao-largo"
        disabled={!liberada || !heroi}
        onClick={() => heroi && enviar(heroi.id, tipo)}
      >
        {!liberada ? 'Bloqueada' : heroi ? `Mandar ${heroi.nome}` : 'Sem herói livre'}
      </button>
    </li>
  )
}

function Regiao({ id, heroi }: { id: RegiaoId; heroi: Heroi | undefined }) {
  const jogo = useGame((s) => s.jogo)
  const def = DEF_REGIAO[id]
  const aberta = def.exige === null || chefeDerrotado(jogo, def.exige)

  return (
    <section className={`secao painel regiao ${aberta ? '' : 'fechada'}`} aria-label={def.nome}>
      <div className="regiao-banner">
        <Sprite nome={id === 'vale' ? 'regiao_vale' : 'regiao_serra'} escala={3} rotulo={def.nome} />
      </div>
      <div className="secao-topo">
        <h2>{def.nome}</h2>
        {!aberta && <span className="secao-contagem cheio">bloqueada</span>}
      </div>
      <p className="estacao-dica">{def.descricao}</p>
      <ul className="expedicoes">
        {EXPEDICOES.filter((t) => DEF_EXPEDICAO[t].regiao === id).map((t) => (
          <CartaoExpedicao key={t} tipo={t} heroi={heroi} liberada={aberta && expedicaoLiberada(jogo, t)} />
        ))}
      </ul>
      {id === 'vale' && <CartaoChefe chefe="golem" />}
    </section>
  )
}

function CartaoChefe({ chefe }: { chefe: ChefeId }) {
  const jogo = useGame((s) => s.jogo)
  const lutar = useGame((s) => s.lutar)
  const def = DEF_CHEFE[chefe]
  // Heróis fora da luta: o jogador desmarca; heróis em expedição não entram.
  const [fora, setFora] = useState<number[]>([])
  const livres = jogo.herois.filter((h) => !emExpedicao(jogo, h.id))
  const escolhidos = livres.filter((h) => !fora.includes(h.id)).map((h) => h.id)
  const derrotado = chefeDerrotado(jogo, chefe)
  const previsao = escolhidos.length > 0 ? preverChefe(jogo, chefe, escolhidos) : null

  const alternar = (id: number) => setFora((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]))

  return (
    <article className="chefe painel" aria-label={`Chefe: ${def.nome}`}>
      <div className="chefe-topo">
        <Sprite nome="chefe_golem" escala={2} rotulo={def.nome} />
        <div className="chefe-texto">
          <h3>{def.nome}</h3>
          <span className="estacao-dica">
            PV {formatar(def.pv)} · ATQ {def.atq} · DEF {def.def}
          </span>
          <span className="estacao-dica">Ao cair: {def.libera}.</span>
        </div>
      </div>

      {derrotado ? (
        <p className="resultado-ok">Derrotado. {def.libera[0]!.toUpperCase() + def.libera.slice(1)} estão abertos.</p>
      ) : (
        <>
          <p className="estacao-dica">
            Recompensa: {def.reputacao} de reputação, {def.fragmentos} fragmentos e um item lendário.
          </p>
          {jogo.herois.length === 0 ? (
            <p className="estacao-dica">Recrute um herói na Guilda para enfrentar o chefe.</p>
          ) : (
            <>
              <fieldset className="equipe">
                <legend>Equipe</legend>
                {jogo.herois.map((h) => {
                  const ocupado = emExpedicao(jogo, h.id)
                  const marcado = !ocupado && !fora.includes(h.id)
                  return (
                    <label key={h.id} className={`equipe-membro ${marcado ? 'marcado' : ''} ${ocupado ? 'ocupado' : ''}`}>
                      <input type="checkbox" checked={marcado} disabled={ocupado} onChange={() => alternar(h.id)} />
                      <Sprite nome={`heroi_${h.classe}`} escala={2} />
                      <span>
                        {h.nome}
                        <small>{ocupado ? 'em expedição' : `nível ${h.nivel}`}</small>
                      </span>
                    </label>
                  )
                })}
              </fieldset>

              <p className={`previsao ${previsao?.vitoria ? 'vitoria' : 'recuo'}`} role="status">
                {previsao === null
                  ? 'Escolha ao menos um herói livre.'
                  : previsao.vitoria
                    ? `Previsão: vitória em ${previsao.rodadas} ${previsao.rodadas === 1 ? 'rodada' : 'rodadas'}.`
                    : `Previsão: a equipe recua. O Golem ficaria com ${formatar(previsao.pvChefeFinal)} de ${formatar(def.pv)} PV.`}
              </p>
              <button
                type="button"
                className="botao botao-primario botao-largo"
                disabled={previsao === null}
                onClick={() => lutar(chefe, escolhidos)}
              >
                {previsao?.vitoria ? 'Lutar contra o Golem' : 'Tentar assim mesmo'}
              </button>
            </>
          )}
        </>
      )}
    </article>
  )
}

/** Aba Mapa: expedições em andamento, regiões e o chefe. */
export function MapaScreen() {
  const jogo = useGame((s) => s.jogo)
  const coletarTodas = useGame((s) => s.coletarTodas)
  const [escolhido, setEscolhido] = useState<number | null>(null)

  const livres = jogo.herois.filter((h) => !emExpedicao(jogo, h.id))
  const heroi = livres.find((h) => h.id === escolhido) ?? livres[0]
  const pendentes = retornosPendentes(jogo, jogo.lastTick).length

  return (
    <>
      {jogo.expedicoes.length > 0 && (
        <section className="secao painel" aria-label="Expedições em andamento">
          <div className="secao-topo">
            <h2>Em expedição</h2>
            {pendentes > 1 && (
              <button type="button" className="botao botao-primario botao-pequeno" onClick={coletarTodas}>
                Coletar tudo ({pendentes})
              </button>
            )}
          </div>
          <ul className="andamentos">
            {jogo.expedicoes.map((e) => (
              <CartaoAndamento key={e.id} e={e} />
            ))}
          </ul>
        </section>
      )}

      {jogo.herois.length > 0 && (
        <section className="secao painel" aria-label="Escolher herói">
          <h2>Quem vai?</h2>
          {livres.length === 0 ? (
            <p className="estacao-dica">Todos os heróis estão fora. Espere a volta ou colete o loot.</p>
          ) : (
            <div className="escolha-heroi" role="radiogroup" aria-label="Herói da expedição">
              {livres.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  role="radio"
                  aria-checked={heroi?.id === h.id}
                  className={`escolha ${heroi?.id === h.id ? 'marcada' : ''}`}
                  onClick={() => setEscolhido(h.id)}
                >
                  <Sprite nome={`heroi_${h.classe}`} escala={2} />
                  <span>{h.nome}</span>
                  <small>poder {formatar(poderHeroi(h))}</small>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {jogo.herois.length === 0 && (
        <section className="secao painel" aria-label="Sem heróis">
          <h2>Mapa</h2>
          <p className="estacao-dica">
            As terras além do vilarejo esperam. Recrute um herói na Guilda para explorar o Vale da Bigorna.
          </p>
        </section>
      )}

      {REGIOES.map((id) => (
        <Regiao key={id} id={id} heroi={heroi} />
      ))}
    </>
  )
}
