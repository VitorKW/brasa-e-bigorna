import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { DEF_CHEFE, type Combatente } from '../game/chefe.ts'
import { formatar } from '../game/format.ts'
import { nomeItem, nomeQualidade } from '../game/items.ts'
import { useGame, type CombateAtivo } from '../store.ts'
import { Sprite } from './Sprite.tsx'
import { SpriteHeroi } from './SpritesEvolucao.tsx'

/** O replay inteiro dura cerca de 6 s, não importa quantos golpes teve o combate. */
export const DURACAO_REPLAY_MS = 6000
const PASSO_MIN_MS = 35
const PASSO_MAX_MS = 450
const PAUSA_INICIAL_MS = 500

export function passoDoReplay(golpes: number): number {
  if (golpes <= 0) return PASSO_MAX_MS
  return Math.min(PASSO_MAX_MS, Math.max(PASSO_MIN_MS, (DURACAO_REPLAY_MS - PAUSA_INICIAL_MS) / golpes))
}

function Lutador({
  c,
  pv,
  ultimo,
  idx,
}: {
  c: Combatente
  pv: number
  ultimo: { alvo: string; dano: number } | null
  idx: number
}) {
  const caido = pv <= 0
  // O herói luta vestido com o que tem: o mesmo kit que aparece na Guilda.
  const heroi = useGame((s) => s.jogo.herois.find((h) => `h${h.id}` === c.id))
  const pct = Math.max(0, Math.min(100, (pv / c.pvMax) * 100))
  const levou = ultimo?.alvo === c.id
  return (
    <div className={`lutador ${c.lado} ${caido ? 'caido' : ''}`}>
      <div className="lutador-arte">
        {c.lado === 'chefe' ? (
          <Sprite nome={c.id === 'serpe' ? 'chefe_serpe' : 'chefe_golem'} escala={3} rotulo={c.nome} />
        ) : (
          heroi ? (
            <SpriteHeroi heroi={heroi} andando={!caido} escala={3} rotulo={c.nome} fps={5} />
          ) : (
            <Sprite nome={caido ? `heroi_${c.classe!}` : `heroi_${c.classe!}_andando`} escala={3} rotulo={c.nome} fps={5} />
          )
        )}
        {levou && (
          <span key={idx} className="dano-numero" aria-hidden="true">
            −{ultimo.dano}
          </span>
        )}
      </div>
      <span className="lutador-nome">{c.nome}</span>
      <div className="barra barra-pv" role="progressbar" aria-valuemin={0} aria-valuemax={c.pvMax} aria-valuenow={pv} aria-label={`PV de ${c.nome}`}>
        <div className="barra-pv-cheia" style={{ width: `${pct}%` }} />
      </div>
      <span className="lutador-pv">{caido ? 'caiu' : `${formatar(pv)}/${formatar(c.pvMax)}`}</span>
    </div>
  )
}

/** Replay do combate de chefe (~6 s): números de dano e barras de PV. Um toque pula. */
export function CombateReplay({ combate }: { combate: CombateAtivo }) {
  const fechar = useGame((s) => s.fecharCombate)
  const reduzir = useReducedMotion() ?? false
  const { resultado, recompensa, chefe } = combate
  const total = resultado.log.length
  const [idx, setIdx] = useState(reduzir ? total : 0)
  const botao = useRef<HTMLButtonElement>(null)
  const terminou = idx >= total
  const def = DEF_CHEFE[chefe]

  useEffect(() => {
    if (terminou) return
    const espera = idx === 0 ? PAUSA_INICIAL_MS : passoDoReplay(total)
    const id = window.setTimeout(() => setIdx((i) => i + 1), espera)
    return () => window.clearTimeout(id)
  }, [idx, terminou, total])

  useEffect(() => {
    botao.current?.focus()
  }, [terminou])

  const pular = () => setIdx(total)

  useEffect(() => {
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (terminou) fechar()
      else pular()
    }
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  })

  // PV de todos depois de `idx` golpes.
  const pvs = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of [...resultado.equipe, resultado.chefe]) m[c.id] = c.pv
    for (const e of resultado.log.slice(0, idx)) m[e.alvo] = e.pvAlvo
    return m
  }, [resultado, idx])

  const atual = idx > 0 ? resultado.log[idx - 1]! : null
  const nomes = useMemo(() => {
    const m: Record<string, string> = {}
    for (const c of [...resultado.equipe, resultado.chefe]) m[c.id] = c.nome
    return m
  }, [resultado])

  return (
    <div className="modal-fundo" onClick={() => !terminou && pular()}>
      <div className="modal painel combate" role="dialog" aria-modal="true" aria-labelledby="titulo-combate">
        <h2 id="titulo-combate">{def.nome}</h2>
        <p className="combate-rodada">
          {terminou ? `Fim da luta · ${resultado.rodadas} ${resultado.rodadas === 1 ? 'rodada' : 'rodadas'}` : `Rodada ${atual?.rodada ?? 1}`}
        </p>

        <div className="arena">
          <div className="arena-lado">
            {resultado.equipe.map((c) => (
              <Lutador key={c.id} c={c} pv={pvs[c.id]!} ultimo={atual} idx={idx} />
            ))}
          </div>
          <div className="arena-lado arena-chefe">
            <Lutador c={resultado.chefe} pv={pvs[resultado.chefe.id]!} ultimo={atual} idx={idx} />
          </div>
        </div>

        <p className="narracao" aria-hidden="true">
          {terminou || !atual
            ? ' '
            : `${nomes[atual.ator]} golpeia ${nomes[atual.alvo]}: ${atual.dano}${atual.derrubou ? ' (caiu!)' : ''}`}
        </p>

        {terminou ? (
          <div className="combate-resumo" role="status">
            {resultado.vitoria ? (
              <>
                <p className="resultado-ok">
                  Vitória em {resultado.rodadas} {resultado.rodadas === 1 ? 'rodada' : 'rodadas'}.
                </p>
                {recompensa ? (
                  <ul className="modal-lista">
                    <li>
                      <Sprite nome="icone_reputacao" escala={2} />
                      <span>Reputação</span>
                      <strong>+{recompensa.reputacao}</strong>
                    </li>
                    <li>
                      <Sprite nome="icone_fragmento" escala={2} />
                      <span>Fragmentos rúnicos</span>
                      <strong>+{recompensa.fragmentos}</strong>
                    </li>
                    <li>
                      <Sprite nome={`item_${recompensa.presente.tipo}_${recompensa.presente.material}`} escala={2} />
                      <span>
                        {nomeItem(recompensa.presente)} {nomeQualidade(recompensa.presente.qualidade, recompensa.presente.tipo)}
                      </span>
                      <strong>presente</strong>
                    </li>
                  </ul>
                ) : null}
                {recompensa && <p className="modal-texto">Abriu: {def.libera}.</p>}
              </>
            ) : (
              <>
                <p className="resultado-falha">A equipe recuou, sem perder nada.</p>
                <p className="modal-texto">
                  {resultado.sobreviventes === 0
                    ? 'Todos caíram antes de vencer.'
                    : `Passaram ${resultado.rodadas} rodadas e ${def.nome} ainda tinha ${formatar(resultado.pvChefeFinal)} PV.`}{' '}
                  Melhore o equipamento e tente de novo.
                </p>
              </>
            )}
            <button ref={botao} type="button" className="botao botao-primario botao-largo" onClick={fechar}>
              Fechar
            </button>
          </div>
        ) : (
          <button ref={botao} type="button" className="botao botao-secundario botao-largo" onClick={pular}>
            Pular
          </button>
        )}
      </div>
    </div>
  )
}
