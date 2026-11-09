import { AnimatePresence } from 'motion/react'
import { BatidaModal } from './components/BatidaModal.tsx'
import { ForgeScreen } from './components/ForgeScreen.tsx'
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

  return (
    <div className="app">
      <ResourceBar />
      <main className="conteudo">
        <ForgeScreen />
      </main>
      <SellPanel />
      <TabBar />
      <BatidaModal />
      <AnimatePresence>
        {resumo && <OfflineModal resumo={resumo} onFechar={fecharResumo} />}
      </AnimatePresence>
    </div>
  )
}
