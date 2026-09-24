import type { ColorRef } from '../agi/commands'
import type { Rng } from '../agi/rng'

/** Shorthand for a role color reference. */
export const R = (name: string): ColorRef => ({ role: name })

export type LP = [number, number]

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Smooth 1-D value noise sampled at x, built from a few random sine waves. */
export function wave(rng: Rng, octaves = 3): (x: number) => number {
  const parts = Array.from({ length: octaves }, (_, i) => ({
    f: rng.range(0.6, 1.4) * (i + 1) * 0.045,
    p: rng.range(0, Math.PI * 2),
    a: 1 / (i + 1),
  }))
  const norm = parts.reduce((s, q) => s + q.a, 0)
  return (x: number) => parts.reduce((s, q) => s + Math.sin(x * q.f + q.p) * q.a, 0) / norm
}

/** Evenly spread random points that keep a minimum distance. */
export function scatter(rng: Rng, n: number, x0: number, y0: number, x1: number, y1: number, minDist = 0): LP[] {
  const pts: LP[] = []
  let tries = 0
  while (pts.length < n && tries < n * 30) {
    tries++
    const p: LP = [rng.range(x0, x1), rng.range(y0, y1)]
    if (minDist > 0 && pts.some(([x, y]) => Math.hypot((x - p[0]) * 2, y - p[1]) < minDist)) continue
    pts.push(p)
  }
  return pts
}
