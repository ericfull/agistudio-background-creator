import { EGA_RGB } from '../agi/palette'
import { loopCels, resolveCel } from '../sprites/render'
import type { View } from '../sprites/types'

export interface SheetFrame {
  loop: number
  cel: number
  x: number
  y: number
  w: number
  h: number
}

export interface SheetLayout {
  width: number
  height: number
  frames: SheetFrame[]
  json: object
}

/**
 * Lay out a view as a sprite sheet: one row per loop, one column per cel.
 * `xScale`/`yScale` let the sheet use wide (2:1) pixels. The JSON follows
 * the Aseprite / TexturePacker "hash" format with a frame tag per loop.
 */
export function sheetLayout(view: View, xScale: number, yScale: number, imageName: string): SheetLayout {
  const rows = view.loops.map((_, li) => loopCels(view, li).cels)
  const cellW = Math.max(1, ...rows.flat().map((c) => c.w)) * xScale
  const cellH = Math.max(1, ...rows.flat().map((c) => c.h)) * yScale
  const cols = Math.max(1, ...rows.map((r) => r.length))
  const frames: SheetFrame[] = []
  const hash: Record<string, object> = {}
  const tags: object[] = []
  let index = 0
  rows.forEach((cels, li) => {
    const from = index
    cels.forEach((c, ci) => {
      const w = c.w * xScale
      const h = c.h * yScale
      // bottom-align cels in their cell so feet line up
      const f = { loop: li, cel: ci, x: ci * cellW, y: li * cellH + (cellH - h), w, h }
      frames.push(f)
      hash[String(index)] = {
        frame: { x: f.x, y: f.y, w, h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w, h },
        sourceSize: { w, h },
        duration: Math.round(1000 / Math.max(1, view.fps)),
        filename: `${view.name} ${view.loops[li].name} ${ci}`,
      }
      index++
    })
    if (cels.length) tags.push({ name: view.loops[li].name, from, to: index - 1, direction: 'forward' })
  })
  const width = cols * cellW
  const height = rows.length * cellH
  return {
    width,
    height,
    frames,
    json: {
      frames: hash,
      meta: {
        app: 'AGIStudio Background Creator',
        version: '1',
        image: imageName,
        format: 'RGBA8888',
        size: { w: width, h: height },
        scale: '1',
        pixelAspect: xScale / yScale,
        frameTags: tags,
      },
    },
  }
}

export function sheetRgba(view: View, layout: SheetLayout, xScale: number, yScale: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(layout.width * layout.height * 4)
  for (const f of layout.frames) {
    const cel = resolveCel(view, f.loop, f.cel)
    if (!cel) continue
    for (let y = 0; y < f.h; y++) {
      for (let x = 0; x < f.w; x++) {
        const v = cel.px[Math.floor(y / yScale) * cel.w + Math.floor(x / xScale)]
        if (v === 255) continue
        const [r, g, b] = EGA_RGB[v]
        const k = ((f.y + y) * layout.width + f.x + x) * 4
        rgba[k] = r
        rgba[k + 1] = g
        rgba[k + 2] = b
        rgba[k + 3] = 255
      }
    }
  }
  return rgba
}
