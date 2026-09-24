/**
 * Renders library elements, starters or sprites to PNG contact sheets so art
 * can be reviewed without the browser.
 *
 *   npx tsx scripts/gallery.ts --theme fantasy --out /tmp/x          # elements of a theme
 *   npx tsx scripts/gallery.ts --id oak --out /tmp/x                 # one element, many seeds
 *   npx tsx scripts/gallery.ts --starters fantasy --out /tmp/x       # room starters
 *   npx tsx scripts/gallery.ts --sprites fantasy --out /tmp/x        # sprite views
 *   npx tsx scripts/gallery.ts --rolls fantasy --out /tmp/x          # generated rooms
 *   add --priority to render the priority/control screen instead of the visual
 */
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { EGA_RGB } from '../src/agi/palette'
import { PIC_H, PIC_W } from '../src/agi/constants'
import { ELEMENTS, getElement } from '../src/library'
import { STARTERS } from '../src/library/starters'
import { renderRoom } from '../src/render/room'
import { elementLayer, newRoom } from '../src/state/factory'
import type { Room } from '../src/state/types'
import type { View } from '../src/sprites/types'
import { resolveCel } from '../src/sprites/render'
import { writePng } from './png-node'

const args = process.argv.slice(2)
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const flag = (name: string) => args.includes(`--${name}`)
const out = arg('out') ?? 'gallery-out'
mkdirSync(out, { recursive: true })
const showPriority = flag('priority')

// Tile = picture drawn with 2:1 wide pixels (320x168) plus a 4px gutter.
const TW = PIC_W * 2
const TH = PIC_H
const GAP = 4

function sheet(rooms: Room[], views: View[], cols: number, file: string) {
  const rows = Math.ceil(rooms.length / cols)
  const w = cols * (TW + GAP) + GAP
  const h = rows * (TH + GAP) + GAP
  const rgb = new Uint8Array(w * h * 3).fill(40)
  rooms.forEach((room, n) => {
    const { visual, priority } = renderRoom(room, views)
    const src = showPriority ? priority : visual
    const ox = GAP + (n % cols) * (TW + GAP)
    const oy = GAP + Math.floor(n / cols) * (TH + GAP)
    for (let y = 0; y < PIC_H; y++) {
      for (let x = 0; x < PIC_W; x++) {
        const c = EGA_RGB[src[y * PIC_W + x] & 15]
        for (let d = 0; d < 2; d++) {
          const o = ((oy + y) * w + ox + x * 2 + d) * 3
          rgb[o] = c[0]
          rgb[o + 1] = c[1]
          rgb[o + 2] = c[2]
        }
      }
    }
  })
  const path = join(out, file)
  writePng(path, w, h, rgb)
  console.log(`${path}  (${rooms.length} tiles)`)
}

/** An element on a plain backdrop that shows its silhouette clearly. */
function roomFor(elementId: string, seed: number, params: Record<string, number | string | boolean> = {}): Room {
  const def = getElement(elementId)!
  const room = newRoom({ name: `${elementId}#${seed}` })
  if (def.span !== 'full') {
    room.layers.push(elementLayer('sky-clear', { seed: 1, y: 167, colorMap: { sky: 10 }, name: 'floor' }))
    room.layers.push(elementLayer('sky-clear', { seed: 1, y: 60, name: 'sky' }))
  }
  room.layers.push(elementLayer(elementId, { seed, params }))
  return room
}

const theme = arg('theme')
const id = arg('id')
const starters = arg('starters')
const sprites = arg('sprites')
const rolls = arg('rolls')

if (id) {
  const def = getElement(id)
  if (!def) throw new Error(`No element ${id}`)
  const rooms = [1, 2, 3, 4, 5, 6].map((s) => roomFor(id, s))
  // parameter extremes
  for (const spec of def.params) {
    if (spec.type === 'int') {
      rooms.push(roomFor(id, 1, { [spec.key]: spec.min }))
      rooms.push(roomFor(id, 1, { [spec.key]: spec.max }))
    } else if (spec.type === 'select') {
      for (const o of spec.options) rooms.push(roomFor(id, 1, { [spec.key]: o.value }))
    } else rooms.push(roomFor(id, 1, { [spec.key]: !spec.default }))
  }
  sheet(rooms, [], 3, `element-${id}${showPriority ? '-pri' : ''}.png`)
} else if (theme) {
  const defs = ELEMENTS.filter((e) => e.themes[0] === theme || (theme === 'all'))
  sheet(defs.map((d) => roomFor(d.id, 7)), [], 4, `theme-${theme}${showPriority ? '-pri' : ''}.png`)
} else if (starters) {
  const list = STARTERS.filter((s) => starters === 'all' || s.theme === starters)
  const rooms = list.map((s) => newRoom({ ...s.build(11), name: s.name }))
  sheet(rooms, [], 2, `starters-${starters}${showPriority ? '-pri' : ''}.png`)
} else if (rolls) {
  const { generateRoom } = await import('../src/generator/recipes')
  const themes = rolls === 'all' ? ['nature', 'fantasy', 'scifi', 'modern', 'spooky'] : [rolls]
  const rooms = themes.flatMap((t) => [1, 2, 3, 4, 5, 6].map((seed) => generateRoom({ theme: t as Room['theme'], seed: seed * 7919 })))
  sheet(rooms, [], 3, `rolls-${rolls}${showPriority ? '-pri' : ''}.png`)
} else if (sprites) {
  // Lazy import so element authors aren't blocked by sprite work.
  const mod = await import('../src/sprites/library/index')
  const views: View[] = mod.BUILTIN_VIEWS.filter((v: View) => sprites === 'all' || v.theme === sprites)
  // Draw every loop/cel of each view, 4x scaled (2:1 wide pixels), on a gray field.
  const S = 3
  const cells: { view: View; loop: number; cel: number }[] = []
  for (const v of views) v.loops.forEach((l, li) => {
    const n = l.mirrorOf !== undefined ? v.loops[l.mirrorOf].cels.length : l.cels.length
    for (let c = 0; c < n; c++) cells.push({ view: v, loop: li, cel: c })
  })
  const maxW = Math.max(8, ...cells.map((c) => resolveCel(c.view, c.loop, c.cel)?.w ?? 0))
  const maxH = Math.max(8, ...cells.map((c) => resolveCel(c.view, c.loop, c.cel)?.h ?? 0))
  const cw = maxW * 2 * S + 6
  const ch = maxH * S + 6
  const cols = 12
  const rows = Math.ceil(cells.length / cols)
  const w = cols * cw
  const h = rows * ch
  const rgb = new Uint8Array(w * h * 3).fill(96)
  cells.forEach((c, n) => {
    const cel = resolveCel(c.view, c.loop, c.cel)!
    const ox = (n % cols) * cw + 3
    const oy = Math.floor(n / cols) * ch + 3 + (maxH - cel.h) * S
    for (let y = 0; y < cel.h; y++) for (let x = 0; x < cel.w; x++) {
      const v = cel.px[y * cel.w + x]
      if (v === 255) continue
      const col = EGA_RGB[v]
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < 2 * S; dx++) {
        const o = ((oy + y * S + dy) * w + ox + x * 2 * S + dx) * 3
        rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2]
      }
    }
  })
  const path = join(out, `sprites-${sprites}.png`)
  writePng(path, w, h, rgb)
  console.log(`${path}  (${cells.length} cels, ${views.length} views)`)
} else {
  console.log('usage: --theme <t|all> | --id <element> | --starters <t|all> | --sprites <t|all>  [--priority] --out <dir>')
}
