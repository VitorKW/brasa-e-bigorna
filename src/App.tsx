import { useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { AvisoAtualizacao } from './components/AvisoAtualizacao.tsx'
import { BatidaModal } from './components/BatidaModal.tsx'
import { CombateReplay } from './components/CombateReplay.tsx'
import { ForgeScreen } from './components/ForgeScreen.tsx'
import { GuildaScreen } from './components/GuildaScreen.tsx'
import { MapaScreen } from './components/MapaScreen.tsx'
import { MoedasVoando, RevelacaoItem } from './components/Efeitos.tsx'
import { ObjetivoBanner } from './components/ObjetivoBanner.tsx'
import { ReforjarScreen } from './components/ReforjarScreen.tsx'
import { OfflineModal } from './components/OfflineModal.tsx'
import { ResourceBar } from './components/ResourceBar.tsx'
import { SellPanel } from './components/SellPanel.tsx'
import { TabBar } from './components/TabBar.tsx'
import { ToastConquista } from './components/ToastConquista.tsx'
import { VilarejoScreen } from './components/VilarejoScreen.tsx'
import { useGame } from './store.ts'
import { useGameLoop } from './useGameLoop.ts'
import { registrarServiceWorker } from './pwa.ts'

export default function App() {
  useGameLoop()
  // Versão nova do app: aplicar troca o service worker e recarrega (o save fica no localStorage).
  const [atualizar, setAtualizar] = useState<(() => void) | null>(null)
  useEffect(() => {
    registrarServiceWorker({
      aoHaverAtualizacao: (aplicar) => setAtualizar(() => aplicar),
      antesDeRecarregar: () => useGame.getState().salvar(),
    })
  }, [])
  const resumo = useGame((s) => s.resumoOffline)
  const fecharResumo = useGame((s) => s.fecharResumo)
  const aba = useGame((s) => s.aba)
  const combate = useGame((s) => s.combate)
  const subForja = useGame((s) => s.subForja)

  return (
    <div className="app">
      <ResourceBar />
      <ObjetivoBanner />
      {atualizar && <AvisoAtualizacao onRecarregar={atualizar} onDepois={() => setAtualizar(null)} />}
      <main className="conteudo">
        {aba === 'forja' && <ForgeScreen />}
        {aba === 'guilda' && <GuildaScreen />}
        {aba === 'mapa' && <MapaScreen />}
        {aba === 'vilarejo' && <VilarejoScreen />}
        {aba === 'reforjar' && <ReforjarScreen />}
      </main>
      {aba === 'forja' && subForja === 'producao' && <SellPanel />}
      <TabBar />
      <ToastConquista />
      <MoedasVoando />
      <RevelacaoItem />
      <BatidaModal />
      {combate && <CombateReplay key={combate.id} combate={combate} />}
      <AnimatePresence>
        {resumo && <OfflineModal resumo={resumo} onFechar={fecharResumo} />}
      </AnimatePresence>
    </div>
  )
}
