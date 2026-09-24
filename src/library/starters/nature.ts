import type { Pt } from '../../agi/commands'
import { mulberry32 } from '../../agi/rng'
import { elementLayer as E, paintLayer } from '../../state/factory'
import type { PaintLayer } from '../../state/types'
import type { RoomStarter } from './types'

/** A paint layer holding only control lines (0 wall, 1 conditional, 2 trigger, 3 water). */
function control(name: string, lines: Pt[][], kind = 0): PaintLayer {
  const l = paintLayer(name)
  l.commands = [{ op: 'visual', color: null }, { op: 'priority', value: kind }, ...lines.map((pts) => ({ op: 'line' as const, pts }))]
  return l
}

/** Per-starter variation: fresh element seeds and small nudges from one room seed. */
function vary(seed: number) {
  const r = mulberry32(seed)
  return { s: () => r.int(1, 1e9), j: (n: number) => r.int(-n, n), pick: r.pick, chance: r.chance }
}

export const natureStarters: RoomStarter[] = [
  {
    id: 'starter-nature-mountain-pass',
    name: 'Mountain pass',
    theme: 'nature',
    description: 'A trail climbing between two cliffs toward snowy peaks.',
    build(seed) {
      const v = vary(seed)
      const top = 66
      return {
        name: 'Mountain pass',
        theme: 'nature',
        horizon: top + 2,
        layers: [
          E('sky-clear', { y: top, seed: v.s() }),
          E('clouds', { x: 36 + v.j(10), y: 16, seed: v.s(), params: { width: 20 } }),
          E('clouds', { x: 118 + v.j(10), y: 28, seed: v.s(), params: { width: 14, puffs: 3 } }),
          E('mountains', { y: top, seed: v.s(), params: { height: 52 + v.j(6), peaks: 5, snow: true } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 60, patches: 2 } }),
          E('path', { y: top, seed: v.s(), params: { topX: 86 + v.j(4), bottomX: 80, topW: 5, bottomW: 38, bend: 12 + v.j(4), pebbles: 18 } }),
          E('rock-cluster', { x: 60, y: 84, seed: v.s(), params: { count: 3, size: 6 } }),
          E('pine', { x: 44 + v.j(3), y: 96, seed: v.s(), params: { height: 46, width: 11 } }),
          E('pine', { x: 122 + v.j(3), y: 92, seed: v.s(), params: { height: 40, width: 10 } }),
          E('cliff', { x: 14, y: 156, seed: v.s(), params: { width: 26, height: 100, strata: 6, cracks: 4 } }),
          E('cliff', { x: 150, y: 146, seed: v.s(), flipX: true, params: { width: 24, height: 82, strata: 5 } }),
          E('boulder', { x: 116 + v.j(4), y: 128, seed: v.s(), params: { width: 10, height: 14 } }),
          E('rock-cluster', { x: 48 + v.j(4), y: 150, seed: v.s(), params: { count: 4, size: 8, spread: 18 } }),
          E('pine', { x: 138, y: 166, seed: v.s(), params: { height: 70, width: 16 } }),
          control('Cliff walls', [[[40, 155], [33, 68]], [[126, 145], [133, 68]]]),
        ],
      }
    },
  },
  {
    id: 'starter-nature-beach-cove',
    name: 'Beach cove',
    theme: 'nature',
    description: 'A sandy cove under palms, with surf rolling in from the open sea.',
    build(seed) {
      const v = vary(seed)
      const sea = 58
      return {
        name: 'Beach cove',
        theme: 'nature',
        horizon: sea + 2,
        layers: [
          E('sky-clear', { y: sea, seed: v.s(), params: { sun: true, sunX: 96 + v.j(20), sunY: 14 } }),
          E('clouds', { x: 40 + v.j(12), y: 20, seed: v.s(), params: { width: 18 } }),
          E('beach', { y: 104 + v.j(3), seed: v.s(), params: { seaY: sea, wobble: 4, waves: 55, foam: true } }),
          E('cliff', { x: 150, y: 114, seed: v.s(), flipX: true, params: { width: 26, height: 62, strata: 5, grass: true } }),
          E('rock-cluster', { x: 122, y: 116, seed: v.s(), params: { count: 4, size: 7, spread: 10 } }),
          E('boulder', { x: 96 + v.j(10), y: 84, seed: v.s(), params: { width: 6, height: 7 } }),
          E('palm', { x: 70, y: 118, seed: v.s(), flipX: true, params: { height: 50, lean: 8 } }),
          E('bush', { x: 80, y: 120, seed: v.s(), params: { width: 7, height: 8 } }),
          E('stump-log', { x: 92 + v.j(8), y: 140, seed: v.s(), params: { kind: 'log', size: 5, length: 24 } }),
          E('rock-cluster', { x: 136 + v.j(4), y: 156, seed: v.s(), params: { count: 3, size: 7, spread: 10 } }),
          E('palm', { x: 16, y: 166, seed: v.s(), params: { height: 100, lean: 18, fronds: 8 } }),
          E('bush', { x: 150, y: 166, seed: v.s(), params: { width: 14, height: 16 } }),
          control('Headland wall', [[[124, 113], [128, sea + 2]]]),
        ],
      }
    },
  },
  {
    id: 'starter-nature-forest-crossroads',
    name: 'Forest crossroads',
    theme: 'nature',
    description: 'Two woodland trails meet at a signpost under tall trees.',
    build(seed) {
      const v = vary(seed)
      const top = 62
      const ewY = 116 + v.j(4)
      return {
        name: 'Forest crossroads',
        theme: 'nature',
        horizon: top + 2,
        layers: [
          E('sky-clear', { y: top, seed: v.s() }),
          E('clouds', { x: 80 + v.j(30), y: 18, seed: v.s(), params: { width: 16 } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 30, kind: 'mixed', rows: 2, size: 8 } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 70, patches: 3 } }),
          E('path', { y: top, seed: v.s(), params: { topX: 78 + v.j(6), bottomX: 84, topW: 6, bottomW: 34, bend: -8 + v.j(4), pebbles: 12 } }),
          E('path-ew', { y: ewY, seed: v.s(), params: { width: 14, wobble: 3, joinX: 82 } }),
          E('pine', { x: 30, y: 90, seed: v.s(), params: { height: 44, width: 10 } }),
          E('oak', { x: 126 + v.j(3), y: 94, seed: v.s(), params: { height: 46, width: 13 } }),
          E('bush', { x: 52, y: 100, seed: v.s(), params: { width: 8, height: 10 } }),
          E('stump-log', { x: 120, y: 104, seed: v.s(), params: { kind: 'stump', size: 5 } }),
          E('fantasy-signpost', { x: 108, y: ewY - 10, seed: v.s(), params: { height: 34, boards: 2 } }),
          E('oak', { x: 10, y: 160, seed: v.s(), params: { height: 96, width: 22, trunk: 5 } }),
          E('pine', { x: 150, y: 164, seed: v.s(), params: { height: 100, width: 20, tiers: 5 } }),
          E('flowers', { x: 40 + v.j(6), y: 146, seed: v.s(), params: { width: 14, count: 20 } }),
          E('bush', { x: 124, y: 150, seed: v.s(), params: { width: 12, height: 14, berries: v.chance(0.5) } }),
        ],
      }
    },
  },
  {
    id: 'starter-nature-riverside-meadow',
    name: 'Riverside meadow',
    theme: 'nature',
    description: 'A flowery meadow beside a winding river under rolling hills.',
    build(seed) {
      const v = vary(seed)
      const top = 64
      return {
        name: 'Riverside meadow',
        theme: 'nature',
        horizon: top + 2,
        layers: [
          E('sky-clear', { y: top, seed: v.s(), params: { sun: true, sunX: 130 + v.j(10), sunY: 12 } }),
          E('clouds', { x: 50 + v.j(16), y: 22, seed: v.s(), params: { width: 22 } }),
          E('hills', { y: top, seed: v.s(), params: { ranges: 2, height: 26, humps: 3, trees: 8 } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 60, flowers: 30 } }),
          E('river', { y: top, seed: v.s(), params: { dir: 'ns', x: 34 + v.j(4), width: 40, wobble: 10, ripples: 20 } }),
          E('path-ew', { y: 130 + v.j(4), seed: v.s(), params: { west: false, east: true, joinX: 64, width: 12, wobble: 2 } }),
          E('reeds', { x: 62, y: 100, seed: v.s(), params: { count: 8, height: 16, spread: 6 } }),
          E('oak', { x: 118 + v.j(4), y: 102, seed: v.s(), params: { height: 52, width: 15 } }),
          E('flowers', { x: 96, y: 112, seed: v.s(), params: { width: 18, depth: 5, count: 26, colors: 3 } }),
          E('bush', { x: 146, y: 110, seed: v.s(), params: { width: 10, height: 12 } }),
          E('boulder', { x: 88, y: 160, seed: v.s(), params: { width: 8, height: 9 } }),
          E('reeds', { x: 70, y: 158, seed: v.s(), params: { count: 12, height: 24, spread: 8 } }),
          E('flowers', { x: 128 + v.j(6), y: 156, seed: v.s(), params: { width: 20, depth: 7, count: 34, colors: 3 } }),
          E('oak', { x: 156, y: 166, seed: v.s(), flipX: true, params: { height: 90, width: 20, trunk: 5 } }),
        ],
      }
    },
  },
  {
    id: 'starter-nature-waterfall-glade',
    name: 'Waterfall glade',
    theme: 'nature',
    description: 'A hidden glade where a waterfall spills into a pool and stream.',
    build(seed) {
      const v = vary(seed)
      const top = 60
      const fallY = 100
      return {
        name: 'Waterfall glade',
        theme: 'nature',
        horizon: fallY + 2,
        layers: [
          E('sky-clear', { y: top, seed: v.s() }),
          E('clouds', { x: 30 + v.j(10), y: 14, seed: v.s(), params: { width: 16, puffs: 3 } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 24, kind: 'pine', size: 6 } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 60, patches: 2 } }),
          E('cliff', { x: 80, y: fallY, seed: v.s(), params: { width: 58, height: 52, strata: 5, cracks: 5 } }),
          E('river', { y: fallY + 4, seed: v.s(), params: { dir: 'ns', x: 72 + v.j(4), width: 30, wobble: 6, ripples: 18 } }),
          E('waterfall', { x: 80, y: fallY + 2, seed: v.s(), params: { height: 48, width: 12, rocks: false } }),
          E('pine', { x: 18, y: 104, seed: v.s(), params: { height: 58, width: 12 } }),
          E('pine', { x: 142, y: 100, seed: v.s(), params: { height: 52, width: 11 } }),
          E('reeds', { x: 50, y: 122, seed: v.s(), params: { count: 10, height: 18, spread: 7 } }),
          E('rock-cluster', { x: 106, y: 120, seed: v.s(), params: { count: 4, size: 7, spread: 12 } }),
          E('flowers', { x: 128 + v.j(6), y: 140, seed: v.s(), params: { width: 16, count: 24, colors: 2 } }),
          E('stump-log', { x: 30 + v.j(4), y: 144, seed: v.s(), params: { kind: 'log', length: 26, moss: true } }),
          E('oak', { x: 4, y: 166, seed: v.s(), params: { height: 100, width: 22, trunk: 5 } }),
          E('bush', { x: 150, y: 164, seed: v.s(), params: { width: 16, height: 20, berries: true } }),
        ],
      }
    },
  },
]
