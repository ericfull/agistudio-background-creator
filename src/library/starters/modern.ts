import { mulberry32 } from '../../agi/rng'
import { elementLayer as E } from '../../state/factory'
import type { RoomStarter } from './types'

/** Per-starter variation: fresh element seeds and small nudges from one room seed. */
function vary(seed: number) {
  const r = mulberry32(seed)
  return { s: () => r.int(1, 1e9), j: (n: number) => r.int(-n, n), pick: r.pick, chance: r.chance, int: r.int }
}

export const modernStarters: RoomStarter[] = [
  {
    id: 'starter-modern-bar-street',
    name: "Street outside Lefty's",
    theme: 'modern',
    description: 'A night street with a neon-lit bar, a phone booth and a cab at the curb.',
    build(seed) {
      const v = vary(seed)
      const walk = 104
      const curb = 118
      return {
        name: "Street outside Lefty's",
        theme: 'modern',
        horizon: walk + 2,
        layers: [
          E('sky-night', { y: walk, seed: v.s(), params: { stars: 30, moon: 'crescent', moonX: 20 + v.j(8) } }),
          E('modern-skyline', { y: 60, seed: v.s(), params: { height: 30, lit: 30, rows: 2 } }),
          E('modern-street', { y: curb, seed: v.s(), params: { street: 32, farWalk: curb - walk, lines: 'center', cross: 'none', details: true } }),
          E('modern-building', { x: 22, y: walk, seed: v.s(), params: { material: 'brick', width: 48, floors: 4, cols: 3, door: true, lit: 40 } }),
          E('modern-bar', { x: 80, y: walk, seed: v.s(), params: { width: 72, sign: "LEFTY'S", icon: 'martini', windows: true, brick: true } }),
          E('modern-storefront', { x: 140, y: walk, seed: v.s(), params: { width: 48, awning: 'striped', sign: v.pick(['LIQUOR', 'PAWN', 'DELI']), doorSide: 'center' } }),
          E('modern-trash', { x: 118, y: walk + 6, seed: v.s(), params: { kind: 'can', size: 90 } }),
          E('modern-streetlamp', { x: 50, y: walk + 8, seed: v.s(), params: { height: 58, style: 'cobra', lit: true } }),
          E('modern-hydrant', { x: 104 + v.j(3), y: walk + 11, seed: v.s(), params: { height: 10 } }),
          E('modern-car', { x: 96 + v.j(10), y: curb + 13, seed: v.s(), flipX: v.chance(0.5), params: { kind: 'taxi', length: 60, lights: true } }),
          E('modern-phonebooth', { x: 16, y: 164, seed: v.s(), params: { height: 44, style: 'booth', sign: true } }),
          E('modern-meter', { x: 134, y: 160, seed: v.s(), params: { height: 22, kind: 'single' } }),
          E('modern-streetlamp', { x: 150, y: 166, seed: v.s(), flipX: true, params: { height: 88, style: 'cobra', lit: true } }),
        ],
      }
    },
  },
  {
    id: 'starter-modern-police-office',
    name: 'Police station office',
    theme: 'modern',
    description: 'A squad room with desks, file cabinets and a window with half-drawn blinds.',
    build(seed) {
      const v = vary(seed)
      const seam = 98
      return {
        name: 'Police station office',
        theme: 'modern',
        horizon: seam + 2,
        layers: [
          E('modern-room', { y: seam, seed: v.s(), params: { style: 'office', width: 124, height: 64, door: 'back', details: true } }),
          E('modern-blinds', { x: 44, y: 76, seed: v.s(), params: { width: 30, height: 22, blinds: 55 + v.j(20), view: 'city' } }),
          E('modern-file-cabinet', { x: 116, y: seam + 1, seed: v.s(), params: { drawers: 4, width: 8 } }),
          E('modern-file-cabinet', { x: 132, y: seam + 1, seed: v.s(), params: { drawers: 4, width: 8, open: v.chance(0.5) } }),
          E('modern-plant', { x: 24, y: seam + 6, scale: 1.4, seed: v.s(), params: { height: 26, plant: 'ficus' } }),
          E('modern-chair', { x: 48, y: 120, seed: v.s(), params: { kind: 'swivel', back: 10, facing: 'front' } }),
          E('modern-desk', { x: 48, y: 128, seed: v.s(), params: { width: 40, phone: true, papers: true, extra: 'typewriter' } }),
          E('modern-chair', { x: 116, y: 132, seed: v.s(), params: { kind: 'swivel', back: 11, facing: 'front' } }),
          E('modern-desk', { x: 116, y: 142, seed: v.s(), params: { width: 44, phone: true, papers: true, extra: v.pick(['lamp', 'terminal']) } }),
          E('modern-chair', { x: 58, y: 166, seed: v.s(), params: { kind: 'guest', back: 10, facing: 'back' } }),
        ],
      }
    },
  },
  {
    id: 'starter-modern-hotel-hallway',
    name: 'Hotel hallway',
    theme: 'modern',
    description: 'A carpeted hotel corridor lined with numbered room doors and an ice machine.',
    build(seed) {
      const v = vary(seed)
      const seam = 100
      const floor = v.int(2, 8) * 100
      return {
        name: 'Hotel hallway',
        theme: 'modern',
        horizon: seam + 2,
        layers: [
          E('modern-room', { y: seam, seed: v.s(), params: { style: 'hotel', width: 150, height: 66, door: 'none', details: true } }),
          E('modern-hotel-door', { x: 34, y: seam, seed: v.s(), params: { number: floor + 12, style: 'hotel' } }),
          E('modern-hotel-door', { x: 80, y: seam, seed: v.s(), params: { number: floor + 14, style: 'hotel', hanger: true } }),
          E('modern-hotel-door', { x: 126, y: seam, seed: v.s(), params: { number: floor + 16, style: 'hotel', open: v.chance(0.3) } }),
          E('modern-plant', { x: 57, y: seam + 3, seed: v.s(), params: { height: 22, plant: 'fern', pot: 'urn' } }),
          E('modern-vending', { x: 150, y: 124, seed: v.s(), params: { kind: 'soda', height: 40, width: 16, lit: true } }),
          E('modern-trash', { x: 16, y: 152, scale: 1.4, seed: v.s(), params: { kind: 'basket', size: 90 } }),
        ],
      }
    },
  },
  {
    id: 'starter-modern-bar-interior',
    name: 'Bar interior',
    theme: 'modern',
    description: 'Inside a dim bar: a long counter with stools, a glowing jukebox and a back door.',
    build(seed) {
      const v = vary(seed)
      const seam = 96
      return {
        name: 'Bar interior',
        theme: 'modern',
        horizon: seam + 2,
        layers: [
          E('modern-room', { y: seam, seed: v.s(), params: { style: 'bar', width: 116, height: 60, door: 'back', details: true } }),
          E('modern-blinds', { x: 46, y: 70, seed: v.s(), params: { width: 26, height: 18, blinds: 80, view: 'night' } }),
          E('modern-jukebox', { x: 130, y: seam + 6, seed: v.s(), params: { style: 'arch', height: 32, lit: true } }),
          E('modern-bar-counter', { x: 58, y: 130, seed: v.s(), params: { length: 96, stools: 5, bottles: true, rail: true } }),
          E('fantasy-table', { x: 132, y: 140, seed: v.s(), params: { width: 22, height: 12, cloth: true, items: 'candle' } }),
          E('modern-chair', { x: 148, y: 146, seed: v.s(), flipX: true, params: { kind: 'guest', back: 9, facing: 'front' } }),
          E('modern-plant', { x: 150, y: 166, seed: v.s(), params: { height: 34, plant: 'snake', pot: 'square' } }),
        ],
      }
    },
  },
  {
    id: 'starter-modern-city-park',
    name: 'City park',
    theme: 'modern',
    description: 'A leafy park with a pond and lamp-lit walk below the downtown skyline.',
    build(seed) {
      const v = vary(seed)
      const top = 70
      return {
        name: 'City park',
        theme: 'modern',
        horizon: top + 2,
        layers: [
          E('sky-clear', { y: top, seed: v.s() }),
          E('clouds', { x: 110 + v.j(20), y: 16, seed: v.s(), params: { width: 20 } }),
          E('modern-skyline', { y: top - 8, seed: v.s(), params: { height: 36, lit: 0, rows: 2 } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 16, kind: 'round', size: 6 } }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 50 } }),
          E('path', { y: top, seed: v.s(), params: { topX: 60, bottomX: 90 + v.j(6), topW: 8, bottomW: 40, bend: -14, pebbles: 0 }, colorMap: { dirt: 7, edge: 8 } }),
          E('pond', { x: 122, y: 112, seed: v.s(), params: { width: 26, depth: 9, lilies: 3, shine: true } }),
          E('oak', { x: 28, y: 100, seed: v.s(), params: { height: 48, width: 14 } }),
          E('modern-streetlamp', { x: 86, y: 104, seed: v.s(), params: { height: 44, style: 'globe', lit: false } }),
          E('fantasy-fence', { x: 122, y: 126, seed: v.s(), params: { length: 50, height: 7, rails: 1, style: 'rail' }, colorMap: { wood: 8 } }),
          E('flowers', { x: 40, y: 132, seed: v.s(), params: { width: 20, depth: 7, count: 36, colors: 3 } }),
          E('modern-trash', { x: 118, y: 148, seed: v.s(), params: { kind: 'basket', size: 90 } }),
          E('modern-streetlamp', { x: 136, y: 160, seed: v.s(), params: { height: 72, style: 'globe', lit: false } }),
          E('oak', { x: 6, y: 166, seed: v.s(), params: { height: 100, width: 22, trunk: 5 } }),
          E('bush', { x: 150, y: 166, seed: v.s(), params: { width: 14, height: 16 } }),
        ],
      }
    },
  },
]
