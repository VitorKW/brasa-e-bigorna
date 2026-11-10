import { retornosPendentes } from '../game/expedicoes.ts'
import { useGame, type AbaId } from '../store.ts'

const ABAS = [
  { id: 'forja', nome: 'Forja', pronta: true },
  { id: 'guilda', nome: 'Guilda', pronta: true },
  { id: 'mapa', nome: 'Mapa', pronta: true },
  { id: 'vilarejo', nome: 'Vilarejo', pronta: false },
  { id: 'reforjar', nome: 'Reforjar', pronta: false },
] as const

export function TabBar() {
  const aba = useGame((s) => s.aba)
  const irPara = useGame((s) => s.irPara)
  // Expedições que já voltaram e esperam a coleta: aviso discreto na aba Mapa.
  const voltaram = useGame((s) => retornosPendentes(s.jogo, s.jogo.lastTick).length)

  return (
    <nav className="abas painel" aria-label="Navegação principal">
      {ABAS.map((a) => {
        const ativa = a.pronta && a.id === aba
        const selo = a.id === 'mapa' ? voltaram : 0
        return (
          <button
            key={a.id}
            type="button"
            className={`aba ${ativa ? 'ativa' : ''}`}
            aria-current={ativa ? 'page' : undefined}
            disabled={!a.pronta}
            onClick={() => a.pronta && irPara(a.id as AbaId)}
          >
            <span className="aba-nome">
              {a.nome}
              {selo > 0 && (
                <span className="aba-selo" role="status" aria-label={`${selo} ${selo === 1 ? 'expedição voltou' : 'expedições voltaram'}`}>
                  {selo}
                </span>
              )}
            </span>
            {!a.pronta && <span className="aba-sub">em breve</span>}
          </button>
        )
      })}
    </nav>
  )
}
