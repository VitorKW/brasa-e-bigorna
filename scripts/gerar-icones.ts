// Gera os ícones do PWA (public/icons/) a partir da arte em art/fatia5.px.js.
// Uso: node scripts/gerar-icones.ts [caminho do pxl]
// Amplia sem suavizar (vizinho mais próximo) e centraliza sobre o fundo carvão quando
// o tamanho final não é múltiplo exato do desenho.
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const pxlDir = process.argv[2] ?? join(homedir(), '.claude', 'skills', 'pxl-pixel-art')
const pxl = await import(pathToFileURL(join(pxlDir, 'src', 'index.ts')).href)

const projeto = pxl.loadProject(resolve('art/fatia5.px.js'))
const FUNDO = 0x1b1618ff

function ampliar(nome: string, tamanho: number) {
  const src = projeto.image(nome)
  const escala = Math.floor(tamanho / Math.max(src.w, src.h))
  const ox = Math.floor((tamanho - src.w * escala) / 2)
  const oy = Math.floor((tamanho - src.h * escala) / 2)
  const data = new Uint32Array(tamanho * tamanho).fill(FUNDO)
  for (let y = 0; y < src.h * escala; y++)
    for (let x = 0; x < src.w * escala; x++)
      data[(oy + y) * tamanho + ox + x] = src.data[Math.floor(y / escala) * src.w + Math.floor(x / escala)]
  return { w: tamanho, h: tamanho, data }
}

const saidas: [string, string, number][] = [
  ['app_icone', 'icon-192.png', 192],
  ['app_icone', 'icon-512.png', 512],
  ['app_icone_maskable', 'icon-maskable-512.png', 512],
  ['app_icone_apple', 'apple-touch-icon.png', 180],
]

mkdirSync('public/icons', { recursive: true })
for (const [nome, arquivo, tamanho] of saidas) {
  const img = ampliar(nome, tamanho)
  writeFileSync(join('public/icons', arquivo), pxl.encodePng(img))
  console.log(`public/icons/${arquivo} (${tamanho}×${tamanho}, a partir de ${nome})`)
}
