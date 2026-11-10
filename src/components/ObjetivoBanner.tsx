import { useMemo } from 'react'
import { proximoObjetivo, type DestinoObjetivo } from '../game/objetivo.ts'
import { useGame } from '../store.ts'

const ONDE: Record<DestinoObjetivo, string> = {
  producao: 'Produção',
  bigorna: 'Bigorna',
  guilda: 'Guilda',
  mapa: 'Mapa',
  vilarejo: 'Vilarejo',
  reforjar: 'Reforjar',
}

/** Uma linha fixa no topo: o que fazer agora. Tocar leva até onde se faz. */
export function ObjetivoBanner() {
  const jogo = useGame((s) => s.jogo)
  const aba = useGame((s) => s.aba)
  const subForja = useGame((s) => s.subForja)
  const irPara = useGame((s) => s.irPara)
  const irParaForja = useGame((s) => s.irParaForja)
  const o = useMemo(() => proximoObjetivo(jogo, jogo.lastTick), [jogo])

  const ir = () => {
    if (o.destino === 'producao' || o.destino === 'bigorna') irParaForja(o.destino)
    else irPara(o.destino)
  }
  const aqui =
    o.destino === 'producao' || o.destino === 'bigorna' ? aba === 'forja' && subForja === o.destino : aba === o.destino
  const pct = o.progresso === null ? null : Math.floor(o.progresso * 100)

  return (
    <button type="button" className={`objetivo painel ${aqui ? 'aqui' : ''}`} onClick={ir} aria-label={`Objetivo: ${o.texto}${aqui ? '' : ` Ir para ${ONDE[o.destino]}.`}`}>
      <span className="objetivo-rotulo">Objetivo</span>
      <span className="objetivo-texto">{o.texto}</span>
      {!aqui && <span className="objetivo-ir" aria-hidden="true">{ONDE[o.destino]} ›</span>}
      {pct !== null && (
        <span className="objetivo-barra" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </span>
      )}
    </button>
  )
}
