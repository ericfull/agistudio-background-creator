import type { Cel, View } from './types'
import { ROLE_SLOT_BASE, SPRITE_T } from './types'

export interface ResolvedCel {
  w: number
  h: number
  /** 0–15 or 255 for transparent */
  px: Uint8Array
}

export function roleColor(view: View, slot: number): number {
  const role = view.roles[slot]
  if (!role) return 0
  return view.colorMap[role.key] ?? role.color
}

export function resolvePixel(view: View, v: number): number {
  if (v === SPRITE_T) return SPRITE_T
  if (v >= ROLE_SLOT_BASE) return roleColor(view, v - ROLE_SLOT_BASE)
  return v & 0x0f
}

/** The cels actually drawn for a loop (follows mirrored loops). */
export function loopCels(view: View, loopIdx: number): { cels: Cel[]; mirror: boolean } {
  const loop = view.loops[loopIdx]
  if (!loop) return { cels: [], mirror: false }
  if (loop.mirrorOf !== undefined && view.loops[loop.mirrorOf]) {
    return { cels: view.loops[loop.mirrorOf].cels, mirror: true }
  }
  return { cels: loop.cels, mirror: false }
}

export function resolveCel(view: View, loopIdx: number, celIdx: number): ResolvedCel | null {
  const { cels, mirror } = loopCels(view, loopIdx)
  if (!cels.length) return null
  const cel = cels[((celIdx % cels.length) + cels.length) % cels.length]
  const px = new Uint8Array(cel.w * cel.h)
  for (let y = 0; y < cel.h; y++) {
    for (let x = 0; x < cel.w; x++) {
      const sx = mirror ? cel.w - 1 - x : x
      px[y * cel.w + x] = resolvePixel(view, cel.pixels[y * cel.w + sx])
    }
  }
  return { w: cel.w, h: cel.h, px }
}
