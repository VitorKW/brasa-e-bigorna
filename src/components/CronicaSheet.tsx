import { useEffect, useRef, useState } from 'react'
import {
  CAPITULOS,
  capituloAtual,
  capituloCompleto,
  descreverRecompensa,
  missaoFeita,
  recompensaRecebida,
  type Capitulo,
  type Recompensa,
} from '../game/campanha.ts'
import { DEF_NPC } from '../game/encomendas.ts'
import { useGame } from '../store.ts'
import { Sprite, type SpriteNome } from './Sprite.tsx'

const iconeDa = (r: Recompensa): SpriteNome =>
  r.tipo === 'moedas' ? 'icone_moeda' : r.tipo === 'brasas' ? 'icone_brasa' : `item_${r.item}_${r.material}`

/** Quem fala, com retrato, e o que diz. */
function Fala({ c, texto }: { c: Capitulo; texto: string }) {
  const npc = DEF_NPC[c.narrador]
  return (
    <div className="cronica-fala">
      <Sprite nome={`npc_${c.narrador}`} escala={3} rotulo={`${npc.nome}, ${npc.papel}`} />
      <div className="cronica-fala-texto">
        <span className="cronica-quem">
          {npc.nome} <small>· {npc.papel}</small>
        </span>
        <p>“{texto}”</p>
      </div>
    </div>
  )
}

function LinhaRecompensa({ r }: { r: Recompensa }) {
  return (
    <p className="cronica-recompensa">
      <Sprite nome={iconeDa(r)} escala={2} />
      <span>
        Recompensa: <strong>{descreverRecompensa(r)}</strong>
      </span>
    </p>
  )
}

/** Capítulo já fechado: uma linha que abre para reler a história. */
function CapituloFeito({ c }: { c: Capitulo }) {
  const [aberto, setAberto] = useState(false)
  return (
    <li className="cronica-feito">
      <button type="button" className="cronica-linha" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <span className="cronica-marca feita" aria-hidden="true" />
        <span>
          Capítulo {c.numero} · {c.titulo}
        </span>
        <small>{aberto ? 'fechar' : 'reler'}</small>
      </button>
      {aberto && (
        <>
          <Fala c={c} texto={c.abertura} />
          <Fala c={c} texto={c.desfecho} />
        </>
      )}
    </li>
  )
}

/**
 * Crônica da forja: a campanha. Mostra o capítulo em andamento (quem conta, as missões e a recompensa),
 * os já fechados (para reler) e os que vêm. Receber a recompensa mostra o desfecho antes de abrir o
 * capítulo seguinte.
 */
export function CronicaSheet() {
  const jogo = useGame((s) => s.jogo)
  const receber = useGame((s) => s.receberRecompensa)
  const fecharCronica = useGame((s) => s.fecharCronica)
  /** Capítulo que acabou de ser fechado nesta visita: mostra o desfecho antes de seguir. */
  const [recem, setRecem] = useState<Capitulo | null>(null)
  const botaoFechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // preventScroll: o botão fica no fim da folha, e focar sem isso rolava a tela e escondia o título.
    botaoFechar.current?.focus({ preventScroll: true })
    const aoTecla = (e: KeyboardEvent) => e.key === 'Escape' && fecharCronica()
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [fecharCronica])

  const atual = capituloAtual(jogo)
  const feitos = CAPITULOS.filter((c) => recompensaRecebida(jogo, c) && c !== recem)
  const futuros = CAPITULOS.filter((c) => !recompensaRecebida(jogo, c) && c !== atual)
  const completo = atual !== null && capituloCompleto(jogo, atual)
  // Primeira vez (jogo novo): só a abertura do capítulo 1 e o botão de começar, para caber na tela.
  const intro = !jogo.campanha.introVista

  const aoReceber = () => {
    if (!atual) return
    setRecem(atual)
    receber()
  }

  return (
    <div className="modal-fundo" onClick={(e) => e.target === e.currentTarget && fecharCronica()}>
      <div className="modal painel cronica" role="dialog" aria-modal="true" aria-labelledby="titulo-cronica">
        <h2 id="titulo-cronica">
          <Sprite nome="icone_cronica" escala={2} /> Crônica da forja
        </h2>

        {recem ? (
          <section className="cronica-atual concluido" aria-label={`Capítulo ${recem.numero} concluído`}>
            <span className="cronica-selo">Capítulo {recem.numero} concluído</span>
            <h3>{recem.titulo}</h3>
            <Fala c={recem} texto={recem.desfecho} />
            <p className="cronica-recompensa recebida" role="status">
              <Sprite nome={iconeDa(recem.recompensa)} escala={2} />
              <span>
                Recebido: <strong>{descreverRecompensa(recem.recompensa)}</strong>
              </span>
            </p>
            <button type="button" className="botao botao-primario botao-largo" onClick={() => setRecem(null)}>
              {atual ? 'Continuar a história' : 'Fechar o livro'}
            </button>
          </section>
        ) : atual ? (
          <section className="cronica-atual" aria-label={`Capítulo ${atual.numero}: ${atual.titulo}`}>
            <span className="cronica-numero">
              Capítulo {atual.numero} de {CAPITULOS.length}
            </span>
            <h3>{atual.titulo}</h3>
            <Fala c={atual} texto={atual.abertura} />
            <ul className="cronica-missoes" aria-label="Missões">
              {atual.missoes.map((m) => {
                const feita = missaoFeita(jogo, m.id)
                return (
                  <li key={m.id} className={feita ? 'feita' : ''} aria-label={`${m.texto}: ${feita ? 'cumprida' : 'por fazer'}`}>
                    <span className={`cronica-marca ${feita ? 'feita' : ''}`} aria-hidden="true" />
                    <span>{m.texto}</span>
                  </li>
                )
              })}
            </ul>
            <LinhaRecompensa r={atual.recompensa} />
            {!intro && (
              <button type="button" className="botao botao-primario botao-largo" disabled={!completo} onClick={aoReceber}>
                {completo ? 'Receber recompensa' : 'Cumpra as missões para receber'}
              </button>
            )}
          </section>
        ) : (
          <section className="cronica-atual" aria-label="Fim da crônica">
            <h3>Fim da crônica</h3>
            <p className="estacao-dica">
              A história do vilarejo está escrita. A forja continua: cada Reforjar deixa você mais forte do que o anterior.
            </p>
          </section>
        )}

        {!recem && !intro && futuros.length > 0 && (
          <ul className="cronica-lista" aria-label="Próximos capítulos">
            {futuros.map((c) => (
              <li key={c.numero} className="cronica-linha futura">
                <span className="cronica-marca" aria-hidden="true" />
                <span>
                  Capítulo {c.numero} · {c.titulo}
                </span>
              </li>
            ))}
          </ul>
        )}

        {!recem && feitos.length > 0 && (
          <ul className="cronica-lista" aria-label="Capítulos concluídos">
            {feitos.map((c) => (
              <CapituloFeito key={c.numero} c={c} />
            ))}
          </ul>
        )}

        <button ref={botaoFechar} type="button" className={`botao ${intro ? 'botao-primario' : 'botao-secundario'} botao-largo`} onClick={fecharCronica}>
          {intro ? 'Começar' : 'Fechar'}
        </button>
      </div>
    </div>
  )
}
