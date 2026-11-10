import { temConstrucao } from '../game/construcoes.ts'
import { retornosPendentes } from '../game/expedicoes.ts'
import { useGame, type AbaId } from '../store.ts'

const ABAS: readonly { id: AbaId; nome: string }[] = [
  { id: 'forja', nome: 'Forja' },
  { id: 'guilda', nome: 'Guilda' },
  { id: 'mapa', nome: 'Mapa' },
  { id: 'vilarejo', nome: 'Vilarejo' },
  { id: 'reforjar', nome: 'Reforjar' },
]

export function TabBar() {
  const aba = useGame((s) => s.aba)
  const irPara = useGame((s) => s.irPara)
  // Expedições que já voltaram e esperam a coleta: aviso discreto na aba Mapa.
  const voltaram = useGame((s) => retornosPendentes(s.jogo, s.jogo.lastTick).length)
  // O Reforjar tem cadeado até a Muralha: a aba abre, mas a tela explica o que falta.
  const trancada = useGame((s) => !temConstrucao(s.jogo, 'muralha'))

  return (
    <nav className="abas painel" aria-label="Navegação principal">
      {ABAS.map((a) => {
        const ativa = a.id === aba
        const selo = a.id === 'mapa' ? voltaram : 0
        const cadeado = a.id === 'reforjar' && trancada
        return (
          <button
            key={a.id}
            type="button"
            className={`aba ${ativa ? 'ativa' : ''} ${cadeado ? 'trancada' : ''}`}
            aria-current={ativa ? 'page' : undefined}
            onClick={() => irPara(a.id)}
          >
            <span className="aba-nome">
              {a.nome}
              {selo > 0 && (
                <span className="aba-selo" role="status" aria-label={`${selo} ${selo === 1 ? 'expedição voltou' : 'expedições voltaram'}`}>
                  {selo}
                </span>
              )}
            </span>
            {cadeado && <span className="aba-sub">trancada</span>}
          </button>
        )
      })}
    </nav>
  )
}
