import { mulberry32 } from '../../agi/rng'
import { elementLayer as E } from '../../state/factory'
import type { RoomStarter } from './types'

/** Per-starter variation: fresh element seeds and small nudges from one room seed. */
function vary(seed: number) {
  const r = mulberry32(seed)
  return { s: () => r.int(1, 1e9), j: (n: number) => r.int(-n, n), pick: r.pick, chance: r.chance }
}

/** Dark silhouette colors for a treeline against a night sky. */
const NIGHT_TREES = { leaf: 0, far: 8, line: 0, light: 8, shadow: 0, trunk: 0 }

export const spookyStarters: RoomStarter[] = [
  {
    id: 'starter-spooky-manor-gate',
    name: 'Haunted manor gate',
    theme: 'spooky',
    description: 'An iron gate stands open on the path to a decaying manor under a full moon.',
    build(seed) {
      const v = vary(seed)
      const top = 74
      const fence = 124
      return {
        name: 'Haunted manor gate',
        theme: 'spooky',
        horizon: top + 2,
        perspective: { far: 0.7, near: 1 },
        layers: [
          E('sky-night', { y: top, seed: v.s(), params: { stars: 40, moon: 'none' } }),
          E('spooky-moon', { x: 24 + v.j(6), y: 44, seed: v.s(), params: { size: 10, clouds: 2, bats: 3 } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 18, kind: 'mixed', size: 6 }, colorMap: NIGHT_TREES }),
          E('spooky-ground', { y: top, seed: v.s(), params: { tufts: 50, patches: 4, path: 'straight', pathX: 80 } }),
          E('dead-tree', { x: 36, y: 98, seed: v.s(), params: { height: 46, branches: 3, spread: 40 }, colorMap: { wood: 8 } }),
          E('spooky-manor', { x: 90, y: 102, seed: v.s(), params: { width: 96, floors: 2, gables: 2, tower: 'right', lit: v.pick([1, 2, 3]), decay: true } }),
          E('spooky-gravestones', { x: 130, y: 114, seed: v.s(), params: { shape: 'mixed', count: 3, height: 14 } }),
          E('spooky-fence', { x: 80, y: fence, seed: v.s(), params: { length: 158, height: 30, gate: 'open', pillars: true, decay: true } }),
          E('spooky-fog', { y: fence - 2, seed: v.s(), params: { thickness: 10, density: 'wisps', roll: 4, gaps: 5 } }),
          E('spooky-pumpkin', { x: 54 + v.j(4), y: 142, seed: v.s(), params: { size: 6, face: 'grin', lit: true } }),
          E('spooky-tree', { x: 14, y: 166, seed: v.s(), params: { height: 100, spread: 30, lean: 4, branches: 6, face: 'face' } }),
          E('spooky-tree', { x: 150, y: 164, seed: v.s(), flipX: true, params: { height: 88, spread: 26, lean: 3, branches: 5, face: 'knothole' } }),
        ],
      }
    },
  },
  {
    id: 'starter-spooky-graveyard',
    name: 'Graveyard at night',
    theme: 'spooky',
    description: 'Crooked headstones and a mausoleum in a misty cemetery by moonlight.',
    build(seed) {
      const v = vary(seed)
      const top = 70
      return {
        name: 'Graveyard at night',
        theme: 'spooky',
        horizon: top + 2,
        layers: [
          E('sky-night', { y: top, seed: v.s(), params: { stars: 60, moon: 'none' } }),
          E('spooky-moon', { x: 40 + v.j(10), y: 46, seed: v.s(), params: { size: 11, clouds: 3, bats: 2 } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 22, kind: 'pine', size: 6 }, colorMap: NIGHT_TREES }),
          E('spooky-ground', { y: top, seed: v.s(), params: { tufts: 60, patches: 6, path: 'winding', pathX: 70 + v.j(8), bones: true } }),
          E('spooky-fence', { x: 60, y: 90, seed: v.s(), params: { length: 120, height: 18, gate: 'none', pillars: true, decay: true } }),
          E('spooky-crypt', { x: 124, y: 100, scale: 1.2, seed: v.s(), params: { width: 46, columns: 'two', door: v.pick(['closed', 'ajar']), steps: 2, statue: 'angel', moss: true } }),
          E('spooky-gravestones', { x: 40, y: 104, seed: v.s(), params: { shape: 'rounded', count: 3, height: 14, tilt: 5 } }),
          E('spooky-gravestones', { x: 116, y: 128, seed: v.s(), params: { shape: 'cross', count: 3, height: 16, tilt: 6 } }),
          E('spooky-gravestones', { x: 28, y: 136, seed: v.s(), params: { shape: 'mixed', count: 2, height: 18, tilt: 4, mound: true } }),
          E('spooky-fog', { y: 116, seed: v.s(), params: { thickness: 14, density: 'light', roll: 5, gaps: 3 } }),
          E('spooky-gravestones', { x: 132 + v.j(4), y: 160, seed: v.s(), params: { shape: 'obelisk', count: 2, height: 22, tilt: 3 } }),
          E('dead-tree', { x: 8, y: 166, seed: v.s(), params: { height: 96, branches: 4, spread: 50, trunk: 4 }, colorMap: { wood: 8 } }),
        ],
      }
    },
  },
  {
    id: 'starter-spooky-crypt-interior',
    name: 'Crypt interior',
    theme: 'spooky',
    description: 'A cold stone crypt: a coffin on its slab between guttering candelabras.',
    build(seed) {
      const v = vary(seed)
      const seam = 98
      const backW = 84
      const backH = 60
      const bx0 = 80 - backW / 2
      const top = seam - backH
      return {
        name: 'Crypt interior',
        theme: 'spooky',
        horizon: seam + 2,
        layers: [
          E('spooky-room', { y: seam, seed: v.s(), params: { backW, backH, floor: 'stone', cracks: 6, window: 'none', door: 'back' }, colorMap: { wall: 7, side: 8, trim: 8, floor: 8 } }),
          E('spooky-cobweb', { x: bx0 + 1, y: top + 1, seed: v.s(), params: { corner: 'tl', size: 16, rings: 4, spider: true } }),
          E('spooky-cobweb', { x: 159 - bx0 - 1, y: top + 1, seed: v.s(), params: { corner: 'tr', size: 12, rings: 3, spider: false } }),
          E('fantasy-torch', { x: 50, y: 74, seed: v.s(), params: { mount: 'wall', lit: true } }),
          E('fantasy-torch', { x: 110, y: 74, seed: v.s(), params: { mount: 'wall', lit: true } }),
          E('spooky-gargoyle', { x: 30, y: 126, seed: v.s(), params: { pedestal: 16, wings: 'spread', glow: true } }),
          E('spooky-coffin', { x: 80, y: 134, seed: v.s(), params: { pose: 'lying', lid: v.pick(['closed', 'open', 'bones']), length: 28, slab: true, cross: true } }),
          E('spooky-candelabra', { x: 52, y: 146, seed: v.s(), params: { arms: 5, height: 30, lit: true } }),
          E('spooky-candelabra', { x: 108, y: 146, seed: v.s(), params: { arms: 5, height: 30, lit: true } }),
          E('rock-cluster', { x: 140 + v.j(4), y: 160, seed: v.s(), params: { count: 4, size: 6, spread: 12 } }),
        ],
      }
    },
  },
  {
    id: 'starter-spooky-swamp',
    name: 'Misty swamp',
    theme: 'spooky',
    description: 'A murky bog with lily pads and rotting stumps, choked by twisted trees and fog.',
    build(seed) {
      const v = vary(seed)
      const top = 66
      return {
        name: 'Misty swamp',
        theme: 'spooky',
        horizon: top + 2,
        layers: [
          E('sky-banded', { y: top, seed: v.s(), params: { bands: 4, dither: true, sun: false }, colorMap: { c1: 0, c2: 1, c3: 5, c4: 8, c5: 7 } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 26, kind: 'round', rows: 2, size: 8 }, colorMap: { leaf: 2, far: 8, light: 2, shadow: 0, trunk: 0 } }),
          E('spooky-ground', { y: top, seed: v.s(), params: { tufts: 60, patches: 4, path: 'none' }, colorMap: { ground: 6, tuft: 2, bare: 8 } }),
          E('spooky-swamp', { y: 92, seed: v.s(), params: { depth: 44, pads: 10, stumps: 3, bubbles: true, banks: true } }),
          E('dead-tree', { x: 118, y: 90, seed: v.s(), params: { height: 44, branches: 3, spread: 36 }, colorMap: { wood: 8 } }),
          E('reeds', { x: 36, y: 100, seed: v.s(), params: { count: 12, height: 18, spread: 10 } }),
          E('reeds', { x: 128, y: 138, seed: v.s(), params: { count: 14, height: 22, spread: 12 } }),
          E('spooky-fog', { y: 104, seed: v.s(), params: { thickness: 18, density: 'light', roll: 6, gaps: 3 } }),
          E('spooky-tree', { x: 16, y: 164, seed: v.s(), params: { height: 110, spread: 32, lean: 5, branches: 6, face: v.pick(['none', 'knothole', 'glowing']) } }),
          E('reeds', { x: 70 + v.j(6), y: 160, seed: v.s(), params: { count: 10, height: 20, spread: 10 } }),
          E('dead-tree', { x: 152, y: 166, seed: v.s(), flipX: true, params: { height: 90, branches: 4, spread: 44, trunk: 4 }, colorMap: { wood: 8 } }),
        ],
      }
    },
  },
  {
    id: 'starter-spooky-coffin-room',
    name: "Vampire's parlor",
    theme: 'spooky',
    description: 'A cracked, cobwebbed parlor where an open coffin stands beside a draped window.',
    build(seed) {
      const v = vary(seed)
      const seam = 100
      const backW = 96
      const backH = 64
      const bx0 = 80 - backW / 2
      const top = seam - backH
      return {
        name: "Vampire's parlor",
        theme: 'spooky',
        horizon: seam + 2,
        layers: [
          E('spooky-room', { y: seam, seed: v.s(), params: { backW, backH, floor: 'boards', cracks: 7, window: 'arched', door: 'left' } }),
          E('spooky-cobweb', { x: bx0 + 1, y: top + 1, seed: v.s(), params: { corner: 'tl', size: 14, rings: 4, spider: false } }),
          E('spooky-cobweb', { x: 159 - bx0 - 1, y: top + 1, seed: v.s(), params: { corner: 'tr', size: 18, rings: 5, spider: true } }),
          E('fantasy-bookshelf', { x: 46, y: seam, seed: v.s(), params: { width: 20, height: 44, shelves: 4, fill: 60 }, colorMap: { wood: 6 } }),
          E('spooky-coffin', { x: 114, y: seam + 3, scale: 1.4, seed: v.s(), params: { pose: 'standing', lid: 'open', length: 28, slab: false, cross: false } }),
          E('fantasy-rug', { x: 80, y: 150, seed: v.s(), params: { width: 56, depth: 22, shape: 'oval', pattern: 'border', fringe: false }, colorMap: { rug: 5, border: 0, pattern: 4 } }),
          E('fantasy-table', { x: 68, y: 132, seed: v.s(), params: { width: 22, height: 12, cloth: true, items: 'none' }, colorMap: { cloth: 4 } }),
          E('spooky-candelabra', { x: 68, y: 126, seed: v.s(), params: { arms: 3, height: 18, lit: true } }),
          E('spooky-pumpkin', { x: 132 + v.j(4), y: 150, seed: v.s(), params: { size: 6, face: v.pick(['scary', 'toothy']), lit: true } }),
          E('spooky-cobweb', { x: 0, y: 167, seed: v.s(), params: { corner: 'bl', size: 20, rings: 4, spider: false } }),
        ],
      }
    },
  },
]
