import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { clamp, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'

export type Span = [number, number]
/** A stone block laid by `stones()` (local coordinates, edges on the mortar lines). */
export type Block = { x0: number; x1: number; y0: number; y1: number }
/** Solid horizontal spans of a shape at a local row. */
export type SpanFn = (y: number) => Span[]

/** One scaled pixel in local units. */
export const onePx = (k: Kit) => 1 / k.sc

/**
 * Irregular stone block courses inside a rectangle, laid from the bottom up.
 * `spans` clips the pattern to a non-rectangular face (e.g. around arches).
 */
export function stones(
  k: Kit,
  rng: Rng,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: ColorRef,
  o: { rowH?: number; minW?: number; maxW?: number; spans?: SpanFn; joints?: boolean } = {},
): Block[] {
  const blocks: Block[] = []
  const px = onePx(k)
  const rowH = Math.max(o.rowH ?? 5, 2.6 * px)
  const minW = Math.max(o.minW ?? 5, 3 * px)
  const maxW = Math.max(o.maxW ?? 10, minW + px)
  const spans = o.spans ?? (() => [[x0, x1]] as Span[])
  const inside = (x: number, y: number) => spans(y).some(([a, b]) => x > a + px && x < b - px)
  for (let yb = y1; yb > y0 + px * 1.5; yb -= rowH) {
    const ya = Math.max(y0, yb - rowH)
    if (ya > y0 + px * 0.5) for (const [a, b] of spans(ya)) if (b - a > 2 * px) k.hline(a + px * 0.6, b - px * 0.6, ya, color)
    if (o.joints === false || yb - ya < 2 * px) {
      blocks.push({ x0, x1, y0: ya, y1: yb })
      continue
    }
    let x = x0 + rng.range(0.15, 1) * maxW
    let prev = x0
    while (x < x1 - px) {
      if (inside(x, ya + px) && inside(x, yb - px)) {
        k.vline(x, ya + px * 0.6, yb - px * 0.6, color)
        blocks.push({ x0: prev, x1: x, y0: ya, y1: yb })
        prev = x
      }
      x += rng.range(minW, maxW)
    }
    blocks.push({ x0: prev, x1, y0: ya, y1: yb })
  }
  return blocks
}

/** Vertical boards (plank lines) across a rectangle. */
export function boards(k: Kit, rng: Rng, x0: number, y0: number, x1: number, y1: number, color: ColorRef, w = 4, jitter = 0.8): void {
  const px = onePx(k)
  const step = Math.max(w, 2.5 * px)
  for (let x = x0 + step + rng.range(-jitter, jitter) * 0.5; x < x1 - px * 1.2; x += step + rng.range(-jitter, jitter)) {
    k.vline(x, y0 + px * 0.6, y1 - px * 0.6, color)
  }
}

/** Horizontal lines (plank rows) across a rectangle, with a few staggered butt joints. */
export function planks(k: Kit, rng: Rng, x0: number, y0: number, x1: number, y1: number, color: ColorRef, h = 3, joints = true): void {
  const px = onePx(k)
  const step = Math.max(h, 2 * px)
  for (let y = y0 + step; y < y1 - px * 0.9; y += step) k.hline(x0 + px * 0.6, x1 - px * 0.6, y, color)
  if (!joints) return
  for (let y = y0; y < y1 - px; y += step) {
    const n = Math.floor((x1 - x0) / 14)
    for (let i = 0; i < n; i++) {
      const x = rng.range(x0 + 3, x1 - 3)
      k.vline(x, y + px * 0.6, Math.min(y + step, y1) - px * 0.6, color)
    }
  }
}

/**
 * Top edge (left to right) of a battlement: merlons of width `mw` rising `mh`
 * above row `y`. Starts at (x0, y - mh) and ends at (x1, y - mh).
 */
export function battlement(x0: number, x1: number, y: number, mw: number, mh: number, rng?: Rng): LP[] {
  const span = x1 - x0
  if (span - 2 * mw < 1.5) return [[x0, y - mh], [x1, y - mh]]
  let n = Math.max(2, Math.round((span + mw) / (mw * 2)))
  while (n > 2 && (span - mw) / (n - 1) - mw < 1.5) n--
  const step = (span - mw) / (n - 1)
  const pts: LP[] = []
  const edges: number[] = []
  for (let i = 0; i < n; i++) edges.push(x0 + i * step + (i > 0 && i < n - 1 && rng ? rng.range(-0.3, 0.3) : 0))
  for (let i = 0; i < n; i++) {
    const a = edges[i]
    const b = i === n - 1 ? x1 : a + mw
    pts.push([a, y - mh], [b, y - mh])
    if (i < n - 1) pts.push([b, y], [edges[i + 1], y])
  }
  return pts
}

/** Merlon x-ranges of a battlement built by `battlement()` (for shading/details). */
export function merlonRanges(pts: readonly LP[], topY: number): Span[] {
  const out: Span[] = []
  for (let i = 0; i + 1 < pts.length; i++) {
    if (Math.abs(pts[i][1] - topY) < 1e-6 && Math.abs(pts[i + 1][1] - topY) < 1e-6) out.push([pts[i][0], pts[i + 1][0]])
  }
  return out
}

// ------------------------------------------------------------------ cylinders

/** Row offset below an ellipse's center line at x (lower half). */
export function arcY(x: number, r: number, e: number): number {
  const t = clamp(x / r, -1, 1)
  return e * Math.sqrt(1 - t * t)
}

/** Lower half of an ellipse from right to left. */
export function lowerArc(k: Kit, cx: number, cy: number, rx: number, ry: number): LP[] {
  return k.ellipsePts(cx, cy, rx, ry, undefined, 0, Math.PI).map(([x, y]) => [x, y] as LP)
}

/** Upper half of an ellipse from left to right. */
export function upperArc(k: Kit, cx: number, cy: number, rx: number, ry: number, n?: number): LP[] {
  return k.ellipsePts(cx, cy, rx, ry, n, Math.PI, Math.PI * 2).map(([x, y]) => [x, y] as LP)
}

/** Front outline of an upright cylinder of radius r whose round base touches y=0. */
export function cylinderPts(k: Kit, r: number, yTop: number, e: number): LP[] {
  return [[-r, yTop], [r, yTop], ...lowerArc(k, 0, -e, r, e)]
}

/** Shaded right-hand side of a cylinder, from x = r*from to the edge. */
export function cylinderShadePts(k: Kit, r: number, yTop: number, e: number, from = 0.45): LP[] {
  const a1 = Math.acos(clamp(from, -1, 1))
  const arc = k.ellipsePts(0, -e, r, e, 10, 0, a1).map(([x, y]) => [x, y] as LP)
  return [[r * from, yTop], [r, yTop], ...arc]
}

/** Curved stone courses around a cylinder (between yTop and the base). */
export function cylinderCourses(k: Kit, rng: Rng, r: number, yTop: number, e: number, color: ColorRef, rowH = 6, joints = true): void {
  const px = onePx(k)
  const step = Math.max(rowH, 2.6 * px)
  const heights: number[] = [0]
  for (let h = step; -h - e > yTop + px * 1.5; h += step) heights.push(h)
  for (let i = 1; i < heights.length; i++) {
    const h = heights[i]
    k.line(k.ellipsePts(0, -h - e, r - px * 0.6, e, undefined, 0, Math.PI), color)
  }
  if (!joints) return
  heights.push(-yTop - e)
  for (let i = 0; i + 1 < heights.length; i++) {
    const lo = heights[i]
    const hi = heights[i + 1]
    if (hi - lo < 2 * px) continue
    let a = rng.range(0.1, 0.35) * Math.PI
    while (a < Math.PI * 0.92) {
      const x = r * Math.cos(a)
      const yLo = -lo - e + arcY(x, r, e)
      const yHi = -hi - e + arcY(x, r, e)
      k.vline(x, yHi + px * 0.6, yLo - px * 0.6, color)
      a += rng.range(0.22, 0.36) * Math.PI
    }
  }
}

// ------------------------------------------------------------------ fire

/** A jagged fire of flame tongues on a base line (outer flame + bright core). */
export function flames(k: Kit, rng: Rng, cx: number, base: number, w: number, h: number, outer: ColorRef, core: ColorRef): void {
  const n = Math.max(2, Math.round(w / 2.5))
  const pts: LP[] = [[cx - w / 2, base]]
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const tip = h * (0.55 + 0.45 * Math.sin(t * Math.PI)) * rng.range(0.75, 1.05)
    pts.push([cx - w / 2 + w * t, base - tip])
    if (i < n - 1) pts.push([cx - w / 2 + (w * (i + 1)) / n, base - tip * rng.range(0.3, 0.5)])
  }
  pts.push([cx + w / 2, base])
  k.poly(pts, outer)
  const cw = w * 0.5
  const ch = h * 0.55
  k.poly([[cx - cw / 2, base], [cx - cw * 0.15, base - ch * rng.range(0.6, 0.9)], [cx + rng.range(-0.5, 0.5), base - ch], [cx + cw * 0.2, base - ch * rng.range(0.55, 0.85)], [cx + cw / 2, base]], core)
}

/** Arched opening outline (left to right along the top, then down the right side and across the base). */
export function archPts(k: Kit, x0: number, x1: number, yTop: number, yBot: number, arched: boolean): LP[] {
  const rx = (x1 - x0) / 2
  const cx = (x0 + x1) / 2
  const ry = Math.min(rx * 1.7, (yBot - yTop) * 0.5)
  if (!arched || ry < 1.5) return [[x0, yBot], [x0, yTop], [x1, yTop], [x1, yBot]]
  return [[x0, yBot], ...upperArc(k, cx, yTop + ry, rx, ry), [x1, yBot]]
}

/** Top of an arched opening at x (for clipping details inside it). */
export function archTopAt(x: number, x0: number, x1: number, yTop: number, yBot: number, arched: boolean): number {
  const rx = (x1 - x0) / 2
  const cx = (x0 + x1) / 2
  const ry = Math.min(rx * 1.7, (yBot - yTop) * 0.5)
  if (!arched || ry < 1.5) return yTop
  return yTop + ry - arcY(x - cx, rx, ry)
}
