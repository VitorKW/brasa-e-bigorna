// Registro do service worker e aviso de versão nova. Só roda no build de produção: em desenvolvimento
// um service worker cacheando atrapalharia o hot reload.

export interface OpcoesPwa {
  /** Há versão nova pronta. Chame `aplicar` quando o jogador aceitar. */
  aoHaverAtualizacao: (aplicar: () => void) => void
  /** Última chance de gravar o save antes da página recarregar. */
  antesDeRecarregar: () => void
}

export function registrarServiceWorker({ aoHaverAtualizacao, antesDeRecarregar }: OpcoesPwa): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

  // O primeiro controllerchange (instalação inicial, clients.claim) NÃO deve recarregar a página:
  // só recarrega quando o jogador pediu a atualização.
  let pediuAtualizacao = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!pediuAtualizacao) return
    antesDeRecarregar()
    window.location.reload()
  })

  const registrar = () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .then((registro) => {
        const avisar = (worker: ServiceWorker) =>
          aoHaverAtualizacao(() => {
            pediuAtualizacao = true
            worker.postMessage('PULAR_ESPERA')
          })

        // Versão nova que já terminou de instalar numa visita anterior.
        if (registro.waiting && navigator.serviceWorker.controller) avisar(registro.waiting)

        registro.addEventListener('updatefound', () => {
          const novo = registro.installing
          novo?.addEventListener('statechange', () => {
            // "installed" com um controlador ativo = é atualização (não a primeira instalação).
            if (novo.state === 'installed' && navigator.serviceWorker.controller) avisar(novo)
          })
        })

        // Quem deixa o app aberto dias a fio também recebe o aviso: confere ao voltar para a aba.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void registro.update().catch(() => undefined)
        })
      })
      .catch(() => undefined) // sem service worker o jogo continua funcionando online
  }

  // Chamado de um useEffect: o "load" pode já ter acontecido, e aí o listener nunca dispararia.
  if (document.readyState === 'complete') registrar()
  else window.addEventListener('load', registrar, { once: true })
}
