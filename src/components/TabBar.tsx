const ABAS = [
  { id: 'forja', nome: 'Forja', pronta: true },
  { id: 'guilda', nome: 'Guilda', pronta: false },
  { id: 'mapa', nome: 'Mapa', pronta: false },
  { id: 'vilarejo', nome: 'Vilarejo', pronta: false },
  { id: 'reforjar', nome: 'Reforjar', pronta: false },
] as const

export function TabBar() {
  return (
    <nav className="abas painel" aria-label="Navegação principal">
      {ABAS.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`aba ${a.pronta ? 'ativa' : ''}`}
          aria-current={a.pronta ? 'page' : undefined}
          disabled={!a.pronta}
        >
          <span className="aba-nome">{a.nome}</span>
          {!a.pronta && <span className="aba-sub">em breve</span>}
        </button>
      ))}
    </nav>
  )
}
