import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FUNDOS_PAINEL, contraste } from './qualidade.ts'

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8')

/** Valor de uma variável CSS declarada em :root. */
const variavel = (nome: string): string => {
  const m = css.match(new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6})`))
  if (!m) throw new Error(`variável --${nome} não encontrada`)
  return m[1]!
}

describe('contraste (WCAG AA, 4,5:1) das cores de texto da paleta', () => {
  const textos = ['texto', 'texto-suave', 'amarelo', 'laranja']
  for (const nome of textos) {
    it(`--${nome} sobre carvão, aço escuro e o painel`, () => {
      for (const fundo of [...FUNDOS_PAINEL, variavel('aco-escuro')]) {
        expect(contraste(variavel(nome), fundo), `${nome} sobre ${fundo}`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  it('botões: texto escuro sobre laranja (primário), claro sobre aço (secundário) e sobre o desligado', () => {
    expect(contraste(variavel('carvao'), variavel('laranja'))).toBeGreaterThanOrEqual(4.5)
    expect(contraste(variavel('texto'), variavel('aco'))).toBeGreaterThanOrEqual(4.5)
    expect(contraste(variavel('texto-suave'), variavel('aco-desligado'))).toBeGreaterThanOrEqual(4.5)
  })

  it('o dica (fundo #34303a, borda laranja) e a faixa de conquista (carvão) mantêm o texto legível', () => {
    expect(contraste(variavel('texto'), '#34303a')).toBeGreaterThanOrEqual(4.5)
    expect(contraste(variavel('texto-suave'), variavel('carvao'))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('regras de acessibilidade do CSS', () => {
  it('foco visível para teclado e alvos de toque de 48 px', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px/)
    expect(css).toMatch(/--alvo-toque:\s*48px/)
    expect(css).toMatch(/\.botao-pequeno\s*\{[^}]*min-height:\s*48px/)
    expect(css).toMatch(/\.botao\s*\{[^}]*min-height:\s*var\(--alvo-toque\)/)
  })

  it('respeita prefers-reduced-motion e não usa caixa alta', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).not.toMatch(/text-transform:\s*uppercase/)
  })

  it('sem rolagem horizontal: o corpo e o conteúdo escondem o overflow-x', () => {
    expect(css).toMatch(/\.conteudo\s*\{[^}]*overflow-y:\s*auto/)
    expect(css).not.toMatch(/overflow-x:\s*scroll/)
  })
})
