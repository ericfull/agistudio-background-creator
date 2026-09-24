/**
 * ASCII pixel-art format for built-in sprites.
 *
 * A cel is authored as an array of equal-length strings, one per row:
 *
 *   '.'          transparent
 *   '0'–'9','A'–'F'  literal EGA color (hex digit: 0 black … F white)
 *   'a'–'z'      a color role, looked up in a RoleTable (e.g. 's' → skin)
 *   '_'          (overlays only) erase: force the pixel back to transparent
 *
 * Lowercase letters become role slots (16 + k) so built-in sprites can be
 * recolored; several letters may share one role key (they merge into one slot).
 */
import type { Cel, ViewRole } from '../types'
import { ROLE_SLOT_BASE, SPRITE_T } from '../types'

export type Grid = readonly string[]

export const CLEAR = '.'
export const ERASE = '_'

export interface RoleDef {
  key: string
  label: string
  /** Default EGA color 0–15 */
  color: number
}

/** Letter → role. */
export type RoleTable = Record<string, RoleDef>

const HEX = '0123456789ABCDEF'

export function isRoleChar(ch: string): boolean {
  return ch >= 'a' && ch <= 'z'
}

export function literalColor(ch: string): number | undefined {
  const i = HEX.indexOf(ch)
  return i >= 0 ? i : undefined
}

/** Width/height of a grid; throws if rows are ragged or contain unknown characters. */
export function gridSize(g: Grid, what = 'grid'): { w: number; h: number } {
  const h = g.length
  const w = h ? g[0].length : 0
  if (!h || !w) throw new Error(`${what}: empty grid`)
  for (const row of g) {
    if (row.length !== w) throw new Error(`${what}: ragged row "${row}" (expected width ${w})`)
    for (const ch of row) {
      if (ch !== CLEAR && ch !== ERASE && !isRoleChar(ch) && literalColor(ch) === undefined) {
        throw new Error(`${what}: bad character "${ch}" in "${row}"`)
      }
    }
  }
  return { w, h }
}

/**
 * A character canvas used while compositing. Coordinates may run negative;
 * the canvas grows to fit whatever is stamped on it.
 */
export class CharCanvas {
  private px = new Map<string, string>()

  get(x: number, y: number): string {
    return this.px.get(`${x},${y}`) ?? CLEAR
  }

  set(x: number, y: number, ch: string): void {
    if (ch === ERASE || ch === CLEAR) this.px.delete(`${x},${y}`)
    else this.px.set(`${x},${y}`, ch)
  }

  /**
   * Paint a grid at (ox, oy). '.' leaves what is there; '_' erases.
   * With `under`, only empty pixels are painted (the grid goes behind).
   * With `onlyOver`, only pixels currently holding one of those letters change
   * (e.g. a vest painted over the shirt but not over the arm in front of it).
   */
  stamp(g: Grid, ox: number, oy: number, under = false, onlyOver?: string): void {
    gridSize(g)
    g.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x]
        if (ch === CLEAR) continue
        const cx = ox + x
        const cy = oy + y
        const cur = this.get(cx, cy)
        if (under && ch !== ERASE && cur !== CLEAR) continue
        if (onlyOver !== undefined && !onlyOver.includes(cur)) continue
        this.set(cx, cy, ch)
      }
    })
  }

  /** Swap letters (from → to) on rows y0..y1 inclusive. */
  recolor(map: Record<string, string>, y0 = -Infinity, y1 = Infinity): void {
    for (const [k, ch] of this.px) {
      const y = Number(k.split(',')[1])
      if (y < y0 || y > y1 || !(ch in map)) continue
      const to = map[ch]
      if (to === ERASE || to === CLEAR) this.px.delete(k)
      else this.px.set(k, to)
    }
  }

  /** Bounds of painted pixels, or null when empty. */
  bounds(): { x0: number; y0: number; x1: number; y1: number } | null {
    let b: { x0: number; y0: number; x1: number; y1: number } | null = null
    for (const k of this.px.keys()) {
      const [x, y] = k.split(',').map(Number)
      if (!b) b = { x0: x, y0: y, x1: x, y1: y }
      else {
        b.x0 = Math.min(b.x0, x)
        b.y0 = Math.min(b.y0, y)
        b.x1 = Math.max(b.x1, x)
        b.y1 = Math.max(b.y1, y)
      }
    }
    return b
  }

  /** Read a rectangle back out as a grid. */
  crop(x0: number, y0: number, w: number, h: number): string[] {
    const rows: string[] = []
    for (let y = 0; y < h; y++) {
      let row = ''
      for (let x = 0; x < w; x++) row += this.get(x0 + x, y0 + y)
      rows.push(row)
    }
    return rows
  }
}

/**
 * Crop a set of canvases to their shared bounds so every cel of a loop has the
 * same size (AGI anchors cels at their bottom-left, so the shared bottom row —
 * the feet — stays put). `cols` fixes the column range instead of measuring it.
 */
export function cropShared(canvases: CharCanvas[], cols?: [number, number]): string[][] {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const c of canvases) {
    const b = c.bounds()
    if (!b) continue
    x0 = Math.min(x0, b.x0)
    y0 = Math.min(y0, b.y0)
    x1 = Math.max(x1, b.x1)
    y1 = Math.max(y1, b.y1)
  }
  if (x0 === Infinity) throw new Error('cropShared: every cel is empty')
  if (cols) [x0, x1] = cols
  return canvases.map((c) => c.crop(x0, y0, x1 - x0 + 1, y1 - y0 + 1))
}

/**
 * Turns grids into cels. Role letters are gathered first, then given slots in
 * the table's declaration order, so the role list is stable and only contains
 * roles the art actually uses.
 */
export function resolveLoops(
  loops: Grid[][],
  table: RoleTable,
  what: string,
): { roles: ViewRole[]; loops: Cel[][] } {
  const used = new Set<string>()
  for (const cels of loops) {
    for (const g of cels) {
      gridSize(g, what)
      for (const row of g) {
        for (const ch of row) {
          if (!isRoleChar(ch)) continue
          if (!table[ch]) throw new Error(`${what}: letter "${ch}" has no role`)
          used.add(ch)
        }
      }
    }
  }
  const roles: ViewRole[] = []
  const slotOfKey = new Map<string, number>()
  for (const [ch, def] of Object.entries(table)) {
    if (!used.has(ch) || slotOfKey.has(def.key)) continue
    slotOfKey.set(def.key, roles.length)
    roles.push({ key: def.key, label: def.label, color: def.color })
  }
  const toValue = (ch: string): number => {
    if (ch === CLEAR || ch === ERASE) return SPRITE_T
    const lit = literalColor(ch)
    if (lit !== undefined) return lit
    return ROLE_SLOT_BASE + slotOfKey.get(table[ch].key)!
  }
  const out = loops.map((cels) => {
    const sizes = cels.map((g) => gridSize(g, what))
    const { w, h } = sizes[0]
    if (sizes.some((s) => s.w !== w || s.h !== h)) {
      throw new Error(`${what}: cels in a loop differ in size`)
    }
    return cels.map((g) => ({ w, h, pixels: g.flatMap((row) => [...row].map(toValue)) }))
  })
  return { roles, loops: out }
}
