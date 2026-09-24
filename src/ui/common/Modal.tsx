import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { IconButton } from './IconButton'

export function Modal({ title, onClose, children, width = 420 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex max-h-full w-full flex-col rounded-md border border-line bg-panel shadow-modal" style={{ maxWidth: width }}>
        <div className="flex h-10 shrink-0 items-center border-b border-line pr-2 pl-3">
          <h2 className="flex-1 text-[13px] font-semibold">{title}</h2>
          <IconButton icon={X} tip="Close" tipKey="Esc" onClick={onClose} />
        </div>
        <div className="min-h-0 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  )
}
