import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { EGA_HEX, EGA_NAMES } from '../../agi/palette'

export function Swatch({ color, size = 18, tip, onClick, selected }: { color: number; size?: number; tip?: string; onClick?: () => void; selected?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tip={tip ?? `${color} ${EGA_NAMES[color]}`}
      aria-label={tip ?? EGA_NAMES[color]}
      className={`shrink-0 rounded-sm border ${selected ? 'border-accent outline outline-1 outline-accent' : 'border-line'}`}
      style={{ width: size, height: size, background: EGA_HEX[color] }}
    />
  )
}

export function EgaGrid({ value, onPick, size = 18 }: { value?: number; onPick: (c: number) => void; size?: number }) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {EGA_HEX.map((_, i) => (
        <Swatch key={i} color={i} size={size} selected={value === i} onClick={() => onPick(i)} />
      ))}
    </div>
  )
}

/** A swatch that opens the 16-color EGA picker (floating, kept inside the window). */
export function EgaPicker({ value, onChange, tip }: { value: number; onChange: (c: number) => void; tip?: string }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const anchor = useRef<HTMLDivElement>(null)
  const pop = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!pos) return
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (!pop.current?.contains(t) && !anchor.current?.contains(t)) setPos(null)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null)
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    window.addEventListener('resize', () => setPos(null), { once: true })
    return () => {
      document.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [pos])
  const open = () => {
    if (pos) return setPos(null)
    const r = anchor.current!.getBoundingClientRect()
    const W = 196
    const H = 64
    const left = Math.max(8, Math.min(window.innerWidth - W - 8, r.right - W))
    const top = r.bottom + 4 + H > window.innerHeight ? r.top - H - 4 : r.bottom + 4
    setPos({ left, top })
  }
  return (
    <div ref={anchor}>
      <Swatch color={value} tip={tip ? `${tip}: ${EGA_NAMES[value]}` : undefined} onClick={open} />
      {pos &&
        createPortal(
          <div ref={pop} className="fixed z-[60] rounded border border-line bg-panel p-2 shadow-modal" style={pos}>
            <EgaGrid
              value={value}
              onPick={(c) => {
                onChange(c)
                setPos(null)
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  )
}
