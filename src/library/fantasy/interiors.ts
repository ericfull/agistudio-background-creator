import type { Rng } from '../../agi/rng'
import { R, clamp, lerp, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef, P, ParamSpec } from '../types'
import { stones } from './shared'

const W = 159
const B = 167
const VX = 79.5

/**
 * One-point perspective room box. The anchor row is the seam between the
 * back wall and the floor; floor and ceiling edges run away from a vanishing
 * point in the middle of the back wall.
 */
interface Box {
  seam: number
  top: number
  L: number
  Rr: number
  vy: number
  /** Floor edge exit on the left side (at x=0 or on the bottom row). */
  fl: LP
  fr: LP
  /** Ceiling edge exit on the left side (at x=0 or on the top row). */
  cl: LP
  cr: LP
}

function box(k: Kit, p: P): Box {
  const seam = clamp(Math.round(k.ctx.y), 50, 150)
  const bw = p.n('width')
  const L = Math.round(VX - bw / 2)
  const Rr = W - L
  const top = clamp(p.n('ceiling'), 0, seam - 24)
  const vy = seam - (seam - top) * 0.45
  const dx = VX - L
  // floor edge from (L, seam) away from the vanishing point
  const sF = Math.min(L / dx, (B - seam) / Math.max(1e-3, seam - vy))
  const fl: LP = [L - sF * dx, seam + sF * (seam - vy)]
  // ceiling edge from (L, top)
  const sC = top <= 0 ? 0 : Math.min(L / dx, top / Math.max(1e-3, vy - top))
  const cl: LP = [L - sC * dx, top - sC * (vy - top)]
  return { seam, top, L, Rr, vy, fl, fr: [W - fl[0], fl[1]], cl, cr: [W - cl[0], cl[1]] }
}

/** Row of the left floor edge at x (clamped to the bottom). */
function floorEdgeY(b: Box, x: number): number {
  return Math.min(B, b.seam + ((b.L - x) / (VX - b.L)) * (b.seam - b.vy))
}

/** x of the left floor edge at row y. */
function floorEdgeX(b: Box, y: number): number {
  if (y >= b.fl[1] && b.fl[0] <= 0.01) return 0
  return Math.max(0, b.L - ((y - b.seam) / (b.seam - b.vy)) * (VX - b.L))
}

/** Point on the ray from the vanishing point through (x, y), continued to the picture edge. */
function toEdge(b: Box, x: number, y: number): LP {
  const dx = x - VX
  const dy = y - b.vy
  let s = Infinity
  if (dx < 0) s = Math.min(s, -x / dx)
  if (dx > 0) s = Math.min(s, (W - x) / dx)
  if (dy > 0) s = Math.min(s, (B - y) / dy)
  if (dy < 0) s = Math.min(s, -y / dy)
  if (!isFinite(s)) s = 0
  return [x + dx * s, y + dy * s]
}

function sideWallPts(b: Box, side: -1 | 1): LP[] {
  const m = (pt: LP): LP => (side < 0 ? pt : [W - pt[0], pt[1]])
  const pts: LP[] = [[b.L, b.top], [b.L, b.seam], b.fl]
  if (b.fl[0] > 0.01) pts.push([0, B])
  if (b.cl[0] <= 0.01) pts.push(b.cl)
  else pts.push([0, 0], b.cl)
  return pts.map(m)
}

function shell(k: Kit, p: P, rng: Rng, mat: 'stone' | 'wood'): void {
  const b = box(k, p)
  const { seam, top, L, Rr } = b
  const line = R('line')
  const floorKind = p.s('floor')

  // ---- ceiling
  if (top > 0) {
    const ceil: LP[] = b.cl[0] <= 0.01
      ? [[0, 0], [W, 0], b.cr, [Rr, top], [L, top], b.cl]
      : [b.cl, b.cr, [Rr, top], [L, top]]
    k.poly(ceil, R('ceiling'), line)
    if (p.b('beams')) {
      const n = Math.max(3, Math.round((Rr - L) / 16))
      for (let i = 0; i <= n; i++) {
        const x = lerp(L + 2, Rr - 2, i / n)
        const a = toEdge(b, x - 1.5, top)
        const c = toEdge(b, x + 1.5, top)
        k.poly([[x - 1.5, top], [x + 1.5, top], c, a], R('beam'), line)
      }
      k.rect(L, top - 2, Rr, top, R('beam'), line)
    }
  }

  // ---- back wall
  k.rect(L, top, Rr, seam, R('wall'), line)
  if (mat === 'stone') {
    stones(k, rng, L, top, Rr, seam, R('mortar'), { rowH: 6, minW: 7, maxW: 13 })
  } else {
    for (let x = L + rng.range(3, 5); x < Rr - 2; x += rng.range(4, 5.5)) k.vline(x, top + 1, seam - 1, R('mortar'))
    const rail = lerp(top, seam, 0.42)
    k.rect(L, rail - 1, Rr, rail + 1, R('beam'), line)
    for (let i = 0; i < (Rr - L) / 10; i++) k.dot(rng.range(L + 2, Rr - 2), rng.range(top + 2, seam - 3), R('mortar'))
  }

  // ---- side walls
  for (const side of [-1, 1] as const) {
    const pts = sideWallPts(b, side)
    k.poly(pts, R('side'), line)
    const mx = (x: number) => (side < 0 ? x : W - x)
    if (mat === 'stone') {
      // courses run toward the vanishing point
      const rows: number[] = []
      for (let y = seam - 6; y > top + 1; y -= 6) rows.push(y)
      const lineAt = (y0: number, x: number) => y0 + ((L - x) / (VX - L)) * (y0 - b.vy)
      for (const y0 of rows) {
        const e = toEdge(b, L, y0)
        k.line([[mx(L), y0], [mx(e[0]), e[1]]], R('sideLine'))
      }
      const all = [seam, ...rows, top]
      for (let i = 0; i + 1 < all.length; i++) {
        for (let x = L - rng.range(3, 8); x > 2; x -= rng.range(6, 12)) {
          const ya = lineAt(all[i + 1], x)
          const yb = Math.min(lineAt(all[i], x), floorEdgeY(b, x))
          if (ya < 1 || yb - ya < 3) continue
          k.vline(mx(x), ya + 1, yb - 1, R('sideLine'))
        }
      }
    } else {
      let step = 4.5
      for (let x = L - step; x > 1; x -= step) {
        const ya = Math.max(0, top + ((L - x) / (VX - L)) * (top - b.vy))
        const yb = floorEdgeY(b, x)
        if (yb - ya > 2) k.vline(mx(x), ya + 1, yb - 1, R('sideLine'))
        step *= 1.12
      }
    }
    // baseboard along the floor edge
    const e = b.fl
    k.poly([[mx(L), seam - 2], [mx(L), seam], [mx(e[0]), e[1]], [mx(e[0]), e[1] - 3]], R('trim'), line)
  }
  k.rect(L, seam - 2, Rr, seam, R('trim'), line)

  // ---- floor
  const floor: LP[] = [[L, seam], [Rr, seam], b.fr]
  if (b.fr[0] >= W - 0.01) floor.push([W, B])
  if (b.fl[0] <= 0.01) floor.push([0, B])
  floor.push(b.fl)
  k.poly(floor, R('floor'), line)
  const xl = (y: number) => floorEdgeX(b, y)
  const xr = (y: number) => W - floorEdgeX(b, y)
  if (floorKind === 'flags') {
    const rows: number[] = []
    let y = seam
    let gap = 4
    while (y + gap < B - 1) {
      y += gap
      rows.push(y)
      k.hline(xl(y) + 1, xr(y) - 1, y, R('floorLine'))
      gap *= 1.3
    }
    rows.unshift(seam)
    rows.push(B)
    const n = Math.max(4, Math.round((Rr - L) / 12))
    for (let r = 0; r + 1 < rows.length; r++) {
      const off = r % 2 ? 0.5 : 0
      for (let i = -n; i <= 2 * n; i++) {
        const x0 = lerp(L, Rr, (i + off) / n)
        // point where this ray crosses rows r and r+1
        const at = (yy: number) => VX + ((x0 - VX) * (yy - b.vy)) / (seam - b.vy)
        const xa = at(rows[r])
        const xb = at(rows[r + 1])
        if (xa < xl(rows[r]) + 1 || xa > xr(rows[r]) - 1 || xb < xl(rows[r + 1]) + 1 || xb > xr(rows[r + 1]) - 1) continue
        k.line([[xa, rows[r] + 1], [xb, rows[r + 1] - 1]], R('floorLine'))
      }
    }
  } else if (floorKind === 'planks') {
    const n = Math.max(6, Math.round((Rr - L) / 6))
    for (let i = -n; i <= 2 * n; i++) {
      const x0 = lerp(L, Rr, i / n)
      if (x0 <= L || x0 >= Rr) {
        // rays from beyond the back corners only show when they meet the floor
        const e = toEdge(b, x0, seam)
        if (e[1] < B - 0.5) continue
      }
      const e = toEdge(b, x0, seam)
      k.line([[x0, seam + 1], e], R('floorLine'))
    }
    for (let i = 0; i < n * 2; i++) {
      const yy = rng.range(seam + 3, B - 2)
      const t = rng.range(0.1, 0.9)
      const xa = lerp(xl(yy), xr(yy), t)
      k.hline(xa, xa + clamp((yy - seam) * 0.12, 1.5, 6), yy, R('floorLine'))
    }
  } else {
    for (let i = 0; i < 70; i++) {
      const yy = rng.range(seam + 2, B - 1)
      const xa = rng.range(xl(yy) + 1, xr(yy) - 1)
      k.hline(xa, xa + clamp((yy - seam) * 0.05, 0, 2), yy, R('floorLine'))
    }
  }

  // walls along the floor edges keep walkers on the floor
  k.wall([b.fl, [L, seam], [Rr, seam], b.fr])
}

const shellParams = (floor: string): ParamSpec[] => [
  { key: 'width', label: 'Back wall width', type: 'int', min: 50, max: 144, default: 104 },
  { key: 'ceiling', label: 'Back wall top', type: 'int', min: 0, max: 40, default: 16 },
  { key: 'beams', label: 'Ceiling beams', type: 'bool', default: true },
  {
    key: 'floor', label: 'Floor', type: 'select', default: floor,
    options: [{ value: 'flags', label: 'Flagstones' }, { value: 'planks', label: 'Planks' }, { value: 'dirt', label: 'Dirt' }],
  },
]

export const interiors: ElementDef[] = [
  {
    id: 'fantasy-room-stone',
    name: 'Stone room',
    themes: ['fantasy'],
    category: 'interior',
    tags: ['room', 'interior', 'castle', 'hall', 'dungeon', 'stone', 'shell'],
    span: 'full',
    roles: {
      wall: { label: 'Back wall', color: 7 },
      mortar: { label: 'Mortar', color: 8 },
      side: { label: 'Side walls', color: 7 },
      sideLine: { label: 'Side wall lines', color: 8 },
      trim: { label: 'Baseboard', color: 8 },
      floor: { label: 'Floor', color: 8 },
      floorLine: { label: 'Floor lines', color: 0 },
      ceiling: { label: 'Ceiling', color: 8 },
      beam: { label: 'Beams', color: 6 },
      line: { label: 'Outline', color: 0 },
    },
    params: shellParams('flags'),
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 100 },
    hasControl: true,
    generate(k, p, rng) {
      shell(k, p, rng, 'stone')
    },
  },
  {
    id: 'fantasy-room-wood',
    name: 'Wooden room',
    themes: ['fantasy'],
    category: 'interior',
    tags: ['room', 'interior', 'cottage', 'cabin', 'house', 'inn', 'wood', 'shell'],
    span: 'full',
    roles: {
      wall: { label: 'Back wall', color: 6 },
      mortar: { label: 'Board lines', color: 0 },
      side: { label: 'Side walls', color: 6 },
      sideLine: { label: 'Side wall lines', color: 0 },
      trim: { label: 'Baseboard', color: 0 },
      floor: { label: 'Floor', color: 6 },
      floorLine: { label: 'Floor lines', color: 0 },
      ceiling: { label: 'Ceiling', color: 8 },
      beam: { label: 'Beams', color: 6 },
      line: { label: 'Outline', color: 0 },
    },
    params: shellParams('planks'),
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 100 },
    hasControl: true,
    generate(k, p, rng) {
      shell(k, p, rng, 'wood')
    },
  },
]
