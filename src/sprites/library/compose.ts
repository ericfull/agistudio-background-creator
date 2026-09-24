/**
 * Character composition: a base body (with a full walk cycle) plus ordered
 * part overlays (hair, hats, outfits, props held…), each drawn per facing and
 * optionally per cel. This is data-only so a character creator can build new
 * characters from the same parts later.
 */
import type { Theme } from '../../state/types'
import type { Loop, View } from '../types'
import { CharCanvas, cropShared, resolveLoops, type Grid, type RoleDef, type RoleTable } from './ascii'

export type Facing = 'right' | 'down' | 'up'
export const FACINGS: Facing[] = ['right', 'down', 'up']

export type BodyId = 'adult' | 'short'

export interface BodyFacing {
  cels: Grid[]
  /**
   * Top-left of the head box in body coordinates. Parts anchored to 'head'
   * are placed relative to this, so one hat fits every body.
   */
  head: [number, number]
}

export interface BodyDef {
  id: BodyId
  label: string
  facings: Record<Facing, BodyFacing>
}

/** Paints grids over (or under) the body. */
export interface StampLayer {
  /** One grid used for every cel, or one grid per cel (cycled if shorter). */
  cels: Grid[]
  /** Offset from the anchor (default [0, 0]). */
  at?: [number, number]
  /** 'body' = body grid origin (default); 'head' = the body's head box. */
  anchor?: 'body' | 'head'
  /** Draw behind what is already there (capes, spears held behind). */
  under?: boolean
  /** Only change pixels that currently hold one of these letters. */
  onlyOver?: string
}

/** Swaps letters in what is drawn so far, e.g. pants → shoes on the lowest rows for boots. */
export interface RecolorLayer {
  recolor: Record<string, string>
  /** Inclusive body rows to touch; negative counts up from the bottom row (-1 = feet). */
  rows?: [number, number]
}

export type PartLayer = StampLayer | RecolorLayer

export type PartSlot = 'hair' | 'face' | 'hat' | 'top' | 'bottom' | 'outfit' | 'back' | 'held' | 'head'

export interface PartDef {
  id: string
  label: string
  slot: PartSlot
  /** Bodies this part is drawn for (omit = any). */
  bodies?: BodyId[]
  /** Default roles for letters this part introduces. */
  roles?: RoleTable
  layers: Partial<Record<Facing, PartLayer[]>>
}

export interface CharacterDef {
  /** Short id; the view id becomes builtin-<theme>-<name>. */
  name: string
  label: string
  theme: Theme
  body: BodyId
  parts: PartDef[]
  /** Overrides of role key/label/color per letter. */
  roles?: Record<string, Partial<RoleDef>>
  fps?: number
}

/** Standard letters shared by bodies and parts. */
export const STANDARD_ROLES: RoleTable = {
  s: { key: 'skin', label: 'Skin', color: 12 },
  h: { key: 'hair', label: 'Hair', color: 6 },
  c: { key: 'shirt', label: 'Shirt', color: 1 },
  r: { key: 'shirt', label: 'Shirt', color: 1 },
  p: { key: 'pants', label: 'Pants', color: 8 },
  f: { key: 'shoes', label: 'Shoes', color: 6 },
  k: { key: 'hat', label: 'Hat', color: 4 },
  a: { key: 'accent', label: 'Accent', color: 14 },
  t: { key: 'trim', label: 'Belt', color: 6 },
  m: { key: 'metal', label: 'Metal', color: 7 },
  w: { key: 'wood', label: 'Wood', color: 6 },
  b: { key: 'beard', label: 'Beard', color: 15 },
  e: { key: 'eyes', label: 'Eyes', color: 0 },
}

/** Letters that follow another letter's role unless overridden themselves (sleeves follow the shirt). */
export const ROLE_ALIASES: Record<string, string> = { r: 'c' }

export function roleTableFor(parts: PartDef[], overrides: Record<string, Partial<RoleDef>> = {}): RoleTable {
  const table: RoleTable = { ...STANDARD_ROLES }
  for (const p of parts) Object.assign(table, p.roles)
  for (const [ch, o] of Object.entries(overrides)) {
    const base = table[ch] ?? { key: ch, label: ch, color: 0 }
    table[ch] = { ...base, ...o }
  }
  for (const [ch, target] of Object.entries(ROLE_ALIASES)) {
    const own = overrides[ch] || parts.some((p) => p.roles?.[ch])
    if (!own) table[ch] = table[target]
  }
  return table
}

/** Composite one facing of a body plus parts: one canvas per cel, in body coordinates. */
export function composeCanvases(body: BodyDef, parts: PartDef[], facing: Facing): CharCanvas[] {
  const bf = body.facings[facing]
  return bf.cels.map((g, i) => {
    const cv = new CharCanvas()
    cv.stamp(g, 0, 0)
    for (const part of parts) {
      if (part.bodies && !part.bodies.includes(body.id)) {
        throw new Error(`part ${part.id} does not fit body ${body.id}`)
      }
      for (const layer of part.layers[facing] ?? []) {
        if ('recolor' in layer) {
          const h = g.length
          const [a, b] = (layer.rows ?? [0, -1]).map((r) => (r < 0 ? h + r : r))
          cv.recolor(layer.recolor, a, b)
          continue
        }
        const grid = layer.cels[i % layer.cels.length]
        const [ax, ay] = layer.anchor === 'head' ? bf.head : [0, 0]
        const [dx, dy] = layer.at ?? [0, 0]
        cv.stamp(grid, ax + dx, ay + dy, layer.under, layer.onlyOver)
      }
    }
    return cv
  })
}

/**
 * Columns every loop of a character is cropped to: the body's own width plus
 * anything parts add, over all facings. Every loop then has the same width
 * with the body on the same columns, so turning never shifts it (AGI places
 * a view by its left edge).
 */
function sharedColumns(body: BodyDef, facings: CharCanvas[][]): [number, number] {
  let x0 = 0
  let x1 = Math.max(...FACINGS.map((f) => body.facings[f].cels[0][0].length)) - 1
  for (const cels of facings) {
    for (const cv of cels) {
      const b = cv.bounds()
      if (!b) continue
      x0 = Math.min(x0, b.x0)
      x1 = Math.max(x1, b.x1)
    }
  }
  return [x0, x1]
}

/** Composite every facing, cropped to shared columns (rows are cropped per loop). */
export function composeCharacter(body: BodyDef, parts: PartDef[]): Record<Facing, string[][]> {
  const canvases = FACINGS.map((f) => composeCanvases(body, parts, f))
  const cols = sharedColumns(body, canvases)
  const [right, down, up] = canvases.map((c) => cropShared(c, cols))
  return { right, down, up }
}

/** Loops in AGI order: 0 right, 1 left (mirror of 0), 2 down, 3 up. */
export function characterView(def: CharacterDef, bodies: Record<BodyId, BodyDef>): View {
  const body = bodies[def.body]
  const id = `builtin-${def.theme}-${def.name}`
  const composed = composeCharacter(body, def.parts)
  const grids = FACINGS.map((f) => composed[f])
  const { roles, loops } = resolveLoops(grids, roleTableFor(def.parts, def.roles), id)
  const [right, down, up] = loops
  const viewLoops: Loop[] = [
    { name: 'right', cels: right },
    { name: 'left', mirrorOf: 0, cels: [] },
    { name: 'down', cels: down },
    { name: 'up', cels: up },
  ]
  return {
    id,
    name: def.label,
    theme: def.theme,
    kind: 'character',
    roles,
    colorMap: {},
    loops: viewLoops,
    fps: def.fps ?? 8,
    builtinId: id,
  }
}

/** A character drawn whole (no base body), e.g. a floating ghost. */
export interface CustomCharacterDef {
  name: string
  label: string
  theme: Theme
  roles: RoleTable
  facings: Record<Facing, Grid[]>
  fps?: number
}

export function customCharacterView(def: CustomCharacterDef): View {
  const id = `builtin-${def.theme}-${def.name}`
  const { roles, loops } = resolveLoops(FACINGS.map((f) => def.facings[f]), def.roles, id)
  return {
    id,
    name: def.label,
    theme: def.theme,
    kind: 'character',
    roles,
    colorMap: {},
    loops: [
      { name: 'right', cels: loops[0] },
      { name: 'left', mirrorOf: 0, cels: [] },
      { name: 'down', cels: loops[1] },
      { name: 'up', cels: loops[2] },
    ],
    fps: def.fps ?? 6,
    builtinId: id,
  }
}

/** A prop: one or more loops of ASCII cels (e.g. an 'idle' animation). */
export interface PropDef {
  name: string
  label: string
  theme: Theme
  /** Letters used by the art → recolorable roles. */
  roles: RoleTable
  loops: { name: string; cels: Grid[] }[]
  fps?: number
}

export function propView(def: PropDef): View {
  const id = `builtin-${def.theme}-${def.name}`
  const { roles, loops } = resolveLoops(def.loops.map((l) => l.cels), def.roles, id)
  return {
    id,
    name: def.label,
    theme: def.theme,
    kind: 'prop',
    roles,
    colorMap: {},
    loops: def.loops.map((l, i) => ({ name: l.name, cels: loops[i] })),
    fps: def.fps ?? 6,
    builtinId: id,
  }
}

/** Stamp each overlay (one per cel) onto a copy of `base` at `at`; returns base-sized cels. */
export function overBase(base: Grid, overlays: Grid[], at: [number, number] = [0, 0]): Grid[] {
  const w = base[0].length
  return overlays.map((o) => {
    const cv = new CharCanvas()
    cv.stamp(base, 0, 0)
    cv.stamp(o, at[0], at[1])
    return cv.crop(0, 0, w, base.length)
  })
}
