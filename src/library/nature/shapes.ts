import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { clamp, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'

/** A point as the kit hands it back (read-only). */
export type Pt = readonly [number, number]

/** Right edge and bottom row of the picture. */
export const W = 159
export const B = 167

/**
 * Closed silhouette from a ridge function sampled across [x0, x1], closed
 * down to row `base`. Used for mountains, hills and treelines.
 */
export function ridgePoly(ridge: (x: number) => number, base: number, step = 2, x0 = 0, x1 = W): LP[] {
  const pts: LP[] = [[x0, base]]
  for (let x = x0; x < x1; x += step) pts.push([x, Math.min(base, ridge(x))])
  pts.push([x1, Math.min(base, ridge(x1))])
  pts.push([x1, base])
  return pts
}

/** The top edge of a ridge only (for stroking a silhouette line). */
export function ridgeLine(ridge: (x: number) => number, base: number, step = 2, x0 = 0, x1 = W): LP[] {
  const pts: LP[] = []
  for (let x = x0; x < x1; x += step) pts.push([x, Math.min(base, ridge(x))])
  pts.push([x1, Math.min(base, ridge(x1))])
  return pts
}

/** x where a polyline running mostly up or down crosses row y. */
export function xAt(pts: readonly Pt[], y: number): number {
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i]
    if ((ay <= y && by >= y) || (ay >= y && by <= y)) {
      if (by === ay) return ax
      return ax + ((bx - ax) * (y - ay)) / (by - ay)
    }
  }
  return pts[pts.length - 1][0]
}

/** Grow (or shrink, with negative d) a shape around a center by d pixels in x and dy rows in y. */
export function grow(pts: readonly Pt[], cx: number, cy: number, dx: number, dy = dx): LP[] {
  return pts.map(([x, y]) => {
    const ax = x - cx
    const ay = y - cy
    const len = Math.hypot(ax * 2, ay) || 1
    return [x + ((ax * 2) / len) * dx, y + (ay / len) * dy]
  })
}

/**
 * Several overlapping shapes drawn as one outlined silhouette: the outline
 * color is laid down slightly larger first, then every shape is filled on top,
 * so no outlines show where the pieces overlap.
 */
export function silhouette(
  k: Kit,
  shapes: readonly { pts: readonly Pt[]; cx: number; cy: number }[],
  fill: ColorRef,
  line: ColorRef | undefined,
): void {
  const e = 1 / k.sc
  if (line) for (const s of shapes) k.poly(grow(s.pts, s.cx, s.cy, e, e), line)
  for (const s of shapes) k.poly(s.pts, fill)
}

/**
 * Stroke a filled shape's outline so it reads as one unbroken line.
 *
 * The kit fills a polygon by its exact geometry, but the AGI line along its
 * edge can wander half a pixel outside it, so on slanted edges a few pixels
 * between the outline and the fill stay empty and the background shows
 * through. With `fill`, every edge is first traced again one pixel toward the
 * inside in the fill color to plug those holes. Then the outline is drawn,
 * and near-45° edges (a staircase whose steps only touch at the corners, which
 * looks dotted on wide pixels) get a second inner pass so the steps join up.
 */
export function outlineSolid(k: Kit, pts: readonly Pt[], color: ColorRef, fill?: ColorRef): void {
  if (pts.length < 2) return
  let cx = 0
  let cy = 0
  for (const [x, y] of pts) {
    cx += x
    cy += y
  }
  cx /= pts.length
  cy /= pts.length
  const e = 1 / k.sc
  const edges = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length]
    const dx = Math.abs(k.X(b[0]) - k.X(a[0]))
    const dy = Math.abs(k.Y(b[1]) - k.Y(a[1]))
    return { a, b, dx, dy }
  })
  if (fill !== undefined) {
    for (const { a, b, dx, dy } of edges) {
      if (dx < 1 && dy < 1) continue
      if (dy >= dx) {
        const s = (a[0] + b[0]) / 2 < cx ? e : -e
        k.line([[a[0] + s, a[1]], [b[0] + s, b[1]]], fill)
      } else {
        const s = (a[1] + b[1]) / 2 < cy ? e : -e
        k.line([[a[0], a[1] + s], [b[0], b[1] + s]], fill)
      }
    }
  }
  k.line([...pts, pts[0]], color)
  for (const { a, b, dx, dy } of edges) {
    if (dx < 1 || dy < 1) continue
    const r = dy / dx
    if (r < 0.5 || r > 1.7) continue
    const s = (a[0] + b[0]) / 2 < cx ? e : -e
    k.line([[a[0] + s, a[1]], [b[0] + s, b[1]]], color)
  }
}

/** A thick tapering segment (branch, trunk piece) as a quad, widths in logical px. */
export function segQuad(a: LP, b: LP, w0: number, w1: number): LP[] {
  // work in display space (x doubled) so the thickness is even in all directions
  const ax = a[0] * 2
  const bx = b[0] * 2
  const dx = bx - ax
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  // w is a half-width in logical px = 2 display units horizontally, 1 row vertically
  const off = (w: number): LP => [nx * w, ny * w * 2]
  const o0 = off(w0)
  const o1 = off(w1)
  return [
    [a[0] + o0[0], a[1] + o0[1]],
    [b[0] + o1[0], b[1] + o1[1]],
    [b[0] - o1[0], b[1] - o1[1]],
    [a[0] - o0[0], a[1] - o0[1]],
  ]
}

/**
 * A rock silhouette standing on (cx, by): an irregular faceted dome with a
 * flattish base. Returns the outline, top-left first.
 */
export function rockPts(rng: Rng, cx: number, by: number, w: number, h: number, facets = 7): LP[] {
  const pts: LP[] = []
  const peak = rng.range(-0.25, 0.25)
  for (let i = 0; i <= facets; i++) {
    const u = i / facets
    const a = Math.PI + Math.PI * clamp(u + (i > 0 && i < facets ? rng.range(-0.04, 0.04) : 0), 0, 1)
    const r = i === 0 || i === facets ? 1 : 1 + rng.range(-0.14, 0.06)
    const lift = 1 + peak * Math.cos(a) * -1
    pts.push([cx + Math.cos(a) * w * r, by + Math.sin(a) * h * r * clamp(lift, 0.7, 1.3)])
  }
  pts.push([cx + w * 0.7, by], [cx - w * 0.7, by])
  return pts
}

/** Draw a shaded rock (used by boulder, rock cluster). */
export function drawRock(
  k: Kit,
  rng: Rng,
  cx: number,
  by: number,
  w: number,
  h: number,
  c: { rock: ColorRef; shade: ColorRef; light: ColorRef | null; line: ColorRef | undefined; crack: ColorRef | null },
  cracks: number,
): void {
  const facets = w * k.sc > 10 ? 8 : w * k.sc > 5 ? 6 : 5
  const pts = rockPts(rng, cx, by, w, h, facets)
  k.poly(pts, c.rock, c.line ?? c.rock)
  // shaded right-hand side: from a top-right vertex down to the base, back through an inner ridge
  const top = pts.slice(0, facets + 1)
  const start = Math.max(1, Math.round(facets * 0.55))
  const right = top.slice(start)
  const innerX = cx + w * rng.range(0.05, 0.3)
  const shade: LP[] = [...right, [cx + w * 0.7, by], [innerX, by], [innerX + w * rng.range(-0.1, 0.1), by - h * 0.45]]
  k.poly(shade, c.shade)
  // lit facet on the upper left
  if (c.light !== null && w * k.sc >= 3) {
    const a = top[1]
    const b = top[Math.min(start - 1, 2)]
    const inner: LP = [cx - w * 0.3, by - h * rng.range(0.45, 0.6)]
    k.poly([a, b, inner], c.light)
  }
  if (c.line) k.line([...pts, pts[0]], c.line)
  if (c.crack !== null) {
    for (let i = 0; i < cracks; i++) {
      const x0 = cx + rng.range(-w * 0.5, w * 0.4)
      const y0 = by - h * rng.range(0.55, 0.9)
      const len = h * rng.range(0.25, 0.45)
      k.line([[x0, y0], [x0 + rng.range(-1, 1), y0 + len * 0.5], [x0 + rng.range(-1.5, 1.5), y0 + len]], c.crack)
    }
  }
}
