import { PIC_W } from '../agi/constants'
import { Raster } from '../agi/raster'
import { mulberry32, type Rng } from '../agi/rng'
import { ELEMENTS, getElement } from '../library'
import { runElement } from '../library/run'
import type { ElementDef } from '../library/types'
import { elementLayer, newRoom, paintLayer, type ElementLayerOpts } from '../state/factory'
import type { PicCommand } from '../agi/commands'
import type { Dir, EdgeInfo, EdgeProfile, ElementLayer, Layer, ParamValue, Room, Theme } from '../state/types'

/** Which themes' elements a room of each theme may draw from (besides named extras). */
const SOURCES: Record<Theme, { themes: Theme[]; extra: string[] }> = {
  nature: { themes: ['nature'], extra: [] },
  fantasy: { themes: ['fantasy', 'nature'], extra: [] },
  scifi: { themes: ['scifi'], extra: ['sky-night', 'sand-dunes', 'rock-cluster', 'boulder'] },
  modern: { themes: ['modern'], extra: ['sky-clear', 'sky-night', 'sky-banded', 'clouds', 'palm', 'bush'] },
  spooky: { themes: ['spooky'], extra: ['sky-night', 'sky-storm', 'dead-tree', 'treeline', 'reeds', 'boulder'] },
}

const WALL_TAG = /\b(door|window|hatch|elevator|blinds|viewport|fireplace|bookshelf|shelf|torch|sconce|pipes|ladder|cobweb|painting|portrait|mirror|clock)\b/
const BUILDING_TAG = /\b(house|cottage|hut|building|mansion|manor|crypt|mausoleum|castle|gate|gatehouse|shop|store|bar|tower|ship|pod)\b/
const has = (e: ElementDef, re: RegExp) => (e.tags ?? []).some((t) => re.test(t)) || re.test(e.id)

function pool(theme: Theme, pred: (e: ElementDef) => boolean): ElementDef[] {
  const src = SOURCES[theme]
  return ELEMENTS.filter((e) => (src.themes.some((t) => e.themes.includes(t)) || src.extra.includes(e.id)) && pred(e))
}

/** Prefer elements native to the theme, fall back to borrowed ones. */
function pick(rng: Rng, theme: Theme, pred: (e: ElementDef) => boolean): ElementDef | undefined {
  const all = pool(theme, pred)
  const native = all.filter((e) => e.themes.includes(theme))
  const list = native.length && rng.chance(0.75) ? native : all
  return list.length ? rng.pick(list) : undefined
}

const isSky = (e: ElementDef) => e.category === 'sky' && e.span === 'full' && !has(e, /\bfog\b/)
const isBackdrop = (e: ElementDef) => e.category === 'backdrop' && e.span === 'full' && !has(e, /\b(sea|ocean|fog)\b/)
const isGround = (e: ElementDef) => e.category === 'ground' && e.span === 'full' && !has(e, /\bpath\b/)
const isShell = (e: ElementDef) => e.category === 'interior' && e.span === 'full'
const isTree = (e: ElementDef) => e.category === 'flora' && has(e, /\btree\b/) && !has(e, /\bpalm\b/)
/** Small things to scatter outdoors: plants, rocks, and props meant for outside. */
const isSmallOutdoor = (e: ElementDef) =>
  !e.span &&
  e.defaultPriority === 'baseline' &&
  !has(e, /\b(marsh|swamp|reeds)\b/) &&
  ((e.category === 'flora' && !has(e, /\btree\b/)) ||
    (e.category === 'rock' && !has(e, /\b(cliff|cave|mesa)\b/)) ||
    (e.category === 'prop' && has(e, /\b(street|sidewalk|outdoor|garden|grave|graveyard|pumpkin|alien|jungle)\b/) && !has(e, WALL_TAG) && !has(e, /\b(car|vehicle)\b/)))
/** Tall things that frame the sides of outdoor rooms. */
const isBig = (e: ElementDef) => !e.span && (isTree(e) || has(e, /\b(spire|pinnacle|hoodoo)\b/))
const isLandmark = (e: ElementDef) =>
  !e.span && (e.category === 'structure' || has(e, /\b(cave|waterfall|ship|pod)\b/)) && !has(e, WALL_TAG) && !has(e, /\b(fence|stairs|wall|forcefield|force field|ladder|elevator|viewport)\b/)
const isWallItem = (e: ElementDef) =>
  !e.span && (e.category === 'structure' || e.category === 'furniture' || e.category === 'prop') && has(e, WALL_TAG) && !has(e, BUILDING_TAG)
const isFloorItem = (e: ElementDef) =>
  !e.span &&
  (e.category === 'furniture' || e.category === 'prop') &&
  !has(e, WALL_TAG) &&
  !has(e, BUILDING_TAG) &&
  !has(e, /\b(street|sidewalk|road|parking|hydrant|outdoor|antenna|radar|grave|graveyard|cemetery|headstone|tombstone)\b/) &&
  e.defaultPriority === 'baseline'

export interface GenOptions {
  theme: Theme
  seed: number
  recipe?: RecipeId
  /** Force exits open (true) or closed (false). */
  exits?: Partial<Record<Dir, boolean>>
  /** Match this edge of a neighbor: `dir` is the side of the NEW room that touches it. */
  match?: { dir: Dir; edge: EdgeInfo; profile: EdgeProfile }
}

export type RecipeId = 'path' | 'clearing' | 'landmark' | 'interior' | 'street'

export const RECIPES: Record<Theme, RecipeId[]> = {
  nature: ['path', 'path', 'clearing', 'landmark'],
  fantasy: ['path', 'clearing', 'landmark', 'landmark', 'interior'],
  scifi: ['path', 'landmark', 'interior', 'interior'],
  modern: ['street', 'street', 'interior'],
  spooky: ['path', 'landmark', 'landmark', 'interior'],
}

const NAMES: Record<RecipeId, string[]> = {
  path: ['Crossroads', 'Winding path', 'Forest trail', 'Open country', 'Lonely road'],
  clearing: ['Clearing', 'Glade', 'Meadow', 'Quiet hollow'],
  landmark: ['Landmark', 'Old place', 'Destination', 'Outpost'],
  interior: ['Inside', 'Chamber', 'Room', 'Hall'],
  street: ['Street', 'Downtown', 'Main street', 'Avenue'],
}

type Spec = ElementLayerOpts & { id: string }

type Box = { x0: number; y0: number; x1: number; y1: number }

class Builder {
  specs: Spec[] = []
  boxes: Box[] = []
  /** A room with the same horizon/perspective, used to measure elements. */
  probe: Room = newRoom()
  constructor(readonly rng: Rng) {}
  add(def: ElementDef | undefined, opts: ElementLayerOpts = {}): Spec | null {
    if (!def) return null
    const spec = { id: def.id, seed: this.rng.int(1, 1e9), ...opts }
    this.specs.push(spec)
    return spec
  }
  /** Pixel bounds of an element placed with these options. */
  measure(def: ElementDef, opts: ElementLayerOpts): Box | null {
    const layer = elementLayer(def.id, { seed: 1, ...opts })
    const r = new Raster().run(runElement(def, layer, this.probe))
    return r.bbox.x1 < 0 ? null : { ...r.bbox }
  }
  /** Add only if it doesn't overlap anything placed so far by more than `slack` of the smaller box. */
  place(def: ElementDef, opts: ElementLayerOpts, slack = 0.1): Spec | null {
    const box = this.measure(def, opts)
    if (!box) return null
    if (this.boxes.some((b) => overlap(b, box) > slack)) return null
    const onScreen = (Math.min(box.x1, PIC_W - 1) - Math.max(box.x0, 0) + 1) / (box.x1 - box.x0 + 1)
    if (onScreen < 0.5) return null
    this.boxes.push(box)
    return this.add(def, opts)
  }
  layers(): Layer[] {
    return this.specs.filter((s) => getElement(s.id)).map(({ id, ...o }) => elementLayer(id, o))
  }
}

/** Overlap area as a fraction of the smaller box. */
function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) + 1
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) + 1
  if (w <= 0 || h <= 0) return 0
  const area = (q: Box) => (q.x1 - q.x0 + 1) * (q.y1 - q.y0 + 1)
  return (w * h) / Math.min(area(a), area(b))
}

function paramsFor(def: ElementDef, rng: Rng, fixed: Record<string, ParamValue> = {}): Record<string, ParamValue> {
  // Light randomization inside the middle of each range keeps results tasteful.
  const out: Record<string, ParamValue> = {}
  for (const s of def.params) {
    if (s.key in fixed) continue
    if (s.type === 'int' && rng.chance(0.5)) {
      const span = s.max - s.min
      out[s.key] = Math.round(Math.max(s.min, Math.min(s.max, s.default + rng.range(-0.2, 0.2) * span)))
    }
  }
  return { ...out, ...fixed }
}

/** Keep-out zones so props don't block paths and exits. */
interface Lane {
  at(y: number): { x: number; half: number } | null
}

function nsLane(topX: number, bottomX: number, topW: number, bottomW: number, bend: number, top: number): Lane {
  return {
    at(y) {
      if (y < top) return null
      const t = (y - top) / Math.max(1, 167 - top)
      return { x: topX + (bottomX - topX) * t + bend * Math.sin(Math.PI * t), half: (topW + (bottomW - topW) * t) / 2 }
    },
  }
}

function scatter(b: Builder, theme: Theme, top: number, n: number, lanes: Lane[], ewY: number | null, big: number): void {
  const rng = b.rng
  const onLane = (x: number, y: number, gap: number) => {
    for (const l of lanes) {
      const a = l.at(y)
      if (a && Math.abs(x - a.x) < a.half + gap) return true
    }
    return ewY !== null && Math.abs(y - ewY) < 10 + gap / 2
  }
  const bigPool = pool(theme, isBig)
  const smallPool = pool(theme, isSmallOutdoor)
  let want = big && bigPool.length ? big : 0
  let placed = 0
  for (let tries = 0; placed < n && tries < 300; tries++) {
    const wantBig = want > 0
    const def = wantBig ? pick(rng, theme, isBig) : smallPool.length ? pick(rng, theme, isSmallOutdoor) : undefined
    if (!def) break
    // big things frame the sides, small things fill the ground
    const x = wantBig ? (rng.chance(0.5) ? rng.int(4, 40) : rng.int(120, 156)) : rng.int(8, 152)
    const y = rng.int(top + 10, 164)
    if (onLane(x, y, wantBig ? 12 : 6)) continue
    if (!b.place(def, { x, y, flipX: rng.chance(0.5), params: paramsFor(def, rng) }, wantBig ? 0.25 : 0.1)) continue
    placed++
    if (wantBig) want--
  }
}

/** Recolor borrowed elements so they suit the theme (e.g. dead, dark trees for spooky rooms). */
const THEME_TINT: Partial<Record<Theme, Record<number, number>>> = {
  spooky: { 10: 8, 2: 0, 3: 8, 9: 8, 11: 7 },
}
function tint(def: ElementDef | undefined, theme: Theme): Record<string, number> | undefined {
  const map = THEME_TINT[theme]
  if (!def || !map || def.themes[0] === theme) return undefined
  const out: Record<string, number> = {}
  for (const [key, role] of Object.entries(def.roles)) if (map[role.color] !== undefined) out[key] = map[role.color]
  return out
}

function outdoorBase(b: Builder, theme: Theme, top: number, match?: GenOptions['match']): EdgeProfile['look'] {
  const rng = b.rng
  const look = match?.profile.look
  const sky = (look?.sky ? getElement(look.sky.id) : pick(rng, theme, isSky)) ?? getElement('sky-clear')
  b.add(sky, { y: top, params: look?.sky?.params ?? (sky ? paramsFor(sky, rng) : {}), colorMap: look?.sky?.colorMap })
  if (!look && sky?.id === 'sky-clear' && rng.chance(0.6)) {
    for (let i = rng.int(1, 3); i > 0; i--) b.add(getElement('clouds'), { x: rng.int(10, 150), y: rng.int(10, Math.max(12, top - 14)) })
  }
  const backdrop = look ? (look.backdrop ? getElement(look.backdrop.id) : undefined) : rng.chance(0.8) ? pick(rng, theme, isBackdrop) : undefined
  b.add(backdrop, { y: top, params: look?.backdrop?.params ?? (backdrop ? paramsFor(backdrop, rng) : {}), colorMap: look?.backdrop?.colorMap ?? tint(backdrop, theme) })
  const grass = getElement('grass-field')
  const ground = look?.ground
    ? getElement(look.ground.id)
    : (theme === 'nature' || theme === 'fantasy') && grass && rng.chance(0.75)
      ? grass
      : (pick(rng, theme, isGround) ?? grass)
  // grounds with their own built-in path leave the paths to the generator
  const groundParams = look?.ground?.params ?? (ground?.params.some((s) => s.key === 'path' && s.type === 'select') ? { path: 'none' } : undefined)
  b.add(ground, { y: top, params: groundParams, colorMap: look?.ground?.colorMap })
  const spec = (d: ElementDef | undefined) => {
    if (!d) return undefined
    const s = b.specs.find((x) => x.id === d.id)
    return s ? { id: d.id, params: s.params ?? {}, colorMap: s.colorMap ?? {} } : undefined
  }
  return { sky: spec(sky), backdrop: spec(backdrop), ground: spec(ground) }
}

function chooseExits(rng: Rng, opts: GenOptions): Record<Dir, boolean> {
  const e: Record<Dir, boolean> = { n: rng.chance(0.5), s: rng.chance(0.6), e: rng.chance(0.6), w: rng.chance(0.6) }
  Object.assign(e, opts.exits)
  if (opts.match) e[opts.match.dir] = !!opts.match.edge.path || !opts.match.edge.blocked
  if (!e.n && !e.s && !e.e && !e.w) e.s = true
  return e
}

function pathRoom(b: Builder, opts: GenOptions, recipe: RecipeId): { profile: EdgeProfile; horizon: number } {
  const rng = b.rng
  const top = opts.match?.profile.horizon ?? rng.int(54, 72)
  b.probe = newRoom({ horizon: top + 2 })
  const look = outdoorBase(b, opts.theme, top, opts.match)
  const exits = chooseExits(rng, opts)
  const edges: EdgeProfile['edges'] = {}
  const lanes: Lane[] = []
  const m = opts.match
  const pathDef = getElement('path')
  const pathEw = getElement('path-ew')
  const pathColors: Record<string, number> | undefined = opts.theme === 'scifi' ? { dirt: 8, edge: 8 } : opts.theme === 'spooky' ? { dirt: 8, edge: 8 } : undefined

  // North–south path
  if ((exits.n || exits.s) && pathDef) {
    const topX = m?.dir === 'n' && m.edge.path !== undefined ? m.edge.path : rng.int(50, 110)
    const bottomX = m?.dir === 's' && m.edge.path !== undefined ? m.edge.path : rng.int(55, 105)
    const topW = rng.int(6, 10)
    const bottomW = rng.int(28, 40)
    const bend = rng.int(-18, 18)
    b.add(pathDef, { y: top, params: { topX, bottomX, topW, bottomW, bend }, colorMap: pathColors })
    lanes.push(nsLane(topX, bottomX, topW, bottomW, bend, top))
    edges.n = { path: topX, pathWidth: topW }
    edges.s = { path: bottomX, pathWidth: bottomW }
  }
  // East–west path
  let ewY: number | null = null
  if ((exits.e || exits.w) && pathEw) {
    ewY = m && (m.dir === 'e' || m.dir === 'w') && m.edge.path !== undefined ? m.edge.path : rng.int(top + 30, 150)
    const width = Math.round(6 + ((ewY - top) / (167 - top)) * 12)
    const join = lanes[0]?.at(ewY)?.x ?? rng.int(60, 100)
    b.add(pathEw, { y: ewY, params: { west: exits.w, east: exits.e, joinX: Math.round(join), width, wobble: rng.int(1, 4) }, colorMap: pathColors })
    if (exits.e) edges.e = { path: ewY, pathWidth: width }
    if (exits.w) edges.w = { path: ewY, pathWidth: width }
  }
  for (const d of ['n', 's', 'e', 'w'] as Dir[]) if (!edges[d]) edges[d] = { blocked: !exits[d] }

  if (recipe === 'clearing') {
    const clearing = getElement('clearing')
    if (clearing) b.add(clearing, { x: rng.int(60, 100), y: rng.int(top + 40, 140), params: { width: rng.int(30, 60) } })
    scatter(b, opts.theme, top, rng.int(6, 10), lanes, ewY, rng.int(4, 6))
  } else if (recipe === 'landmark') {
    const lm = pick(rng, opts.theme, isLandmark)
    const lx = lanes.length ? (rng.chance(0.5) ? rng.int(30, 46) : rng.int(114, 130)) : rng.int(50, 110)
    if (lm) b.place(lm, { x: lx, y: rng.int(top + 22, top + 42), params: paramsFor(lm, rng) }, 1)
    scatter(b, opts.theme, top, rng.int(3, 6), lanes, ewY, 2)
  } else {
    scatter(b, opts.theme, top, rng.int(5, 9), lanes, ewY, rng.int(2, 4))
  }
  // fog on top for spooky outdoor scenes
  if (opts.theme === 'spooky') {
    const fog = ELEMENTS.find((e) => e.themes.includes('spooky') && has(e, /\bfog\b/))
    if (fog && rng.chance(0.6)) b.add(fog, { y: top + rng.int(4, 16) })
  }
  return { horizon: top + 2, profile: { horizon: top, ground: look?.ground?.id ?? '', recipe, edges, look } }
}

function streetRoom(b: Builder, opts: GenOptions): { profile: EdgeProfile; horizon: number } {
  const rng = b.rng
  const top = opts.match?.profile.horizon ?? rng.int(70, 84)
  b.probe = newRoom({ horizon: top + 4 })
  const look = opts.match?.profile.look
  // sky and skyline down to the back of the far sidewalk
  const sky = (look?.sky ? getElement(look.sky.id) : pick(rng, 'modern', isSky)) ?? getElement('sky-clear')
  b.add(sky, { y: top, params: look?.sky?.params ?? (sky ? paramsFor(sky, rng) : {}), colorMap: look?.sky?.colorMap })
  const skyline = look ? (look.backdrop ? getElement(look.backdrop.id) : undefined) : pick(rng, 'modern', isBackdrop)
  b.add(skyline, { y: top, params: look?.backdrop?.params, colorMap: look?.backdrop?.colorMap })
  // street: the far curb is the anchor row; far sidewalk above it, near sidewalk below
  const farWalk = 8
  const curb = top + farWalk + 2
  const depth = rng.int(34, 44)
  const street = getElement('modern-street') ?? pick(rng, 'modern', isGround)
  b.add(street, { y: curb, params: look?.ground?.params ?? { street: depth, farWalk }, colorMap: look?.ground?.colorMap })
  // a row of buildings standing on the back of the far sidewalk, butted together
  const buildings = pool('modern', (e) => e.category === 'structure' && has(e, /\b(building|shop|store|bar)\b/))
  let x = rng.int(-12, 4)
  const doors: number[] = []
  for (let guard = 0; x < 164 && buildings.length && guard < 8; guard++) {
    const def = rng.pick(buildings)
    const params = paramsFor(def, rng)
    const probe = b.measure(def, { x: 80, y: top + 2, params })
    const w = probe ? probe.x1 - probe.x0 + 1 : 60
    const cx = x + w / 2
    b.add(def, { x: Math.round(cx), y: top + 2, params })
    doors.push(Math.round(cx))
    x += w
  }
  // street furniture on the far sidewalk, spaced apart and clear of doors
  const props = pool('modern', (e) => !e.span && e.category === 'prop' && has(e, /\b(street|sidewalk|light|lamp)\b/) && !has(e, /\b(car|vehicle)\b/))
  const used: number[] = []
  for (let i = rng.int(2, 4), tries = 0; i > 0 && props.length && tries < 40; tries++) {
    const px = rng.int(8, 152)
    if (used.some((u) => Math.abs(u - px) < 14) || doors.some((d) => Math.abs(d - px) < 10)) continue
    used.push(px)
    b.add(rng.pick(props), { x: px, y: curb - 2 })
    i--
  }
  const car = ELEMENTS.find((e) => has(e, /\bcar\b/) && e.themes.includes('modern'))
  if (car && rng.chance(0.7)) b.add(car, { x: rng.int(30, 130), y: curb + Math.round(depth * 0.55), flipX: rng.chance(0.5), params: paramsFor(car, rng) })
  const edges: EdgeProfile['edges'] = { n: { blocked: true }, s: { blocked: true }, e: { path: curb - 4 }, w: { path: curb - 4 } }
  const spec = (d: ElementDef | undefined, params?: Record<string, ParamValue>) => (d ? { id: d.id, params: params ?? {}, colorMap: {} } : undefined)
  return {
    horizon: top + 4,
    profile: { horizon: top, ground: street?.id ?? '', recipe: 'street', edges, look: look ?? { sky: spec(sky), backdrop: spec(skyline), ground: spec(street, { street: depth, farWalk }) } },
  }
}

/** Where the shell's back wall is, and which parts of it are doorways (from its control lines). */
function backWall(b: Builder, shell: ElementDef, opts: ElementLayerOpts, seam: number): { x0: number; x1: number; doors: number[] } {
  const layer = elementLayer(shell.id, { seed: 1, ...opts })
  const r = new Raster().run(runElement(shell, layer, b.probe))
  let x0 = PIC_W
  let x1 = -1
  const doors: number[] = []
  for (let y = seam - 3; y <= seam + 3; y++) {
    for (let x = 0; x < PIC_W; x++) {
      const p = r.priority[y * PIC_W + x]
      if (p === 0) {
        x0 = Math.min(x0, x)
        x1 = Math.max(x1, x)
      }
      if (p === 2) doors.push(x)
    }
  }
  if (x1 < 0) return { x0: 24, x1: 136, doors }
  return { x0: Math.max(x0, 8), x1: Math.min(x1, 152), doors }
}

function interiorRoom(b: Builder, opts: GenOptions): { profile: EdgeProfile; horizon: number } {
  const rng = b.rng
  const shell = pick(rng, opts.theme, isShell)
  const seam = shell?.place.y ?? 100
  b.probe = newRoom({ horizon: seam + 2 })
  const shellParams = shell ? paramsFor(shell, rng) : {}
  b.add(shell, { y: seam, params: shellParams })
  const wall = shell ? backWall(b, shell, { y: seam, params: shellParams }, seam) : { x0: 24, x1: 136, doors: [] }
  // keep the shell's own doorways clear
  for (const d of wall.doors) b.boxes.push({ x0: d - 2, y0: seam - 44, x1: d + 2, y1: seam })

  const native = (e: ElementDef) => e.themes.includes(opts.theme)
  const wallItems = pool(opts.theme, (e) => isWallItem(e) && native(e) && !has(e, /\bcobweb\b/))
  const floorItems = pool(opts.theme, (e) => isFloorItem(e) && native(e) && !has(e, /\bcobweb\b/))
  const take = (list: ElementDef[]) => (list.length ? list.splice(rng.int(0, list.length - 1), 1)[0] : undefined)

  // things on the back wall, within its span
  const span = wall.x1 - wall.x0
  for (let i = 0, n = rng.int(1, 3); i < n; i++) {
    const def = take(wallItems)
    if (!def) break
    for (let t = 0; t < 8; t++) {
      const x = wall.x0 + 10 + rng.int(0, Math.max(0, span - 20))
      const y = def.place.y < seam - 10 ? def.place.y : seam
      if (b.place(def, { x, y, params: paramsFor(def, rng) }, 0.05)) break
    }
  }
  // furniture standing on the floor
  for (let i = 0, n = rng.int(2, 4); i < n; i++) {
    const def = take(floorItems)
    if (!def) break
    for (let t = 0; t < 10; t++) {
      if (b.place(def, { x: rng.int(20, 140), y: rng.int(seam + 18, 158), flipX: rng.chance(0.5), params: paramsFor(def, rng) }, 0.08)) break
    }
  }
  // cobwebs only in the top corners
  const web = ELEMENTS.find((e) => has(e, /\bcobweb\b/) && native(e))
  if (web && rng.chance(0.5)) {
    const right = rng.chance(0.5)
    b.add(web, right ? { x: 159, y: 0, flipX: true } : { x: 0, y: 0 })
  }
  const blocked = { blocked: true }
  return { horizon: seam + 2, profile: { horizon: seam, ground: shell?.id ?? '', recipe: 'interior', edges: { n: blocked, s: blocked, e: blocked, w: blocked } } }
}

/** Sort non-full layers by their base row so nearer things draw later. */
function depthSort(layers: Layer[]): Layer[] {
  const full = (l: Layer) => l.kind === 'element' && getElement(l.elementId)?.span === 'full'
  const back = layers.filter((l) => full(l) || (l.kind === 'element' && getElement(l.elementId)?.defaultPriority === 'rows'))
  const isFog = (l: Layer) => l.kind === 'element' && /fog/.test(l.elementId)
  const rest = layers.filter((l) => !back.includes(l)) as ElementLayer[]
  rest.sort((a, b) => a.y - b.y)
  return [...back.filter((l) => !isFog(l)), ...rest, ...back.filter(isFog)]
}

/** Control walls along edges that lead nowhere, so the character can't walk off them. */
function edgeWalls(profile: EdgeProfile, horizon: number): Layer | null {
  const cmds: PicCommand[] = [{ op: 'priority', value: 0 }]
  const e = profile.edges
  if (e.w?.blocked) cmds.push({ op: 'line', pts: [[0, horizon + 1], [0, 167]] })
  if (e.e?.blocked) cmds.push({ op: 'line', pts: [[159, horizon + 1], [159, 167]] })
  if (e.s?.blocked) cmds.push({ op: 'line', pts: [[0, 167], [159, 167]] })
  if (e.n?.blocked) cmds.push({ op: 'line', pts: [[0, horizon + 1], [159, horizon + 1]] })
  if (cmds.length === 1) return null
  const layer = paintLayer('Edge walls')
  layer.commands = cmds
  layer.locked = true
  return layer
}

export function generateRoom(opts: GenOptions): Room {
  const rng = mulberry32(opts.seed)
  const recipe = opts.match?.profile.recipe === 'interior' ? 'path' : (opts.recipe ?? (opts.match ? (opts.theme === 'modern' ? 'street' : rng.pick(['path', 'path', 'clearing', 'landmark'] as RecipeId[])) : rng.pick(RECIPES[opts.theme])))
  const b = new Builder(rng)
  const hasShell = pool(opts.theme, isShell).some((e) => e.themes.includes(opts.theme))
  const out =
    recipe === 'interior' && hasShell ? interiorRoom(b, opts)
    : recipe === 'street' ? streetRoom(b, opts)
    : pathRoom(b, opts, recipe === 'interior' ? 'path' : recipe)
  const layers = depthSort(b.layers())
  const walls = recipe === 'interior' ? null : edgeWalls(out.profile, out.horizon)
  if (walls) layers.push(walls)
  return newRoom({
    name: rng.pick(NAMES[recipe]),
    theme: opts.theme,
    horizon: out.horizon,
    layers,
    edgeProfile: out.profile,
  })
}
