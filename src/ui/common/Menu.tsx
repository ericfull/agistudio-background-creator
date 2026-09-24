import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  icon?: LucideIcon
  shortcut?: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

/** Icon button that opens a dropdown list. */
export function MenuButton({ icon: Icon, tip, items, align = 'left' }: { icon: LucideIcon; tip: string; items: (MenuItem | 'sep')[]; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        data-tip={open ? undefined : tip}
        aria-label={tip}
        onClick={() => setOpen(!open)}
        className={`inline-flex h-7 min-w-7 items-center justify-center rounded px-1 ${open ? 'bg-line text-text' : 'text-muted hover:bg-line hover:text-text'}`}
      >
        <Icon size={16} />
      </button>
      {open && (
        <div className={`absolute top-8 z-40 min-w-48 rounded border border-line bg-panel py-1 shadow-modal ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {items.map((it, i) =>
            it === 'sep' ? (
              <div key={i} className="my-1 border-t border-line" />
            ) : (
              <button
                key={i}
                type="button"
                disabled={it.disabled}
                onClick={() => {
                  setOpen(false)
                  it.onClick()
                }}
                className={`flex h-7 w-full items-center gap-2 px-3 text-left text-[12px] hover:bg-line disabled:opacity-35 ${it.danger ? 'text-danger' : 'text-text'}`}
              >
                {it.icon && <it.icon size={14} className="text-muted" />}
                <span className="flex-1">{it.label}</span>
                {it.shortcut && <span className="text-[11px] text-muted">{it.shortcut}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}
