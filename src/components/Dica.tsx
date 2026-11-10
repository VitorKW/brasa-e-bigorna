import type { ReactNode } from 'react'
import { useGame } from '../store.ts'

/**
 * Dica curta de primeira vez (GDD §8: entender o loop em 2 min sem tutorial longo). Fica inline,
 * nunca bloqueia a tela e some para sempre ao tocar em "Entendi" (gravado no save).
 */
export function Dica({ id, visivel = true, children }: { id: string; visivel?: boolean; children: ReactNode }) {
  const vista = useGame((s) => s.jogo.dicasVistas.includes(id))
  const dispensar = useGame((s) => s.dispensarDica)
  if (vista || !visivel) return null
  return (
    <aside className="dica" role="note">
      <p>{children}</p>
      <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => dispensar(id)}>
        Entendi
      </button>
    </aside>
  )
}
