import type { Composed, LayerRaster } from '../agi/compose'
import { PIC_H, PIC_W, T } from '../agi/constants'
import { EGA_RGB } from '../agi/palette'
import { getElement } from '../library'
import { elementLayer, newRoom } from '../state/factory'
import type { Room } from '../state/types'
import type { View } from '../sprites/types'
import { layerRaster, renderRoom } from './room'

const cache = new Map<string, string>()

/** Draw a 160x168 buffer region with 2:1 pixels, fitted into a w×h tile. */
function toDataUrl(
  pixel: (x: number, y: number) => number,
  box: { x0: number; y0: number; x1: number; y1: number },
  w: number,
  h: number,
  pad = 4,
): string {
  const bw = box.x1 - box.x0 + 1
  const bh = box.y1 - box.y0 + 1
  const src = document.createElement('canvas')
  src.width = bw
  src.height = bh
  const sctx = src.getContext('2d')!
  const img = sctx.createImageData(bw, bh)
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const v = pixel(box.x0 + x, box.y0 + y)
      if (v === T) continue
      const [r, g, b] = EGA_RGB[v & 15]
      const o = (y * bw + x) * 4
      img.data[o] = r
      img.data[o + 1] = g
      img.data[o + 2] = b
      img.data[o + 3] = 255
    }
  }
  sctx.putImageData(img, 0, 0)
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  const scale = Math.min((w - pad * 2) / (bw * 2), (h - pad * 2) / bh)
  const s = scale >= 1 ? Math.floor(scale) : scale
  const dw = bw * 2 * s
  const dh = bh * s
  ctx.drawImage(src, Math.round((w - dw) / 2), Math.round((h - dh) / 2), Math.round(dw), Math.round(dh))
  return out.toDataURL()
}

const thumbRoom: Room = newRoom()

export function elementThumb(id: string, w: number, h: number, seed = 7): string | null {
  const key = `${id}|${w}x${h}|${seed}`
  const hit = cache.get(key)
  if (hit) return hit
  const def = getElement(id)
  if (!def) return null
  const layer = elementLayer(id, { seed })
  let r: LayerRaster
  try {
    r = layerRaster(layer, thumbRoom, [])
  } catch {
    return null
  }
  const box = def.span === 'full' ? { x0: 0, y0: 0, x1: PIC_W - 1, y1: PIC_H - 1 } : r.bbox
  if (box.x1 < 0) return null
  const url = toDataUrl((x, y) => r.visual[y * PIC_W + x], box, w, h, def.span === 'full' ? 0 : 4)
  cache.set(key, url)
  return url
}

export function roomThumb(room: Room, views: readonly View[], w: number, h: number): string {
  const c: Composed = renderRoom(room, views)
  return toDataUrl((x, y) => c.visual[y * PIC_W + x], { x0: 0, y0: 0, x1: PIC_W - 1, y1: PIC_H - 1 }, w, h, 0)
}
