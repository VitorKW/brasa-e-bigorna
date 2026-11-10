// Monta o service worker final a partir do modelo (pwa/sw.modelo.js). Função pura: o plugin de build
// lê os arquivos e calcula a versão; aqui só se troca o texto e se valida a lista.

export const MARCADOR_VERSAO = '__VERSAO__'
export const MARCADOR_ARQUIVOS = '__ARQUIVOS__'

/** Caminhos que nunca entram no cache de instalação. */
const IGNORADOS = /(^|\/)(sw\.js|\.DS_Store|\.gitkeep|Thumbs\.db)$|\.map$/

/**
 * Lista final de arquivos para o pré-cache: caminhos relativos à raiz do app, sem barra inicial, sem
 * repetidos, ordenados (a ordem estável deixa o build reproduzível) e com "index.html" sempre presente.
 */
export function listaDePrecache(arquivos: readonly string[]): string[] {
  const limpos = arquivos
    .map((a) => a.replace(/\\/g, '/').replace(/^\.?\//, ''))
    .filter((a) => a !== '' && !IGNORADOS.test(a))
  const unicos = [...new Set([...limpos, 'index.html'])]
  return unicos.sort()
}

export function montarSw(modelo: string, arquivos: readonly string[], versao: string): string {
  if (!modelo.includes(MARCADOR_VERSAO) || !modelo.includes(MARCADOR_ARQUIVOS)) {
    throw new Error('O modelo do service worker perdeu um dos marcadores.')
  }
  if (!/^[a-z0-9._-]+$/i.test(versao)) throw new Error(`Versão inválida para cache: ${versao}`)
  return modelo
    .replace(`'${MARCADOR_VERSAO}'`, () => JSON.stringify(versao))
    .replace(MARCADOR_ARQUIVOS, () => JSON.stringify(listaDePrecache(arquivos), null, 2))
}
