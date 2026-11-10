import { useState } from 'react'
import { bonusExpedicao } from '../game/bonus.ts'
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
import { SpriteHeroi } from './SpritesEvolucao.tsx'

const pct = (p: number) => `${Math.round(p * 100)} %`

/** Reputação inteira na tela ("+2", não "+1,57"); o que é menor que 1 aparece como "+<1". */
const rep = (r: number) => (r <= 0 ? '0' : r < 1 ? '<1' : formatar(Math.round(r)))

/** Uma linha por herói fora: andando (com barra) ou de volta (com o loot). */
function LinhaAndamento({ e }: { e: Expedicao }) {
  const agora = useGame((s) => s.jogo.lastTick)
  const heroi = useGame((s) => acharHeroi(s.jogo, e.heroi))
  const def = DEF_EXPEDICAO[e.tipo]
  const chegou = voltou(e, agora)
  const andamento = Math.min(1, Math.max(0, (agora - e.inicio) / (e.fim - e.inicio)))
  const nome = heroi?.nome ?? 'Herói'
  const classe = heroi?.classe ?? 'guerreiro'

  return (
    <li className={`andamento ${chegou ? (e.sucesso ? 'pronto' : 'falhou') : 'quente'}`} aria-label={chegou ? `${nome} voltou de ${def.nome}` : `${nome} em ${def.nome}`}>
      {heroi ? (
        <SpriteHeroi heroi={heroi} andando={!chegou} escala={2} fps={5} />
      ) : (
        <Sprite nome={chegou ? `heroi_${classe}` : `heroi_${classe}_andando`} escala={2} fps={5} />
      )}
      <div className="andamento-texto">
        <span className="andamento-titulo">
          {nome} · {def.nome}
        </span>
        {chegou ? (
          <span className="loot">
            {!e.sucesso && <span className="resultado-falha">Falhou</span>}
            <span>
              <Sprite nome="icone_moeda" escala={1} /> +{formatar(e.moedas)}
            </span>
            {e.reputacao > 0 && (
              <span>
                <Sprite nome="icone_reputacao" escala={1} /> +{rep(e.reputacao)}
              </span>
            )}
            {e.fragmentos > 0 && (
              <span>
                <Sprite nome="icone_fragmento" escala={1} /> +{e.fragmentos}
              </span>
            )}
          </span>
        ) : (
          <>
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
            <span className="estacao-dica">{`volta em ${formatarDuracao(Math.ceil(segundosParaVoltar(e, agora)))}`}</span>
          </>
        )}
      </div>
    </li>
  )
}

/** Uma expedição em duas linhas: nome e tempo; chance e o que rende. O botão manda o herói escolhido. */
function CartaoExpedicao({ tipo, heroi, liberada }: { tipo: ExpedicaoId; heroi: Heroi | undefined; liberada: boolean }) {
  const enviar = useGame((s) => s.enviarExpedicao)
  const jogo = useGame((s) => s.jogo)
  const def = DEF_EXPEDICAO[tipo]
  const prev = heroi
    ? preverExpedicao(poderHeroi(heroi), DEF_CLASSE[heroi.classe].bonusLoot, tipo, bonusExpedicao(jogo), jogo.reputacao)
    : null
  const faixa = prev === null ? '' : prev.chance >= 0.75 ? 'boa' : prev.chance >= 0.4 ? 'media' : 'ruim'

  return (
    <li className={`expedicao compacta ${liberada ? '' : 'fechada'}`} aria-label={def.nome}>
      <div className="expedicao-info">
        <span className="expedicao-nome">
          {def.nome} <small>· {formatarDuracao(def.segundos)}</small>
        </span>
        {liberada && prev && (
          <span className="expedicao-resumo">
            <span className={`chance-texto ${faixa}`} aria-label={`Chance de sucesso ${pct(prev.chance)}`}>
              {pct(prev.chance)}
            </span>
            <span>
              <Sprite nome="icone_moeda" escala={1} /> {formatar(prev.moedas)}
            </span>
            <span>
              <Sprite nome="icone_reputacao" escala={1} /> {rep(prev.reputacao)}
            </span>
          </span>
        )}
      </div>
      <button
        type="button"
        className="botao botao-primario expedicao-ir"
        disabled={!liberada || !heroi}
        onClick={() => heroi && enviar(heroi.id, tipo)}
        aria-label={heroi ? `Mandar ${heroi.nome} para ${def.nome}` : `Sem herói livre para ${def.nome}`}
      >
        Mandar
      </button>
    </li>
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

  if (derrotado) {
    return (
      <p className="chefe-derrotado resultado-ok" aria-label={`Chefe: ${def.nome}, derrotado`}>
        {def.nome}: derrotado.
      </p>
    )
  }

  return (
    <article className="chefe painel" aria-label={`Chefe: ${def.nome}`}>
      <div className="chefe-topo">
        <Sprite nome={chefe === 'golem' ? 'chefe_golem' : 'chefe_serpe'} escala={2} rotulo={def.nome} />
        <div className="chefe-texto">
          <h3>Chefe: {def.nome}</h3>
          <span className="estacao-dica">Vencer abre {def.libera}.</span>
        </div>
      </div>

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
                  <SpriteHeroi heroi={h} escala={2} />
                  <span>
                    {h.nome}
                    <small>{ocupado ? 'fora' : `nível ${h.nivel}`}</small>
                  </span>
                </label>
              )
            })}
          </fieldset>

          <p className={`previsao ${previsao?.vitoria ? 'vitoria' : 'recuo'}`} role="status">
            {previsao === null
              ? 'Escolha ao menos um herói livre.'
              : previsao.vitoria
                ? 'Previsão: vitória.'
                : `Previsão: a equipe perde. Faltariam ${formatar(previsao.pvChefeFinal)} de ${formatar(def.pv)} PV.`}
          </p>
          <button
            type="button"
            className={`botao botao-largo ${previsao?.vitoria ? 'botao-primario' : 'botao-secundario'}`}
            disabled={previsao === null}
            onClick={() => lutar(chefe, escolhidos)}
          >
            {previsao?.vitoria ? `Lutar contra ${chefe === 'golem' ? 'o Golem' : 'a Serpe'}` : 'Tentar assim mesmo'}
          </button>
        </>
      )}
    </article>
  )
}

const CHEFE_DA_REGIAO: Record<RegiaoId, ChefeId> = { vale: 'golem', serra: 'serpe' }

/**
 * Heróis fora, andando por cima do banner da região: a posição é o progresso da viagem (ida e volta,
 * então metade do caminho é o ponto mais longe). Quem já voltou espera parado na borda, acenando.
 */
function Viajantes({ regiao }: { regiao: RegiaoId }) {
  const jogo = useGame((s) => s.jogo)
  const agora = jogo.lastTick
  const aqui = jogo.expedicoes.filter((e) => DEF_EXPEDICAO[e.tipo].regiao === regiao)
  if (aqui.length === 0) return null
  return (
    <div className="viajantes" aria-hidden="true">
      {aqui.map((e, i) => {
        const h = acharHeroi(jogo, e.heroi)
        if (!h) return null
        const t = Math.min(1, Math.max(0, (agora - e.inicio) / (e.fim - e.inicio)))
        const chegou = voltou(e, agora)
        // Ida até 50 %, volta depois: o herói vai à direita e retorna virado para a esquerda.
        const ida = t < 0.5
        const pos = chegou ? 0.04 : ida ? 0.06 + (t / 0.5) * 0.82 : 0.88 - ((t - 0.5) / 0.5) * 0.82
        return (
          <div
            key={e.id}
            className={`viajante ${ida || chegou ? '' : 'voltando'}`}
            style={{ left: `${pos * 100}%`, bottom: `${4 + (i % 2) * 8}px` }}
          >
            <SpriteHeroi heroi={h} andando={!chegou} escala={2} fps={6} />
          </div>
        )
      })}
    </div>
  )
}

/** Aba Mapa: quem está fora, uma região por vez (Vale / Serra) e o chefe dela. */
export function MapaScreen() {
  const jogo = useGame((s) => s.jogo)
  const coletarTodas = useGame((s) => s.coletarTodas)
  const [escolhido, setEscolhido] = useState<number | null>(null)
  const aberta = (r: RegiaoId) => DEF_REGIAO[r].exige === null || chefeDerrotado(jogo, DEF_REGIAO[r].exige)
  // Abre na região mais longe que o jogador já alcançou.
  const [regiao, setRegiao] = useState<RegiaoId>(() => [...REGIOES].reverse().find(aberta) ?? 'vale')

  const livres = jogo.herois.filter((h) => !emExpedicao(jogo, h.id))
  const heroi = livres.find((h) => h.id === escolhido) ?? livres[0]
  const pendentes = retornosPendentes(jogo, jogo.lastTick).length
  const regiaoAberta = aberta(regiao)

  if (jogo.herois.length === 0) {
    return (
      <section className="secao painel" aria-label="Sem heróis">
        <h2>Mapa</h2>
        <p className="estacao-dica">Recrute um herói na Guilda para explorar o Vale da Bigorna.</p>
      </section>
    )
  }

  return (
    <>
      {jogo.expedicoes.length > 0 && (
        <section className="secao painel" aria-label="Expedições em andamento">
          <div className="secao-topo">
            <h2>Fora da guilda</h2>
            {pendentes > 0 && (
              <button type="button" className="botao botao-primario botao-pequeno" onClick={coletarTodas}>
                {pendentes === 1 ? 'Coletar' : `Coletar tudo (${pendentes})`}
              </button>
            )}
          </div>
          <ul className="andamentos">
            {jogo.expedicoes.map((e) => (
              <LinhaAndamento key={e.id} e={e} />
            ))}
          </ul>
        </section>
      )}

      <section className="secao painel" aria-label="Escolher herói">
        <h2>Quem vai?</h2>
        {livres.length === 0 ? (
          <p className="estacao-dica">Todos estão fora. Espere a volta.</p>
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
                <SpriteHeroi heroi={h} escala={2} />
                <span>{h.nome}</span>
                <small>poder {formatar(poderHeroi(h))}</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="sub-abas" role="tablist" aria-label="Regiões">
        {REGIOES.map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={regiao === r}
            className={`sub-aba ${regiao === r ? 'ativa' : ''}`}
            onClick={() => setRegiao(r)}
          >
            {DEF_REGIAO[r].nome}
            {!aberta(r) && <small className="sub-aba-trava"> · bloqueada</small>}
          </button>
        ))}
      </div>

      <section className={`secao painel regiao ${regiaoAberta ? '' : 'fechada'}`} aria-label={DEF_REGIAO[regiao].nome}>
        <div className="regiao-banner">
          <Sprite nome={regiao === 'vale' ? 'regiao_vale' : 'regiao_serra'} escala={3} rotulo={DEF_REGIAO[regiao].nome} />
          <Viajantes regiao={regiao} />
        </div>
        {regiaoAberta ? (
          <>
            <ul className="expedicoes">
              {EXPEDICOES.filter((t) => DEF_EXPEDICAO[t].regiao === regiao).map((t) => (
                <CartaoExpedicao key={t} tipo={t} heroi={heroi} liberada={expedicaoLiberada(jogo, t)} />
              ))}
            </ul>
            <p className="estacao-dica expedicao-legenda">Chance de sucesso, moedas e reputação, para {heroi?.nome ?? 'o herói escolhido'}.</p>
            <CartaoChefe chefe={CHEFE_DA_REGIAO[regiao]} />
          </>
        ) : (
          <p className="estacao-aviso">Bloqueada. Derrote o {DEF_CHEFE[DEF_REGIAO[regiao].exige ?? 'golem'].nome} no Vale para abrir.</p>
        )}
      </section>
    </>
  )
}
