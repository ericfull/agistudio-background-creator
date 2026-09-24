import type { Pt } from '../../agi/commands'
import { mulberry32 } from '../../agi/rng'
import { elementLayer as E, paintLayer } from '../../state/factory'
import type { PaintLayer } from '../../state/types'
import type { RoomStarter } from './types'

/** Per-starter variation: fresh element seeds and small nudges from one room seed. */
function vary(seed: number) {
  const r = mulberry32(seed)
  return { s: () => r.int(1, 1e9), j: (n: number) => r.int(-n, n), pick: r.pick, chance: r.chance }
}

/** A paint layer holding only control lines (0 wall, 1 conditional, 2 trigger, 3 water). */
function control(name: string, lines: Pt[][], kind = 0): PaintLayer {
  const l = paintLayer(name)
  l.commands = [{ op: 'visual', color: null }, { op: 'priority', value: kind }, ...lines.map((pts) => ({ op: 'line' as const, pts }))]
  return l
}

export const fantasyStarters: RoomStarter[] = [
  {
    id: 'starter-fantasy-castle-gate',
    name: 'Castle gate',
    theme: 'fantasy',
    description: 'A path to a castle gatehouse with its drawbridge down over the moat.',
    build(seed) {
      const v = vary(seed)
      const top = 70
      const base = 102
      return {
        name: 'Castle gate',
        theme: 'fantasy',
        horizon: base - 2,
        perspective: { far: 0.8, near: 1 },
        layers: [
          E('sky-clear', { y: top, seed: v.s() }),
          E('clouds', { x: 26 + v.j(8), y: 14, seed: v.s(), params: { width: 18 } }),
          E('clouds', { x: 140 + v.j(8), y: 26, seed: v.s(), params: { width: 12, puffs: 3 } }),
          E('hills', { y: top, seed: v.s(), params: { ranges: 1, height: 14, trees: 4 } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 60 } }),
          E('river', { y: base + 8, seed: v.s(), params: { dir: 'ew', width: 22, wobble: 2, ripples: 20 } }),
          E('fantasy-castle-tower', { x: 8, y: base - 2, seed: v.s(), params: { height: 84, radius: 14, top: 'cone', windows: 3 } }),
          E('fantasy-castle-tower', { x: 152, y: base - 2, seed: v.s(), flipX: true, params: { height: 84, radius: 14, top: 'cone', windows: 3 } }),
          E('fantasy-castle-wall', { x: 36, y: base, seed: v.s(), params: { width: 50, height: 52, slits: 2 } }),
          E('fantasy-castle-wall', { x: 124, y: base, seed: v.s(), params: { width: 50, height: 52, slits: 2 } }),
          E('fantasy-castle-gate', { x: 80, y: base, seed: v.s(), params: { width: 58, height: 66, portcullis: 'up', bridge: 'down' } }),
          E('path', { y: base + 22, seed: v.s(), params: { topX: 80, bottomX: 78 + v.j(6), topW: 16, bottomW: 44, bend: v.j(6), pebbles: 14 } }),
          E('bush', { x: 44, y: 132, seed: v.s(), params: { width: 10, height: 12 } }),
          E('rock-cluster', { x: 116 + v.j(4), y: 136, seed: v.s(), params: { count: 3, size: 6, spread: 10 } }),
          E('flowers', { x: 128 + v.j(4), y: 158, seed: v.s(), params: { width: 16, count: 22 } }),
          E('oak', { x: 10, y: 166, seed: v.s(), params: { height: 92, width: 20, trunk: 5 } }),
          E('pine', { x: 152, y: 166, seed: v.s(), params: { height: 86, width: 17 } }),
          // entering the gateway (the lowered drawbridge clears the gate's own trigger)
          control('Gate trigger', [[[74, base - 1], [86, base - 1]]], 2),
        ],
      }
    },
  },
  {
    id: 'starter-fantasy-village-cottage',
    name: 'Village cottage',
    theme: 'fantasy',
    description: 'A thatched cottage with a picket fence, garden and a path to the door.',
    build(seed) {
      const v = vary(seed)
      const top = 70
      const base = 112
      const lit = v.chance(0.4)
      return {
        name: 'Village cottage',
        theme: 'fantasy',
        horizon: top + 2,
        layers: [
          E('sky-clear', { y: top, seed: v.s() }),
          E('clouds', { x: 120 + v.j(16), y: 18, seed: v.s(), params: { width: 20 } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 22, kind: 'round', size: 7 } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 60, patches: 2 } }),
          E('path', { y: base, seed: v.s(), params: { topX: 66, bottomX: 90 + v.j(6), topW: 8, bottomW: 36, bend: 6, pebbles: 10 } }),
          E('pine', { x: 138, y: 94, seed: v.s(), params: { height: 48, width: 11 } }),
          E('fantasy-cottage', { x: 66, y: base, scale: 1.3, seed: v.s(), params: { width: 70, height: 42, door: 'center', chimney: true, lit } }),
          E('fantasy-barrel', { x: 104, y: base + 2, seed: v.s(), params: { kind: 'barrel', size: 12, layout: 'row' } }),
          E('flowers', { x: 36, y: base + 12, seed: v.s(), params: { width: 16, depth: 5, count: 30, colors: 3 } }),
          E('fantasy-fence', { x: 128, y: 128, seed: v.s(), params: { length: 60, height: 12, style: 'picket' } }),
          E('stump-log', { x: 118 + v.j(4), y: 150, seed: v.s(), params: { kind: 'stump', size: 6 } }),
          E('bush', { x: 48, y: 150, seed: v.s(), params: { width: 12, height: 14, berries: true } }),
          E('oak', { x: 8, y: 166, seed: v.s(), params: { height: 96, width: 20, trunk: 5 } }),
        ],
      }
    },
  },
  {
    id: 'starter-fantasy-village-well',
    name: 'Village square',
    theme: 'fantasy',
    description: 'A well in a dirt square ringed by cottages and market barrels.',
    build(seed) {
      const v = vary(seed)
      const top = 68
      return {
        name: 'Village square',
        theme: 'fantasy',
        horizon: top + 2,
        layers: [
          E('sky-clear', { y: top, seed: v.s() }),
          E('clouds', { x: 80 + v.j(30), y: 14, seed: v.s(), params: { width: 16 } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 18, kind: 'mixed', size: 6 } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 50 } }),
          E('path', { y: top, seed: v.s(), params: { topX: 84, bottomX: 80, topW: 6, bottomW: 40, bend: v.j(4), pebbles: 8 } }),
          E('path-ew', { y: 126 + v.j(3), seed: v.s(), params: { width: 16, wobble: 2 } }),
          E('clearing', { x: 80, y: 146, seed: v.s(), params: { width: 50, depth: 22, stones: 6 } }),
          E('oak', { x: 102 + v.j(4), y: 80, seed: v.s(), params: { height: 40, width: 12 } }),
          E('fantasy-cottage', { x: 34, y: 100, scale: 1.2, seed: v.s(), params: { width: 58, height: 38, door: 'right', roof: 'shingle' } }),
          E('fantasy-cottage', { x: 136, y: 104, scale: 1.2, flipX: true, seed: v.s(), params: { width: 54, height: 40, door: 'right', roof: 'thatch' } }),
          E('fantasy-barrel', { x: 62, y: 108, seed: v.s(), params: { kind: 'crate', size: 10, layout: 'stack' } }),
          E('fantasy-signpost', { x: 112, y: 118, seed: v.s(), params: { height: 30, boards: 2 } }),
          E('fantasy-well', { x: 80, y: 138, seed: v.s(), params: { radius: 12, roof: 'roof', bucket: true } }),
          E('fantasy-barrel', { x: 132 + v.j(4), y: 150, seed: v.s(), params: { kind: 'barrel', size: 14, layout: 'row' } }),
          E('bush', { x: 20, y: 146, seed: v.s(), params: { width: 12, height: 12 } }),
          E('flowers', { x: 32, y: 162, seed: v.s(), params: { width: 18, count: 28, colors: 3 } }),
        ],
      }
    },
  },
  {
    id: 'starter-fantasy-dungeon-cell',
    name: 'Dungeon cell',
    theme: 'fantasy',
    description: 'A torch-lit stone cell with shackles, a barred window and a heavy door.',
    build(seed) {
      const v = vary(seed)
      const seam = 104
      const dark = { wall: 8, mortar: 0, side: 8, sideLine: 0, floor: 6, floorLine: 0, ceiling: 0, trim: 0 }
      return {
        name: 'Dungeon cell',
        theme: 'fantasy',
        horizon: seam + 2,
        layers: [
          E('fantasy-room-stone', { y: seam, seed: v.s(), colorMap: dark, params: { width: 96, ceiling: 8, beams: false, floor: 'dirt' } }),
          E('fantasy-dungeon-wall', { x: 72, y: seam, seed: v.s(), params: { width: 50, height: 60, shackles: 2, moss: true } }),
          E('fantasy-window', { x: 72, y: 48, seed: v.s(), params: { width: 10, height: 10, shape: 'square', bars: 'grid' } }),
          E('fantasy-torch', { x: 38, y: 78, seed: v.s(), params: { mount: 'wall', lit: true, size: 10 } }),
          E('fantasy-door', { x: 114, y: seam, seed: v.s(), params: { width: 16, height: 40, shape: 'square', frame: 'stone', state: 'closed' } }),
          E('rock-cluster', { x: 40 + v.j(4), y: 118, seed: v.s(), params: { count: 4, size: 5, spread: 10 } }),
          E('fantasy-bed', { x: 44, y: 140, seed: v.s(), colorMap: { blanket: 6, quilt: 14, sheet: 14, pillow: 14 }, params: { length: 34, depth: 7, posts: false, quilt: true } }),
          E('fantasy-barrel', { x: 130 + v.j(3), y: 148, seed: v.s(), params: { kind: 'barrel', size: 13 } }),
        ],
      }
    },
  },
  {
    id: 'starter-fantasy-throne-room',
    name: 'Throne room',
    theme: 'fantasy',
    description: 'A great hall with a golden throne on a dais at the end of a long red rug.',
    build(seed) {
      const v = vary(seed)
      const seam = 102
      return {
        name: 'Throne room',
        theme: 'fantasy',
        horizon: seam + 2,
        layers: [
          E('fantasy-room-stone', { y: seam, seed: v.s(), params: { width: 124, ceiling: 14, beams: true, floor: 'flags' } }),
          E('fantasy-window', { x: 36, y: 72, seed: v.s(), params: { width: 12, height: 26, shape: 'arched', bars: 'cross' } }),
          E('fantasy-window', { x: 124, y: 72, seed: v.s(), params: { width: 12, height: 26, shape: 'arched', bars: 'cross' } }),
          E('fantasy-torch', { x: 58, y: 76, seed: v.s(), params: { mount: 'wall', lit: true } }),
          E('fantasy-torch', { x: 102, y: 76, seed: v.s(), params: { mount: 'wall', lit: true } }),
          E('fantasy-rug', { x: 80, y: 166, seed: v.s(), params: { width: 30, depth: 58, shape: 'rect', pattern: 'border', fringe: false } }),
          E('fantasy-throne', { x: 80, y: seam + 8, seed: v.s(), params: { height: 42, width: 20, style: 'gold', dais: true } }),
          E('fantasy-table', { x: 28, y: 136, seed: v.s(), params: { width: 34, height: 12, cloth: true, items: 'meal' } }),
          E('fantasy-chest', { x: 134 + v.j(3), y: 130, seed: v.s(), params: { size: 16, open: v.chance(0.5), gold: true } }),
          E('fantasy-torch', { x: 146, y: 166, seed: v.s(), params: { mount: 'pole', lit: true, size: 14 } }),
          E('fantasy-torch', { x: 14, y: 166, seed: v.s(), params: { mount: 'pole', lit: true, size: 14 } }),
        ],
      }
    },
  },
  {
    id: 'starter-fantasy-cave-entrance',
    name: 'Cave entrance',
    theme: 'fantasy',
    description: 'A dark cave mouth at the foot of a rocky cliff, reached by a stony trail.',
    build(seed) {
      const v = vary(seed)
      const top = 62
      const base = 112
      return {
        name: 'Cave entrance',
        theme: 'fantasy',
        horizon: base - 6,
        perspective: { far: 0.8, near: 1 },
        layers: [
          E('sky-clear', { y: top, seed: v.s() }),
          E('mountains', { y: top, seed: v.s(), params: { height: 30, peaks: 4, snow: false } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 40, patches: 3 } }),
          E('cliff', { x: 80, y: base - 4, seed: v.s(), params: { width: 84, height: 62, strata: 6, cracks: 6 } }),
          E('fantasy-cave', { x: 82, y: base, seed: v.s(), params: { width: 70, height: 50, mouth: 44, boulders: true } }),
          E('path', { y: base - 2, seed: v.s(), params: { topX: 82, bottomX: 66 + v.j(6), topW: 16, bottomW: 40, bend: -6, pebbles: 24 } }),
          E('boulder', { x: 30, y: 128, seed: v.s(), params: { width: 12, height: 16, cracks: 2 } }),
          E('rock-cluster', { x: 124 + v.j(4), y: 126, seed: v.s(), params: { count: 5, size: 8, spread: 16 } }),
          E('dead-tree', { x: 142, y: 164, seed: v.s(), flipX: true, params: { height: 84, branches: 3, spread: 48 } }),
          E('rock-cluster', { x: 30 + v.j(4), y: 160, seed: v.s(), params: { count: 4, size: 9, spread: 16 } }),
          E('bush', { x: 110, y: 160, seed: v.s(), params: { width: 10, height: 10 } }),
        ],
      }
    },
  },
]
