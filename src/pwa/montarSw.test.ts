import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MARCADOR_ARQUIVOS, MARCADOR_VERSAO, listaDePrecache, montarSw } from './montarSw.ts'

const modelo = readFileSync(new URL('../../pwa/sw.modelo.js', import.meta.url), 'utf8')
const manifesto = JSON.parse(readFileSync(new URL('../../public/manifest.webmanifest', import.meta.url), 'utf8')) as {
  name: string
  short_name: string
  display: string
  orientation: string
  theme_color: string
  background_color: string
  start_url: string
  icons: { src: string; sizes: string; purpose: string }[]
}

describe('lista de pré-cache', () => {
  it('normaliza caminhos, tira repetidos, o próprio sw.js e mapas, ordena e sempre inclui o index', () => {
    const lista = listaDePrecache(['./assets/app-1.js', 'assets\\app-1.css', '/sprites/mina.png', 'sw.js', 'assets/app-1.js.map', 'assets/app-1.js', 'sprites/.gitkeep', ''])
    expect(lista).toEqual(['assets/app-1.css', 'assets/app-1.js', 'index.html', 'sprites/mina.png'])
  })
})

describe('montarSw', () => {
  it('o modelo tem os dois marcadores e os eventos essenciais', () => {
    expect(modelo).toContain(`'${MARCADOR_VERSAO}'`)
    expect(modelo).toContain(MARCADOR_ARQUIVOS)
    for (const evento of ['install', 'activate', 'fetch', 'message']) expect(modelo).toContain(`'${evento}'`)
    expect(modelo).toContain('PULAR_ESPERA')
  })

  it('busca no cache ignorando Vary (o script module vem com Origin; sem isso, offline abre em branco)', () => {
    const buscas = modelo.split('\n').filter((linha) => linha.includes('caches.match('))
    expect(buscas.length).toBeGreaterThan(0)
    for (const b of buscas) expect(b).toContain('ignoreVary: true')
  })

  it('troca versão e lista, e o resultado é JavaScript válido sem marcadores sobrando', () => {
    const sw = montarSw(modelo, ['index.html', 'assets/a.js', 'sprites/x.png'], 'abc123def456')
    expect(sw).not.toContain(MARCADOR_VERSAO)
    expect(sw).not.toContain(MARCADOR_ARQUIVOS)
    expect(sw).toContain('"abc123def456"')
    expect(sw).toContain('"sprites/x.png"')
    // sintaxe: new Function compila sem executar
    expect(() => new Function(sw)).not.toThrow()
  })

  it('versões diferentes geram caches com nomes diferentes (é o que dispara a atualização)', () => {
    const a = montarSw(modelo, ['index.html'], 'aaaaaaaaaaaa')
    const b = montarSw(modelo, ['index.html'], 'bbbbbbbbbbbb')
    expect(a).not.toBe(b)
  })

  it('rejeita modelo sem marcador e versão com caracteres estranhos', () => {
    expect(() => montarSw('sem marcadores', [], 'v1')).toThrow()
    expect(() => montarSw(modelo, [], "x'; alert(1)//")).toThrow()
  })

  it('o cache de instalação não é o mesmo das fontes (fonte não some a cada versão)', () => {
    expect(modelo).toContain("'brasa-app-' + VERSAO")
    expect(modelo).toContain("'brasa-fontes'")
  })
})

describe('manifesto do PWA', () => {
  it('tem nome, modo standalone, retrato, cores da paleta e start_url relativa', () => {
    expect(manifesto.name).toBe('Brasa & Bigorna')
    expect(manifesto.short_name.length).toBeGreaterThan(0)
    expect(manifesto.display).toBe('standalone')
    expect(manifesto.orientation).toBe('portrait')
    expect(manifesto.theme_color).toBe('#1b1618')
    expect(manifesto.background_color).toBe('#1b1618')
    expect(manifesto.start_url.startsWith('/')).toBe(false)
  })

  it('declara os ícones 192, 512 e maskable 512 nos caminhos combinados', () => {
    const porArquivo = Object.fromEntries(manifesto.icons.map((i) => [i.src, i]))
    expect(porArquivo['icons/icon-192.png']).toMatchObject({ sizes: '192x192', purpose: 'any' })
    expect(porArquivo['icons/icon-512.png']).toMatchObject({ sizes: '512x512', purpose: 'any' })
    expect(porArquivo['icons/icon-maskable-512.png']).toMatchObject({ sizes: '512x512', purpose: 'maskable' })
  })

  it('o index.html aponta para o manifesto, o tema e o ícone da Apple', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('name="theme-color"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('icons/apple-touch-icon.png')
  })
})
