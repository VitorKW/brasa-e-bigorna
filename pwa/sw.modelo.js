/* Service worker de Brasa & Bigorna.
 *
 * Este arquivo é um MODELO: o plugin de build (scripts/pwa-plugin.ts) troca os dois marcadores abaixo
 * pela versão do build e pela lista de tudo que o app precisa para abrir offline (index, JS, CSS,
 * sprites, ícones, manifesto), e grava o resultado em dist/sw.js.
 *
 * Estratégia:
 * - Instalação: baixa o app inteiro para um cache com o nome da versão. Não assume o controle sozinho:
 *   o app mostra "Nova versão. Recarregar?" e só então manda PULAR_ESPERA (o save fica no localStorage,
 *   que a atualização não toca).
 * - Navegação e arquivos do app: cache primeiro (abre offline na hora); se algo faltar, vai à rede.
 * - Fontes do Google: cache com revalidação em segundo plano; sem rede, o jogo cai para a fonte do sistema.
 * - Qualquer outra origem ou método que não seja GET passa direto.
 */
const VERSAO = '__VERSAO__'
const ARQUIVOS = __ARQUIVOS__
const CACHE_APP = 'brasa-app-' + VERSAO
const CACHE_FONTES = 'brasa-fontes'

const base = new URL('./', self.location.href)
const urlDe = (caminho) => new URL(caminho, base).href

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE_APP).then((cache) => cache.addAll(ARQUIVOS.map(urlDe))))
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) =>
        Promise.all(
          nomes.filter((n) => n.startsWith('brasa-app-') && n !== CACHE_APP).map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (evento) => {
  if (evento.data === 'PULAR_ESPERA') self.skipWaiting()
})

const ehFonte = (url) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request
  if (pedido.method !== 'GET') return
  const url = new URL(pedido.url)

  if (ehFonte(url)) {
    evento.respondWith(
      caches.open(CACHE_FONTES).then((cache) =>
        cache.match(pedido).then((guardado) => {
          const rede = fetch(pedido)
            .then((resposta) => {
              if (resposta.ok || resposta.type === 'opaque') cache.put(pedido, resposta.clone())
              return resposta
            })
            .catch(() => guardado)
          return guardado || rede
        }),
      ),
    )
    return
  }

  if (url.origin !== self.location.origin) return

  // Navegação (abrir o app, recarregar): serve o index do cache; o jogo tem uma tela só.
  if (pedido.mode === 'navigate') {
    evento.respondWith(caches.match(urlDe('index.html'), { ignoreVary: true }).then((resposta) => resposta || fetch(pedido)))
    return
  }

  // ignoreVary: o servidor pode mandar "Vary: Origin", e o script do jogo (type=module) é pedido com
  // cabeçalho Origin, ao contrário do que a instalação baixou. Sem isso, offline o JS não sai do cache.
  evento.respondWith(
    caches.match(pedido, { ignoreVary: true }).then(
      (resposta) =>
        resposta ||
        fetch(pedido).then((nova) => {
          // Arquivo do app que não estava na lista (raro): guarda para a próxima vez.
          if (nova.ok) {
            const copia = nova.clone()
            caches.open(CACHE_APP).then((cache) => cache.put(pedido, copia))
          }
          return nova
        }),
    ),
  )
})
