import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Se um componente quebrar ao desenhar, o React desmonta tudo e a tela fica em branco. Aqui o jogador
 * vê o que houve e um botão para recarregar. O save não é tocado: ele mora no localStorage e é gravado
 * pela store, não pela árvore de componentes.
 */
export class TelaDeErro extends Component<{ children: ReactNode }, { erro: Error | null }> {
  state: { erro: Error | null } = { erro: null }

  static getDerivedStateFromError(erro: Error) {
    return { erro }
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('Erro ao desenhar o jogo:', erro, info.componentStack)
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="tela-erro" role="alert">
        <h1>A forja engasgou</h1>
        <p>Algo quebrou ao desenhar a tela. Seu progresso está salvo.</p>
        <button type="button" className="botao botao-primario" onClick={() => window.location.reload()}>
          Recarregar
        </button>
        <pre className="tela-erro-detalhe">{this.state.erro.message}</pre>
      </div>
    )
  }
}
