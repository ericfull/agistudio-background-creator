import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { R, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { RoleSpec } from '../types'

/** Shared palette of blinking indicator lights. */
export const LIGHT_ROLES: Record<string, RoleSpec> = {
  light1: { label: 'Light A', color: 12 },
  light2: { label: 'Light B', color: 14 },
  light3: { label: 'Light C', color: 10 },
}
const LIGHT_KEYS = ['light1', 'light2', 'light3'] as const
export const lightColor = (rng: Rng): ColorRef => R(rng.pick(LIGHT_KEYS))

/** A row of indicator lights; some slots are left dark. */
export function lightRow(k: Kit, rng: Rng, x0: number, x1: number, y: number, step = 2, dark: ColorRef = 0, density = 0.7): void {
  for (let x = x0; x <= x1 + 1e-6; x += step) k.dot(x, y, rng.chance(density) ? lightColor(rng) : dark)
}

/** Converts a picture row to the element's local y. */
export function localY(k: Kit, py: number): number {
  return k.ctx.full ? py : (py - k.ctx.y) / k.sc
}

/** Calls fn once per picture row between two local y values (inclusive). */
export function eachRow(k: Kit, ly0: number, ly1: number, fn: (ly: number) => void): void {
  const a = Math.round(k.Y(Math.min(ly0, ly1)))
  const b = Math.round(k.Y(Math.max(ly0, ly1)))
  for (let py = a; py <= b; py++) fn(localY(k, py))
}

/**
 * Draws an ellipse as horizontal runs, one per picture row. `fn` receives the
 * local row and its span so callers can split it into lit/shaded parts, bands,
 * or clip it to a window.
 */
export function discRows(k: Kit, cx: number, cy: number, rx: number, ry: number, fn: (y: number, x0: number, x1: number, t: number) => void): void {
  eachRow(k, cy - ry, cy + ry, (y) => {
    const t = (y - cy) / ry
    if (t < -1 || t > 1) return
    const hw = rx * Math.sqrt(Math.max(0, 1 - t * t))
    fn(y, cx - hw, cx + hw, t)
  })
}

/** Ellipse points rotated by `angle` (radians) in square screen space. */
export function tiltedEllipse(cx: number, cy: number, rx: number, ry: number, angle: number, n = 16, a0 = 0, a1 = Math.PI * 2): LP[] {
  const out: LP[] = []
  const full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6
  const count = full ? n : n + 1
  const ca = Math.cos(angle)
  const sa = Math.sin(angle)
  const ASP = 1.7
  for (let i = 0; i < count; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    // square space: y shrunk by the pixel aspect
    const x = Math.cos(a) * rx
    const y = (Math.sin(a) * ry) / ASP
    out.push([cx + x * ca - y * sa, cy + (x * sa + y * ca) * ASP])
  }
  return out
}

/** Scattered single-dot stars inside a test area. */
export function starDots(
  k: Kit,
  rng: Rng,
  n: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  inside: (x: number, y: number) => boolean = () => true,
  roles: readonly string[] = ['star', 'star2'],
): void {
  for (let i = 0; i < n; i++) {
    const x = rng.range(x0, x1)
    const y = rng.range(y0, y1)
    if (!inside(x, y)) continue
    k.dot(x, y, R(rng.pick(roles)))
  }
}

/** Diagonal hazard stripes inside a rectangle, drawn as horizontal runs. */
export function hazard(k: Kit, x0: number, y0: number, x1: number, y1: number, period: number, a: ColorRef, b: ColorRef): void {
  eachRow(k, y0, y1, (y) => {
    k.hline(x0, x1, y, b)
    const off = (((y - y0) * 0.6) % period + period) % period
    for (let x = x0 - period + off; x < x1; x += period) {
      const s = Math.max(x0, x)
      const e = Math.min(x1, x + period / 2 - 0.5)
      if (e >= s) k.hline(s, e, y, a)
    }
  })
}

/**
 * One-point-perspective room geometry. The back wall is a rectangle; `P`
 * projects a point on the back-wall plane toward the viewer by factor s ≥ 1.
 */
export class RoomBox {
  readonly vx = 80
  readonly vy: number
  constructor(readonly bx0: number, readonly bx1: number, readonly top: number, readonly sy: number, eye = 0.5) {
    this.vy = sy - (sy - top) * eye
  }

  P(u: number, v: number, s: number): LP {
    return [this.vx + (u - this.vx) * s, this.vy + (v - this.vy) * s]
  }

  /** Largest s at which a ray through (u, v) is still inside the picture. */
  sMax(u: number, v: number): number {
    const dx = u - this.vx
    const dy = v - this.vy
    let t = 1e6
    if (dx < -1e-6) t = Math.min(t, -this.vx / dx)
    if (dx > 1e-6) t = Math.min(t, (159 - this.vx) / dx)
    if (dy > 1e-6) t = Math.min(t, (167 - this.vy) / dy)
    if (dy < -1e-6) t = Math.min(t, -this.vy / dy)
    return Math.max(1, t)
  }

  exit(u: number, v: number): LP {
    return this.P(u, v, this.sMax(u, v))
  }

  get floorPoly(): LP[] {
    const { bx0, bx1, sy } = this
    const fl = this.exit(bx0, sy)
    const fr = this.exit(bx1, sy)
    const pts: LP[] = [[bx0, sy], [bx1, sy], fr]
    if (fr[1] < 166.5) pts.push([159, 167])
    if (fl[1] < 166.5) pts.push([0, 167])
    pts.push(fl)
    return pts
  }

  get ceilPoly(): LP[] {
    const { bx0, bx1, top } = this
    const cl = this.exit(bx0, top)
    const cr = this.exit(bx1, top)
    const pts: LP[] = [[bx0, top], [bx1, top], cr]
    if (cr[1] > 0.5) pts.push([159, 0])
    if (cl[1] > 0.5) pts.push([0, 0])
    pts.push(cl)
    return pts
  }

  wallPoly(side: 'l' | 'r'): LP[] {
    const bx = side === 'l' ? this.bx0 : this.bx1
    const ex = side === 'l' ? 0 : 159
    const f = this.exit(bx, this.sy)
    const c = this.exit(bx, this.top)
    const pts: LP[] = [[bx, this.top], [bx, this.sy], f]
    if (Math.abs(f[0] - ex) > 0.5) pts.push([ex, 167])
    if (Math.abs(c[0] - ex) > 0.5) pts.push([ex, 0])
    pts.push(c)
    return pts
  }

  /** s where the side wall reaches the picture edge. */
  get sSide(): number {
    return this.sMax(this.bx0, this.vy)
  }

  /** s where the floor's center line reaches the bottom row. */
  get sFloor(): number {
    return (167 - this.vy) / (this.sy - this.vy)
  }
}

/** Depths (s values) for n evenly spaced world-depth slices between s=1 and sEnd. */
export function depthSteps(n: number, sEnd: number): number[] {
  const zEnd = 1 / sEnd
  const out: number[] = []
  for (let i = 0; i <= n; i++) out.push(1 / (1 - (i * (1 - zEnd)) / n))
  return out
}

function sameRef(a: ColorRef | null, b: ColorRef | null): boolean {
  if (a === null || b === null) return a === b
  if (typeof a === 'number' || typeof b === 'number') return a === b
  return a.role === b.role
}

/**
 * Draws one picture row (full-span coordinates) as horizontal runs of equal
 * color, where `test(x)` gives the color of each column or null for none.
 */
export function rowRuns(k: Kit, y: number, x0: number, x1: number, test: (x: number) => ColorRef | null): void {
  let start = x0
  let col: ColorRef | null = null
  for (let x = x0; x <= x1 + 1; x++) {
    const c = x <= x1 ? test(x) : null
    if (!sameRef(c, col)) {
      if (col !== null) k.hline(start, x - 1, y, col)
      start = x
      col = c
    }
  }
}
