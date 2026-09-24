import type { ColorRef, PenShape, PicCommand, PriorityRef, Pt } from '../agi/commands'
import { PIC_H, PIC_SIZE, PIC_W, T } from '../agi/constants'
import { agiLine, Raster } from '../agi/raster'
import type { Rng } from '../agi/rng'

export interface KitCtx {
  /** Anchor in room coordinates (bottom-center the element stands on). */
  x: number
  y: number
  scale: number
  flip: boolean
  /** Full-span elements draw in absolute room coordinates. */
  full: boolean
  horizon: number
  priorityBase: number
}

export type ControlKind = 'wall' | 'cond' | 'trigger' | 'water'
const CTRL: Record<ControlKind, number> = { wall: 0, cond: 1, trigger: 2, water: 3 }

type LPt = readonly [number, number]

function sameColor(a: ColorRef | null, b: ColorRef | null): boolean {
  if (a === null || b === null) return a === b
  if (typeof a === 'number' || typeof b === 'number') return a === b
  return a.role === b.role
}

function pointInPoly(px: number, py: number, P: readonly Pt[]): boolean {
  let c = false
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i]
    const [xj, yj] = P[j]
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}

/**
 * Drawing kit for library elements. Authors draw in local coordinates around
 * the anchor (x right, y down, negative y is up); the kit applies scale and
 * flip and emits plain AGI picture commands. It keeps its own raster so that
 * filled shapes always come out solid: a real AGI fill is used where the area
 * is untouched, and horizontal runs where something is already drawn there.
 */
export class Kit {
  readonly cmds: PicCommand[] = []
  private readonly r = new Raster(() => 0)
  private curVis: ColorRef | null = null
  private curPri: PriorityRef | null = null
  private priMode: PriorityRef | null = null
  private ctrl: number | null = null
  private penKey = ''

  constructor(readonly ctx: KitCtx) {}

  /** Effective scale (1 for full-span elements). */
  get sc(): number {
    return this.ctx.full ? 1 : this.ctx.scale
  }

  X(lx: number): number {
    const { x, scale, flip, full } = this.ctx
    if (full) return flip ? PIC_W - 1 - lx : lx
    return x + (flip ? -lx : lx) * scale
  }

  Y(ly: number): number {
    return this.ctx.full ? ly : this.ctx.y + ly * this.ctx.scale
  }

  pt(lx: number, ly: number): Pt {
    return [Math.round(this.X(lx)), Math.round(this.Y(ly))]
  }

  /** Size in pixels after scaling, never below `min`. */
  S(v: number, min = 1): number {
    return Math.max(min, Math.round(v * this.sc))
  }

  private emit(c: PicCommand): void {
    this.cmds.push(c)
    this.r.exec(c)
  }

  private setVis(c: ColorRef | null): void {
    if (sameColor(c, this.curVis) && this.cmds.length) return
    this.curVis = c
    this.emit({ op: 'visual', color: c })
  }

  private setPri(p: PriorityRef | null): void {
    if (p === this.curPri && this.cmds.length) return
    this.curPri = p
    this.emit({ op: 'priority', value: p })
  }

  private prepare(color: ColorRef): void {
    if (this.ctrl !== null) {
      this.setVis(null)
      this.setPri(this.ctrl)
    } else {
      this.setVis(color)
      this.setPri(this.priMode)
    }
  }

  // ---------------------------------------------------------------- state

  /** Draw everything inside `fn` with a priority tag instead of the layer default. */
  withPriority(mode: PriorityRef, fn: () => void): void {
    const prev = this.priMode
    this.priMode = mode
    fn()
    this.priMode = prev
  }

  /** Draw everything inside `fn` on the control screen only. */
  control(kind: ControlKind, fn: () => void): void {
    const prev = this.ctrl
    this.ctrl = CTRL[kind]
    fn()
    this.ctrl = prev
  }

  // ---------------------------------------------------------------- primitives

  line(pts: readonly LPt[], color: ColorRef = 0): void {
    if (!pts.length) return
    this.prepare(color)
    this.emit({ op: 'line', pts: pts.map(([x, y]) => this.pt(x, y)) })
  }

  hline(x0: number, x1: number, y: number, color: ColorRef = 0): void {
    this.line([[x0, y], [x1, y]], color)
  }

  vline(x: number, y0: number, y1: number, color: ColorRef = 0): void {
    this.line([[x, y0], [x, y1]], color)
  }

  dot(x: number, y: number, color: ColorRef = 0): void {
    this.line([[x, y]], color)
  }

  /** AGI pen plot. Size 0–7; splatter gives the spray-can texture. */
  plot(x: number, y: number, size: number, color: ColorRef, opts: { shape?: PenShape; splatter?: boolean; texture?: number } = {}): void {
    const shape = opts.shape ?? 'circle'
    const splatter = opts.splatter ?? false
    const key = `${size}${shape}${splatter}`
    this.prepare(color)
    if (key !== this.penKey) {
      this.penKey = key
      this.emit({ op: 'pen', size, shape, splatter })
    }
    this.emit({ op: 'plot', pts: [this.pt(x, y)], textures: opts.texture !== undefined ? [opts.texture & 0x7f] : undefined })
  }

  /** Raw AGI fill at a local point (only spreads into untouched pixels). */
  fillAt(x: number, y: number, color: ColorRef): void {
    this.prepare(color)
    this.emit({ op: 'fill', pts: [this.pt(x, y)] })
  }

  // ---------------------------------------------------------------- shapes

  /** Closed, filled polygon. The outline defaults to the fill color. */
  poly(pts: readonly LPt[], fill: ColorRef, outline?: ColorRef): void {
    if (pts.length < 2) return
    const P = pts.map(([x, y]) => this.pt(x, y))
    this.prepare(outline ?? fill)
    this.emit({ op: 'line', pts: [...P, P[0]] })
    if (P.length >= 3) this.fillInterior(P, fill)
  }

  /** Open polyline outline of a closed shape without filling. */
  outline(pts: readonly LPt[], color: ColorRef): void {
    if (pts.length < 2) return
    this.line([...pts, pts[0]], color)
  }

  rect(x0: number, y0: number, x1: number, y1: number, fill: ColorRef, outline?: ColorRef): void {
    this.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], fill, outline)
  }

  ellipsePts(cx: number, cy: number, rx: number, ry: number, n?: number, start = 0, end = Math.PI * 2): LPt[] {
    const segs = n ?? Math.max(8, Math.min(40, Math.round((rx + ry) * this.sc * 0.9)))
    const out: LPt[] = []
    const full = Math.abs(end - start - Math.PI * 2) < 1e-6
    const count = full ? segs : segs + 1
    for (let i = 0; i < count; i++) {
      const a = start + ((end - start) * i) / segs
      out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
    }
    return out
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, fill: ColorRef, outline?: ColorRef): void {
    this.poly(this.ellipsePts(cx, cy, rx, ry), fill, outline)
  }

  /** Irregular round blob, e.g. a tree canopy or a bush. */
  blobPts(cx: number, cy: number, rx: number, ry: number, rng: Rng, bumps = 9, jitter = 0.25): LPt[] {
    const pts: LPt[] = []
    const n = bumps * 2
    const phase = rng.range(0, Math.PI * 2)
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * Math.PI * 2
      const r = i % 2 === 0 ? 1 + rng.range(-jitter * 0.4, jitter) : 1 - rng.range(0, jitter)
      pts.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r])
    }
    return pts
  }

  blob(cx: number, cy: number, rx: number, ry: number, rng: Rng, fill: ColorRef, outline?: ColorRef, bumps = 9, jitter = 0.25): void {
    this.poly(this.blobPts(cx, cy, rx, ry, rng, bumps, jitter), fill, outline)
  }

  /** Horizontal rows of bricks or planks inside a rectangle (lines only). */
  courses(x0: number, y0: number, x1: number, y1: number, rowH: number, unitW: number, color: ColorRef, stagger = true): void {
    const [ax, bx] = x0 < x1 ? [x0, x1] : [x1, x0]
    let row = 0
    for (let y = y0 + rowH; y < y1; y += rowH, row++) this.hline(ax, bx, y, color)
    if (unitW <= 0) return
    row = 0
    for (let y = y0; y < y1; y += rowH, row++) {
      const off = stagger && row % 2 ? unitW / 2 : 0
      for (let x = ax + unitW - off; x < bx; x += unitW) {
        if (x <= ax) continue
        this.vline(x, y + 1, Math.min(y + rowH - 1, y1 - 1), color)
      }
    }
  }

  // ---------------------------------------------------------------- control

  wall(pts: readonly LPt[]): void {
    this.control('wall', () => this.line(pts))
  }

  condWall(pts: readonly LPt[]): void {
    this.control('cond', () => this.line(pts))
  }

  trigger(pts: readonly LPt[]): void {
    this.control('trigger', () => this.line(pts))
  }

  water(pts: readonly LPt[]): void {
    this.control('water', () => this.poly(pts, 0))
  }

  /** Solid wall area (e.g. the footprint of a building). */
  wallArea(pts: readonly LPt[]): void {
    this.control('wall', () => this.poly(pts, 0))
  }

  // ---------------------------------------------------------------- internals

  private fillInterior(P: readonly Pt[], fill: ColorRef): void {
    let x0 = PIC_W, y0 = PIC_H, x1 = -1, y1 = -1
    for (const [x, y] of P) {
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
    }
    x0 = Math.max(0, x0)
    y0 = Math.max(0, y0)
    x1 = Math.min(PIC_W - 1, x1)
    y1 = Math.min(PIC_H - 1, y1)
    if (x1 < x0 || y1 < y0) return

    const edge = new Uint8Array(PIC_SIZE)
    for (let i = 0; i < P.length; i++) {
      const [ax, ay] = P[i]
      const [bx, by] = P[(i + 1) % P.length]
      agiLine(ax, ay, bx, by, (x, y) => {
        if (x >= 0 && y >= 0 && x < PIC_W && y < PIC_H) edge[y * PIC_W + x] = 1
      })
    }
    const inside = new Uint8Array(PIC_SIZE)
    let count = 0
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * PIC_W + x
        if (!edge[i] && pointInPoly(x, y, P)) {
          inside[i] = 1
          count++
        }
      }
    }
    if (!count) return

    this.prepare(fill)
    const plane = this.ctrl !== null ? this.r.priority : this.r.visual
    const runs = new Uint8Array(PIC_SIZE)
    const done = new Uint8Array(PIC_SIZE)
    const seeds: Pt[] = []

    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const i = y * PIC_W + x
        if (!inside[i] || done[i]) continue
        if (plane[i] !== T) {
          runs[i] = 1
          done[i] = 1
          continue
        }
        // Would a real AGI fill from here stay inside the shape?
        const region = this.flood(plane, i, null)
        const leaks = region.some((j) => !inside[j])
        if (!leaks) {
          seeds.push([x, y])
          for (const j of region) done[j] = 1
        } else {
          for (const j of this.flood(plane, i, inside)) {
            runs[j] = 1
            done[j] = 1
          }
        }
      }
    }

    if (seeds.length) this.emit({ op: 'fill', pts: seeds })
    for (let y = y0; y <= y1; y++) {
      let x = x0
      while (x <= x1) {
        if (!runs[y * PIC_W + x]) {
          x++
          continue
        }
        const start = x
        while (x + 1 <= x1 && runs[y * PIC_W + x + 1]) x++
        this.emit({ op: 'line', pts: [[start, y], [x, y]] })
        x++
      }
    }
  }

  /** Untouched pixels 4-connected to `start`, optionally restricted to a mask. */
  private flood(plane: Uint8Array, start: number, restrict: Uint8Array | null): number[] {
    const seen = new Uint8Array(PIC_SIZE)
    const out: number[] = []
    const stack = [start]
    seen[start] = 1
    while (stack.length) {
      const i = stack.pop()!
      out.push(i)
      const x = i % PIC_W
      const y = (i / PIC_W) | 0
      const nb = [
        x > 0 ? i - 1 : -1,
        x < PIC_W - 1 ? i + 1 : -1,
        y > 0 ? i - PIC_W : -1,
        y < PIC_H - 1 ? i + PIC_W : -1,
      ]
      for (const j of nb) {
        if (j < 0 || seen[j] || plane[j] !== T) continue
        if (restrict && !restrict[j]) continue
        seen[j] = 1
        stack.push(j)
      }
    }
    return out
  }
}
