import { useEffect, useMemo, useRef, useState } from 'react'
import { CAPITULOS, progressoCampanha } from '../game/campanha.ts'
import { proximoObjetivo, type DestinoObjetivo } from '../game/objetivo.ts'
import { useGame } from '../store.ts'
import { Sprite } from './Sprite.tsx'

const ONDE: Record<DestinoObjetivo, string> = {
  producao: 'Produção',
  bigorna: 'Bigorna',
  guilda: 'Guilda',
  mapa: 'Mapa',
  vilarejo: 'Vilarejo',
  reforjar: 'Reforjar',
}

const TEXTO_DA_MISSAO = new Map(CAPITULOS.flatMap((c) => c.missoes.map((m) => [m.id, m.texto] as const)))

/**
 * Faixa fixa no topo: o capítulo da campanha e o que fazer agora. A parte grande leva até onde se faz
 * (ou abre a Crônica, quando há recompensa esperando); o botão do livro abre a Crônica. Quando uma
 * missão é cumprida, a faixa avisa por alguns segundos.
 */
export function ObjetivoBanner() {
  const jogo = useGame((s) => s.jogo)
  const aba = useGame((s) => s.aba)
  const subForja = useGame((s) => s.subForja)
  const irPara = useGame((s) => s.irPara)
  const irParaForja = useGame((s) => s.irParaForja)
  const abrirCronica = useGame((s) => s.abrirCronica)
  const som = useGame((s) => s.som)
  const o = useMemo(() => proximoObjetivo(jogo, jogo.lastTick), [jogo])
  const p = useMemo(() => progressoCampanha(jogo), [jogo.campanha])

  // Missão recém-cumprida: aviso curto na própria faixa.
  const feitasAntes = useRef(jogo.campanha.feitas)
  const [cumprida, setCumprida] = useState<{ id: string; texto: string } | null>(null)
  useEffect(() => {
    const novas = jogo.campanha.feitas.filter((id) => !feitasAntes.current.includes(id))
    feitasAntes.current = jogo.campanha.feitas
    const ultima = novas[novas.length - 1]
    if (!ultima) return
    setCumprida({ id: ultima, texto: TEXTO_DA_MISSAO.get(ultima) ?? '' })
    som('entrega')
    const t = window.setTimeout(() => setCumprida(null), 3000)
    return () => window.clearTimeout(t)
  }, [jogo.campanha.feitas, som])

  const ir = () => {
    if (p.prontoParaReceber) abrirCronica()
    else if (o.destino === 'producao' || o.destino === 'bigorna') irParaForja(o.destino)
    else irPara(o.destino)
  }
  const aqui =
    o.destino === 'producao' || o.destino === 'bigorna' ? aba === 'forja' && subForja === o.destino : aba === o.destino
  const pct = o.progresso === null ? null : Math.floor(o.progresso * 100)

  const rotulo = p.capitulo ? `Capítulo ${p.capitulo.numero} · ${p.capitulo.titulo}` : 'Objetivo'
  const texto = p.prontoParaReceber ? 'Capítulo concluído! Receba a recompensa.' : o.texto
  const destino = p.prontoParaReceber ? 'Crônica' : aqui ? null : ONDE[o.destino]

  return (
    <div className={`objetivo painel ${p.prontoParaReceber ? 'pronto' : aqui ? 'aqui' : ''}`}>
      <button
        type="button"
        className="objetivo-principal"
        onClick={ir}
        aria-label={`${rotulo}. ${texto}${destino ? ` Ir para ${destino}.` : ''}`}
      >
        <span className="objetivo-rotulo">{rotulo}</span>
        {cumprida ? (
          <span key={cumprida.id} className="objetivo-texto objetivo-cumprida" role="status">
            Missão cumprida: {cumprida.texto}
          </span>
        ) : (
          <span className="objetivo-texto">{texto}</span>
        )}
        {destino && !cumprida && (
          <span className="objetivo-ir" aria-hidden="true">
            {destino} ›
          </span>
        )}
      </button>
      <button
        type="button"
        className="objetivo-cronica"
        onClick={abrirCronica}
        aria-label={p.capitulo ? `Abrir a Crônica: ${p.feitas} de ${p.total} missões do capítulo` : 'Abrir a Crônica'}
      >
        <Sprite nome="icone_cronica" escala={2} />
        {p.capitulo && (
          <span className="objetivo-contagem" aria-hidden="true">
            {p.feitas}/{p.total}
          </span>
        )}
      </button>
      {pct !== null && !p.prontoParaReceber && (
        <span className="objetivo-barra" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </span>
      )}
    </div>
  )
}
