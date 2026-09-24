import { useApp } from '../../state/store'
import { SidePanel } from '../common/SidePanel'
import { CanvasArea } from './CanvasArea'
import { Inspector } from './Inspector'
import { LibraryPanel } from './LibraryPanel'

export function RoomsWorkspace() {
  const leftOpen = useApp((s) => s.leftOpen)
  const rightOpen = useApp((s) => s.rightOpen)
  const setUi = useApp((s) => s.setUi)
  return (
    <div className="flex min-h-0 flex-1 pt-2">
      <SidePanel side="left" open={leftOpen} onToggle={() => setUi({ leftOpen: !leftOpen })} tip={leftOpen ? 'Hide library' : 'Show library'} tipKey="[">
        <LibraryPanel />
      </SidePanel>
      <CanvasArea />
      <SidePanel side="right" open={rightOpen} onToggle={() => setUi({ rightOpen: !rightOpen })} tip={rightOpen ? 'Hide inspector' : 'Show inspector'} tipKey="]">
        <Inspector />
      </SidePanel>
    </div>
  )
}
