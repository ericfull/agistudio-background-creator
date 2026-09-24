import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import type { LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'

/** One logical x pixel shows about as wide as 1.7 rows. */
export const ASPECT = 1.7

/** A tapered stroke along a polyline; `hw` is the half-width in x pixels at each point. */
export interface Stroke {
  pts: LP[]
  hw: number[]
}

/** Polygon around a tapered polyline, grown by `extra` pixels on each side. */
export function strokePoly(s: Stroke, extra = 0): LP[] {
  const { pts, hw } = s
  const n = pts.length
  const left: LP[] = []
  const right: LP[] = []
  let du = 0
  let dv = -1
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(n - 1, i + 1)]
    du = (b[0] - a[0]) * ASPECT
    dv = b[1] - a[1]
    const len = Math.hypot(du, dv) || 1
    du /= len
    dv /= len
    const nu = -dv
    const nv = du
    const e = Math.min(extra, hw[i] * 0.9 + 0.2)
    const ox = nu * (hw[i] + e)
    const oy = nv * (hw[i] * ASPECT + e)
    left.push([pts[i][0] + ox, pts[i][1] + oy])
    right.push([pts[i][0] - ox, pts[i][1] - oy])
  }
  const end = pts[n - 1]
  const tip: LP = [end[0] + du * extra * 0.6, end[1] + dv * extra]
  return [...left, tip, ...right.reverse()]
}

/**
 * Draws a set of limbs (trunk, branches, roots) as one silhouette: every limb
 * is first drawn fat in the outline color, then again in the fill color, so
 * joints stay clean and only the outer edge is outlined. Thin tips stay dark.
 */
export function drawLimbs(k: Kit, strokes: Stroke[], fill: ColorRef, outline: ColorRef, minFill = 0.85): void {
  for (const s of strokes) {
    if (s.pts.length < 2) continue
    if (Math.max(...s.hw) < 0.6) k.line(s.pts, outline)
    else k.poly(strokePoly(s, 1), outline)
  }
  for (const s of strokes) {
    let n = 0
    while (n < s.hw.length && s.hw[n] >= minFill) n++
    if (n < 2) continue
    k.poly(strokePoly({ pts: s.pts.slice(0, n), hw: s.hw.slice(0, n) }, 0), fill)
  }
}

/** Jagged crack running from (x, y) at a visual angle (0 = right, PI/2 = down). */
export function crack(k: Kit, rng: Rng, x: number, y: number, len: number, angle: number, color: ColorRef, branch = true): void {
  const pts: LP[] = [[x, y]]
  let a = angle
  let cx = x
  let cy = y
  let done = 0
  while (done < len) {
    const step = rng.range(2, 3.5)
    a += rng.range(-0.5, 0.5)
    a = angle + Math.max(-0.6, Math.min(0.6, a - angle))
    cx += (Math.cos(a) * step) / ASPECT
    cy += Math.sin(a) * step
    pts.push([cx, cy])
    done += step
  }
  k.line(pts, color)
  if (branch && pts.length >= 4) {
    const [bx, by] = pts[Math.floor(pts.length / 2)]
    crack(k, rng, bx, by, len * 0.35, angle + (rng.chance(0.5) ? 0.7 : -0.7), color, false)
  }
}

/** Keeps a transformed shape builder tidy: shear by `tilt` (x shift per row up) around the base. */
export function shear(pts: LP[], tilt: number, ox = 0, oy = 0): LP[] {
  return pts.map(([x, y]) => [ox + x - tilt * y, oy + y])
}

/** Small bat silhouette centered at (x, y). */
export function bat(k: Kit, x: number, y: number, color: ColorRef, up: boolean): void {
  const w = up ? -1 : 0
  k.line([[x - 3, y - 1 + w], [x - 2, y], [x - 1, y]], color)
  k.line([[x + 1, y], [x + 2, y], [x + 3, y - 1 + w]], color)
  k.vline(x, y - 1, y + 1, color)
}

/** Evenly spaced positions across [a, b] (inclusive), at most `max` of them. */
export function spread(a: number, b: number, n: number): number[] {
  if (n <= 1) return [(a + b) / 2]
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1))
}

/** Small round ball finial resting on (x, y), drawn with an AGI circle pen. */
export function knob(k: Kit, x: number, y: number, fill: ColorRef, size = 2): void {
  const n = Math.max(1, Math.min(3, Math.round(size * k.sc)))
  k.plot(x, y - (n + 0.5) / k.sc, n, fill)
}
