// Plugin do Vite: depois do build, grava dist/sw.js com a lista de arquivos e uma versão que muda
// sempre que algum arquivo muda. Sem dependência extra (nada de workbox): o service worker é curto
// e o README explica a escolha.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { Plugin } from 'vite'
import { montarSw } from '../src/pwa/montarSw.ts'

function listar(pasta: string): string[] {
  return readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome)
    return statSync(caminho).isDirectory() ? listar(caminho) : [caminho]
  })
}

export function pwaPlugin(): Plugin {
  let saida = 'dist'
  let raiz = process.cwd()
  return {
    name: 'brasa-pwa',
    apply: 'build',
    configResolved(config) {
      saida = config.build.outDir
      raiz = config.root
    },
    closeBundle() {
      const pasta = join(raiz, saida)
      const modelo = readFileSync(join(raiz, 'pwa', 'sw.modelo.js'), 'utf8')
      const arquivos = listar(pasta)
        .map((a) => relative(pasta, a).split('\\').join('/'))
        .filter((a) => a !== 'sw.js')
        .sort()
      // A versão é o hash do CONTEÚDO de tudo: um sprite redesenhado com o mesmo nome também invalida o cache.
      const hash = createHash('sha256')
      for (const a of arquivos) hash.update(a).update(readFileSync(join(pasta, a)))
      const versao = hash.digest('hex').slice(0, 12)
      writeFileSync(join(pasta, 'sw.js'), montarSw(modelo, arquivos, versao))
    },
  }
}
