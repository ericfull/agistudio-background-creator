import { useEffect, useRef, useState } from 'react'
import { EGA_HEX } from '../../agi/palette'
import { resolveCel } from '../../sprites/render'
import type { View } from '../../sprites/types'

/** Draws one cel with 2:1 wide pixels, fitted into a box. */
export function CelView({ view, loop, cel, box, className }: { view: View; loop: number; cel: number; box: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current
    const r = resolveCel(view, loop, cel)
    if (!cv || !r) return
    const s = Math.max(1, Math.floor(Math.min(box / (r.w * 2), box / r.h)))
    cv.width = r.w * 2 * s
    cv.height = r.h * s
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, cv.width, cv.height)
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        const v = r.px[y * r.w + x]
        if (v === 255) continue
        ctx.fillStyle = EGA_HEX[v]
        ctx.fillRect(x * 2 * s, y * s, 2 * s, s)
      }
    }
  }, [view, loop, cel, box])
  return <canvas ref={ref} className={`pixel ${className ?? ''}`} />
}

/** Plays a loop at the view's frame rate. */
export function LoopPreview({ view, loop, box, playing = true }: { view: View; loop: number; box: number; playing?: boolean }) {
  const [frame, setFrame] = useState(0)
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setFrame((f) => f + 1), 1000 / Math.max(1, view.fps))
    return () => clearInterval(id)
  }, [playing, view.fps])
  return <CelView view={view} loop={loop} cel={frame} box={box} />
}
