import { useEffect, useState } from 'react'

type Tip = { text: string; key?: string; x: number; y: number; below: boolean }

/**
 * One tooltip for the whole app. Any element with `data-tip` (and optional
 * `data-tip-key` for a shortcut) shows it on hover.
 */
export function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: HTMLElement | null = null
    const hide = () => {
      clearTimeout(timer)
      current = null
      setTip(null)
    }
    const over = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-tip]") ?? null
      if (el === current) return
      clearTimeout(timer)
      current = el
      setTip(null)
      if (!el) return
      timer = setTimeout(() => {
        if (!el.isConnected) return
        const r = el.getBoundingClientRect()
        const below = r.bottom + 40 < window.innerHeight
        setTip({
          text: el.dataset.tip ?? '',
          key: el.dataset.tipKey,
          x: Math.min(window.innerWidth - 8, Math.max(8, r.left + r.width / 2)),
          y: below ? r.bottom + 6 : r.top - 6,
          below,
        })
      }, 380)
    }
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerdown', hide, true)
    document.addEventListener('keydown', hide, true)
    window.addEventListener('blur', hide)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerdown', hide, true)
      document.removeEventListener('keydown', hide, true)
      window.removeEventListener('blur', hide)
    }
  }, [])

  if (!tip || !tip.text) return null
  return (
    <div
      className="pointer-events-none fixed z-[100] max-w-64 rounded border border-line bg-panel px-2 py-1 text-[11px] leading-snug text-text shadow-panel"
      style={{
        left: tip.x,
        top: tip.y,
        transform: `translate(-50%, ${tip.below ? '0' : '-100%'})`,
      }}
    >
      {tip.text}
      {tip.key && <span className="ml-2 text-muted">{tip.key}</span>}
    </div>
  )
}
