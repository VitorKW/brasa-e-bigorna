/** "Nova versão. Recarregar?" O save fica no localStorage, então recarregar não perde nada. */
export function AvisoAtualizacao({ onRecarregar, onDepois }: { onRecarregar: () => void; onDepois: () => void }) {
  return (
    <div className="aviso-atualizacao painel" role="alert">
      <p>Nova versão. Recarregar?</p>
      <div className="aviso-atualizacao-botoes">
        <button type="button" className="botao botao-secundario botao-pequeno" onClick={onDepois}>
          Depois
        </button>
        <button type="button" className="botao botao-primario botao-pequeno" onClick={onRecarregar}>
          Recarregar
        </button>
      </div>
    </div>
  )
}
