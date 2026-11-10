import { AnimatePresence } from 'motion/react'
import { BatidaModal } from './components/BatidaModal.tsx'
import { CombateReplay } from './components/CombateReplay.tsx'
import { ForgeScreen } from './components/ForgeScreen.tsx'
import { GuildaScreen } from './components/GuildaScreen.tsx'
import { MapaScreen } from './components/MapaScreen.tsx'
import { OfflineModal } from './components/OfflineModal.tsx'
import { ResourceBar } from './components/ResourceBar.tsx'
import { SellPanel } from './components/SellPanel.tsx'
import { TabBar } from './components/TabBar.tsx'
import { useGame } from './store.ts'
import { useGameLoop } from './useGameLoop.ts'

export default function App() {
  useGameLoop()
  const resumo = useGame((s) => s.resumoOffline)
  const fecharResumo = useGame((s) => s.fecharResumo)
  const aba = useGame((s) => s.aba)
  const combate = useGame((s) => s.combate)

  return (
    <div className="app">
      <ResourceBar />
      <main className="conteudo">
        {aba === 'forja' && <ForgeScreen />}
        {aba === 'guilda' && <GuildaScreen />}
        {aba === 'mapa' && <MapaScreen />}
      </main>
      {aba === 'forja' && <SellPanel />}
      <TabBar />
      <BatidaModal />
      {combate && <CombateReplay key={combate.id} combate={combate} />}
      <AnimatePresence>
        {resumo && <OfflineModal resumo={resumo} onFechar={fecharResumo} />}
      </AnimatePresence>
    </div>
  )
}
