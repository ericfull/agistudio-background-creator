import { uid } from '../state/factory'
import type { Theme } from '../state/types'
import type { Cel, Loop, View } from './types'
import { SPRITE_T } from './types'

export function blankCel(w: number, h: number): Cel {
  return { w, h, pixels: new Array(w * h).fill(SPRITE_T) }
}

export function newView(name = 'New sprite', theme: Theme = 'fantasy'): View {
  return {
    id: uid('view'),
    name,
    theme,
    kind: 'character',
    roles: [],
    colorMap: {},
    loops: [
      { name: 'right', cels: [blankCel(9, 32)] },
      { name: 'left', mirrorOf: 0, cels: [] },
      { name: 'down', cels: [blankCel(9, 32)] },
      { name: 'up', cels: [blankCel(9, 32)] },
    ],
    fps: 8,
  }
}

/** Copy a built-in view into the project with a fresh id. */
export function cloneView(v: View): View {
  const copy = structuredClone(v)
  copy.id = uid('view')
  return copy
}

export function mirrorCel(c: Cel): Cel {
  const px = new Array(c.w * c.h)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) px[y * c.w + x] = c.pixels[y * c.w + (c.w - 1 - x)]
  return { w: c.w, h: c.h, pixels: px }
}

/** Resize keeping the bottom-center (feet) in place. */
export function resizeCel(c: Cel, w: number, h: number): Cel {
  const out = blankCel(w, h)
  const dx = Math.floor((w - c.w) / 2)
  const dy = h - c.h
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
      out.pixels[ny * w + nx] = c.pixels[y * c.w + x]
    }
  }
  return out
}

/** 4-connected flood fill of same-valued pixels. */
export function floodCel(c: Cel, sx: number, sy: number, value: number): number[] {
  const px = [...c.pixels]
  const target = px[sy * c.w + sx]
  if (target === value) return px
  const stack = [[sx, sy]]
  while (stack.length) {
    const [x, y] = stack.pop()!
    if (x < 0 || y < 0 || x >= c.w || y >= c.h) continue
    const i = y * c.w + x
    if (px[i] !== target) continue
    px[i] = value
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  return px
}

export function loopCelCount(v: View, loop: Loop): number {
  return loop.mirrorOf !== undefined ? (v.loops[loop.mirrorOf]?.cels.length ?? 0) : loop.cels.length
}
