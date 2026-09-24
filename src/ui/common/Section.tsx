import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState, type ReactNode } from 'react'

function loadOpen(id: string, dflt: boolean): boolean {
  try {
    const v = localStorage.getItem(`section:${id}`)
    return v === null ? dflt : v === '1'
  } catch {
    return dflt
  }
}

/** Collapsible panel section. Open state is remembered per browser. */
export function Section({
  id,
  title,
  children,
  actions,
  defaultOpen = true,
  grow,
}: {
  id: string
  title: string
  children: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
  grow?: boolean
}) {
  const [open, setOpen] = useState(() => loadOpen(id, defaultOpen))
  const toggle = () => {
    setOpen(!open)
    try {
      localStorage.setItem(`section:${id}`, open ? '0' : '1')
    } catch {
      /* ignore */
    }
  }
  return (
    <section className={`flex flex-col border-b border-line ${grow && open ? 'min-h-0 flex-1' : ''}`}>
      <div className="flex h-8 shrink-0 items-center gap-1 pr-1 pl-2">
        <button type="button" onClick={toggle} className="flex flex-1 items-center gap-1 text-left text-[11px] font-semibold tracking-wide text-muted uppercase hover:text-text">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          {title}
        </button>
        {open && actions}
      </div>
      {open && <div className={`px-2 pb-2 ${grow ? 'min-h-0 flex-1 overflow-y-auto' : ''}`}>{children}</div>}
    </section>
  )
}
