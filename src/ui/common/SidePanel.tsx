import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

const WIDTH = 272

/** Below this window width the side panels float over the workspace instead of pushing it. */
const OVERLAY_BELOW = 1100

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.innerWidth < OVERLAY_BELOW)
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < OVERLAY_BELOW)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return narrow
}

/** A side panel that slides closed; the workspace grows to fill the space. */
export function SidePanel({
  side,
  open,
  onToggle,
  children,
  tip,
  tipKey,
}: {
  side: 'left' | 'right'
  open: boolean
  onToggle: () => void
  children: ReactNode
  tip: string
  tipKey: string
}) {
  const narrow = useNarrow()
  const Icon = side === 'left' ? (open ? PanelLeftClose : PanelLeftOpen) : open ? PanelRightClose : PanelRightOpen
  const handle = (
    <button
      type="button"
      onClick={onToggle}
      data-tip={tip}
      data-tip-key={tipKey}
      aria-label={tip}
      className="absolute top-2 z-10 flex h-7 w-5 items-center justify-center rounded-sm border border-line bg-panel text-muted hover:text-text"
      style={
        narrow
          ? side === 'left'
            ? { left: open ? WIDTH + 12 : 2 }
            : { right: open ? WIDTH + 12 : 2 }
          : side === 'left'
            ? { right: -22 }
            : { left: -22 }
      }
    >
      <Icon size={13} />
    </button>
  )
  return (
    <div
      className="relative h-full shrink-0 transition-[width] duration-200 ease-out"
      style={{ width: open && !narrow ? WIDTH + 8 : 0, zIndex: 20 }}
    >
      <div
        className="absolute top-0 bottom-2 flex flex-col overflow-hidden rounded-md border border-line bg-panel shadow-panel transition-transform duration-200 ease-out"
        style={{
          width: WIDTH,
          [side]: 8,
          transform: open ? 'translateX(0)' : `translateX(${side === 'left' ? -(WIDTH + 16) : WIDTH + 16}px)`,
        }}
      >
        {children}
      </div>
      {handle}
    </div>
  )
}
