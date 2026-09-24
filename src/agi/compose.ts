import type { PriorityMode } from '../state/types'
import { PIC_SIZE, PIC_W, PRI_BASELINE, PRI_ROWS, T } from './constants'
import { IDENTITY_MAP } from './palette'
import { bandTable } from './priority'
import type { BBox } from './raster'

export interface LayerRaster {
  visual: Uint8Array
  priority: Uint8Array
  bbox: BBox
}

export interface ComposeLayer {
  raster: LayerRaster
  /** Depth for visual pixels that carry no explicit priority. */
  defaultPriority: PriorityMode
  /** Row the layer stands on, for 'baseline' priority. */
  anchorY: number
  controlOn: boolean
  moodExempt: boolean
}

export interface ComposeOptions {
  priorityBase: number
  mood?: readonly number[]
  colorSwap?: readonly number[]
}

export interface Composed {
  visual: Uint8Array
  priority: Uint8Array
}

function chain(a: readonly number[], b: readonly number[]): number[] {
  return Array.from({ length: 16 }, (_, i) => b[a[i]])
}

/**
 * Builds the room's visual and priority screens from layer buffers.
 * Pass 1 paints visuals and depth bottom-to-top; pass 2 stamps every layer's
 * control pixels (0–3) on top so walls and triggers are never hidden.
 */
export function compose(layers: readonly ComposeLayer[], opts: ComposeOptions): Composed {
  const bands = bandTable(opts.priorityBase)
  const swap = opts.colorSwap ?? IDENTITY_MAP
  const moodMap = chain(swap, opts.mood ?? IDENTITY_MAP)
  const visual = new Uint8Array(PIC_SIZE).fill(moodMap[15])
  const priority = new Uint8Array(PIC_SIZE).fill(4)

  for (const L of layers) {
    const { visual: lv, priority: lp, bbox } = L.raster
    if (bbox.x1 < 0) continue
    const map = L.moodExempt ? swap : moodMap
    const anchorBand = bands[Math.max(0, Math.min(bands.length - 1, Math.round(L.anchorY)))]
    const dp = L.defaultPriority
    for (let y = bbox.y0; y <= bbox.y1; y++) {
      const rowBand = bands[y]
      for (let x = bbox.x0; x <= bbox.x1; x++) {
        const i = y * PIC_W + x
        const v = lv[i]
        const p = lp[i]
        if (v !== T) visual[i] = map[v]
        if (p !== T && p >= 4) {
          priority[i] = p === PRI_ROWS ? rowBand : p === PRI_BASELINE ? anchorBand : p
        } else if (v !== T && dp !== 'none') {
          priority[i] = dp === 'rows' ? rowBand : dp === 'baseline' ? anchorBand : dp
        }
      }
    }
  }

  for (const L of layers) {
    if (!L.controlOn) continue
    const { priority: lp, bbox } = L.raster
    if (bbox.x1 < 0) continue
    for (let y = bbox.y0; y <= bbox.y1; y++) {
      for (let x = bbox.x0; x <= bbox.x1; x++) {
        const i = y * PIC_W + x
        const p = lp[i]
        if (p < 4) priority[i] = p
      }
    }
  }

  return { visual, priority }
}
