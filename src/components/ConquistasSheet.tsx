import { useEffect, useRef, useState } from 'react'
import { CONQUISTAS, DEF_CONQUISTA } from '../game/conquistas.ts'
import { duracaoMediaSessao, fracaoComBatida } from '../game/estatisticas.ts'
import { formatar, formatarDuracao } from '../game/format.ts'
import { useGame } from '../store.ts'
import { Sprite } from './Sprite.tsx'

const pct = (f: number | null): string => (f === null ? 'sem dados' : `${Math.round(f * 100)} %`)

function Estatisticas() {
  const stats = useGame((s) => s.jogo.stats)
  const media = duracaoMediaSessao(stats)
  const linhas: [string, string][] = [
    ['Sessões', formatar(stats.sessoes)],
    ['Tempo de jogo ativo', formatarDuracao(stats.tempoAtivoSegundos)],
    ['Duração média da sessão', media === null ? 'sem dados' : formatarDuracao(media)],
    ['Forjas com a batida', `${pct(fracaoComBatida(stats))} (${formatar(stats.forjasComBatida)} de ${formatar(stats.forjasTotal)})`],
    ['Itens forjados', formatar(stats.itensForjados)],
    ['Lendários forjados', formatar(stats.lendariosForjados)],
    ['Melhor sequência de perfeitas', formatar(stats.melhorSequenciaPerfeita)],
    ['Lingotes fundidos', formatar(stats.lingotesFundidos)],
    ['Encomendas entregues', formatar(stats.encomendasEntregues)],
    ['Encomendas vencidas', formatar(stats.encomendasExpiradas)],
    ['Entregas em cima da hora', formatar(stats.entregasNaHoraH)],
  ]
  return (
    <dl className="estatisticas" aria-label="Estatísticas">
      {linhas.map(([nome, valor]) => (
        <div key={nome} className="estatistica">
          <dt>{nome}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

/**
 * Folha de conquistas e ajustes (fatia 5). As estatísticas locais do GDD §8 ficam escondidas atrás de
 * um botão: servem ao playtest, não ao jogador comum.
 */
export function ConquistasSheet({ onFechar }: { onFechar: () => void }) {
  const desbloqueadas = useGame((s) => s.jogo.conquistas)
  const som = useGame((s) => s.jogo.som)
  const alternarSom = useGame((s) => s.alternarSom)
  const [verStats, setVerStats] = useState(false)
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fechar.current?.focus()
    const aoTecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', aoTecla)
    return () => window.removeEventListener('keydown', aoTecla)
  }, [onFechar])

  return (
    <div className="modal-fundo" onClick={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal painel" role="dialog" aria-modal="true" aria-labelledby="titulo-conquistas">
        <h2 id="titulo-conquistas">
          Conquistas{' '}
          <span className="secao-contagem">
            {desbloqueadas.length}/{CONQUISTAS.length}
          </span>
        </h2>

        <ul className="conquistas">
          {CONQUISTAS.map((id) => {
            const def = DEF_CONQUISTA[id]
            const feita = desbloqueadas.includes(id)
            return (
              <li key={id} className={`conquista ${feita ? 'feita' : ''}`} aria-label={`${def.nome}: ${feita ? 'desbloqueada' : 'bloqueada'}`}>
                <span className={feita ? '' : 'conquista-apagada'}>
                  <Sprite nome="icone_conquista" escala={2} />
                </span>
                <div className="conquista-texto">
                  <span className="conquista-nome">{def.nome}</span>
                  <span className="conquista-descricao">{def.descricao}</span>
                </div>
                <span className="conquista-estado">{feita ? 'feita' : 'a fazer'}</span>
              </li>
            )
          })}
        </ul>

        <h3 className="sheet-subtitulo">Ajustes</h3>
        <button
          type="button"
          className={`botao interruptor ${som ? 'ligado' : ''}`}
          role="switch"
          aria-checked={som}
          onClick={alternarSom}
        >
          <span className="interruptor-trilho" aria-hidden="true">
            <span className="interruptor-bola" />
          </span>
          <span>
            Som
            <small>{som ? ' · ligado' : ' · desligado (tons curtos, sem arquivos)'}</small>
          </span>
        </button>

        <button
          type="button"
          className="botao botao-secundario botao-largo"
          aria-expanded={verStats}
          aria-controls="estatisticas-locais"
          onClick={() => setVerStats((v) => !v)}
        >
          {verStats ? 'Esconder estatísticas' : 'Estatísticas'}
        </button>
        <div id="estatisticas-locais">{verStats && <Estatisticas />}</div>

        <button ref={fechar} type="button" className="botao botao-primario botao-largo" onClick={onFechar}>
          Fechar
        </button>
      </div>
    </div>
  )
}
