import { useEffect, useState } from 'react'
import { loadAutosave, loadUiPrefs, startAutosave, startUiPrefs } from './state/persistence'
import { useApp } from './state/store'
import { TooltipLayer } from './ui/common/Tooltip'
import { TopBar } from './ui/layout/TopBar'
import { useShortcuts } from './ui/layout/shortcuts'
import { RoomsWorkspace } from './ui/rooms/RoomsWorkspace'
import { SpritesWorkspace } from './ui/sprites/SpritesWorkspace'
import { WalkWorkspace } from './ui/walk/WalkWorkspace'
import { ExportModal } from './ui/layout/ExportModal'

export default function App() {
  const mode = useApp((s) => s.mode)
  const modal = useApp((s) => s.modal)
  const [ready, setReady] = useState(false)
  useShortcuts()
  useEffect(() => {
    loadUiPrefs()
    const stopPrefs = startUiPrefs()
    let stopSave = () => {}
    loadAutosave().finally(() => {
      stopSave = startAutosave()
      setReady(true)
    })
    return () => {
      stopPrefs()
      stopSave()
    }
  }, [])
  if (!ready) return <div className="h-full bg-bg" />
  return (
    <div className="flex h-full flex-col">
      <TopBar />
      {mode === 'rooms' && <RoomsWorkspace />}
      {mode === 'sprites' && <SpritesWorkspace />}
      {mode === 'walk' && <WalkWorkspace />}
      {modal === 'export' && <ExportModal />}
      <TooltipLayer />
    </div>
  )
}
