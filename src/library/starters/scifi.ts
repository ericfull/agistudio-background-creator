import { mulberry32 } from '../../agi/rng'
import { elementLayer as E } from '../../state/factory'
import type { RoomStarter } from './types'

/** Per-starter variation: fresh element seeds and small nudges from one room seed. */
function vary(seed: number) {
  const r = mulberry32(seed)
  return { s: () => r.int(1, 1e9), j: (n: number) => r.int(-n, n), pick: r.pick, chance: r.chance }
}

export const scifiStarters: RoomStarter[] = [
  {
    id: 'starter-scifi-ship-corridor',
    name: 'Ship corridor',
    theme: 'scifi',
    description: 'A lit starship corridor running back to a sliding door.',
    build(seed) {
      const v = vary(seed)
      const seam = 96
      return {
        name: 'Ship corridor',
        theme: 'scifi',
        horizon: seam + 2,
        layers: [
          E('scifi-corridor', { y: seam, seed: v.s(), params: { backW: 56, backH: 46, end: 'door', floor: 'grating', panels: 3, lights: true } }),
          E('scifi-robot', { x: 60 + v.j(6), y: 124, scale: 1.3, seed: v.s(), params: { style: 'dome', height: 26, width: 10 } }),
          E('scifi-crate', { x: 126, y: 150, scale: 1.3, seed: v.s(), params: { style: 'crate', width: 12, height: 10, count: 2, stack: 2 } }),
          E('scifi-crate', { x: 32 + v.j(3), y: 160, scale: 1.2, seed: v.s(), params: { style: 'canister', width: 9, height: 14, count: 2, stack: 1 } }),
        ],
      }
    },
  },
  {
    id: 'starter-scifi-bridge',
    name: 'Starship bridge',
    theme: 'scifi',
    description: 'The command bridge: a wide viewscreen over a planet and banks of consoles.',
    build(seed) {
      const v = vary(seed)
      const seam = 100
      return {
        name: 'Starship bridge',
        theme: 'scifi',
        horizon: seam + 2,
        layers: [
          E('scifi-control-room', { y: seam, seed: v.s(), params: { window: v.pick(['planet', 'planet', 'stars']), side: 18, height: 62, consoles: true, floor: 'tiles' } }),
          E('scifi-console', { x: 80, y: 136, seed: v.s(), params: { style: 'desk', width: 36, height: 14, screens: 3 } }),
          E('scifi-console', { x: 16, y: 150, seed: v.s(), params: { style: 'tower', width: 14, height: 24, screens: 2 } }),
          E('scifi-console', { x: 144, y: 150, seed: v.s(), flipX: true, params: { style: 'tower', width: 14, height: 24, screens: 2 } }),
          E('scifi-robot', { x: 122 + v.j(4), y: 124, scale: 1.2, seed: v.s(), params: { style: 'android', height: 28, width: 9, antenna: false } }),
          E('modern-chair', { x: 80, y: 162, scale: 1.3, seed: v.s(), params: { kind: 'swivel', back: 14, facing: 'back' }, colorMap: { seat: 8, frame: 7 } }),
        ],
      }
    },
  },
  {
    id: 'starter-scifi-landing-site',
    name: 'Desert landing site',
    theme: 'scifi',
    description: 'A saucer parked on alien dunes among red spires, its ramp lowered.',
    build(seed) {
      const v = vary(seed)
      const top = 66
      const shipY = 118
      return {
        name: 'Desert landing site',
        theme: 'scifi',
        horizon: top + 2,
        layers: [
          E('sky-banded', { y: top, seed: v.s(), params: { bands: 5, dither: true, sun: false }, colorMap: { c1: 0, c2: 1, c3: 5, c4: 13, c5: 12 } }),
          E('scifi-planet', { x: 36 + v.j(8), y: 44, seed: v.s(), params: { kind: 'ringed', size: 11, moons: 1, lit: 'right' } }),
          E('mountains', { y: top, seed: v.s(), params: { height: 20, peaks: 6, snow: false, far: true }, colorMap: { rock: 4, shade: 0, line: 0, far: 5 } }),
          E('scifi-desert', { y: top, seed: v.s(), params: { dunes: 5, height: 5, specks: 80, rocks: 6 } }),
          E('scifi-spires', { x: 20, y: 110, seed: v.s(), params: { shape: 'needle', count: 3, height: 64, width: 8 } }),
          E('scifi-antenna', { x: 128, y: 96, seed: v.s(), params: { kind: 'dish', height: 30, size: 9, aim: -30 } }),
          E('scifi-ship', { x: 92 + v.j(4), y: shipY, seed: v.s(), params: { shape: 'saucer', size: 84, ramp: true, legs: true } }),
          E('scifi-crate', { x: 128 + v.j(4), y: 134, seed: v.s(), params: { style: 'canister', width: 8, height: 11, count: 3, stack: 1 } }),
          E('rock-cluster', { x: 40 + v.j(6), y: 146, seed: v.s(), params: { count: 4, size: 8, spread: 14 }, colorMap: { rock: 4, shade: 0, light: 12 } }),
          E('scifi-spires', { x: 150, y: 166, seed: v.s(), flipX: true, params: { shape: 'hoodoo', count: 2, height: 92, width: 10 } }),
        ],
      }
    },
  },
  {
    id: 'starter-scifi-alien-jungle',
    name: 'Alien jungle',
    theme: 'scifi',
    description: 'A trail through strange bulb and tentacle plants under a ringed planet.',
    build(seed) {
      const v = vary(seed)
      const top = 64
      const jungle = { leaf: 3, far: 1, light: 11, shadow: 0, trunk: 5 }
      return {
        name: 'Alien jungle',
        theme: 'scifi',
        horizon: top + 2,
        layers: [
          E('sky-clear', { y: top, seed: v.s(), colorMap: { sky: 13 } }),
          E('scifi-planet', { x: 118 + v.j(10), y: 48, seed: v.s(), params: { kind: 'banded', size: 12, moons: 2, lit: 'left' } }),
          E('treeline', { y: top, seed: v.s(), params: { height: 30, kind: 'round', rows: 2, size: 8 }, colorMap: jungle }),
          E('grass-field', { y: top, seed: v.s(), params: { tufts: 70, patches: 3 }, colorMap: { grass: 2, tuft: 3, patch: 3, flower: 13 } }),
          E('path', { y: top, seed: v.s(), params: { topX: 70 + v.j(6), bottomX: 84, topW: 6, bottomW: 36, bend: 10, pebbles: 12 }, colorMap: { dirt: 5, edge: 5, pebble: 13 } }),
          E('pond', { x: 126, y: 118, seed: v.s(), params: { width: 18, depth: 6, lilies: 3 }, colorMap: { water: 3, shine: 11, bank: 1, lily: 13 } }),
          E('oak', { x: 142 + v.j(3), y: 98, seed: v.s(), params: { height: 48, width: 14 }, colorMap: { leaf: 1, leafLight: 9, trunk: 5, bark: 0 } }),
          E('scifi-plants', { x: 50, y: 94, seed: v.s(), params: { kind: 'pod', height: 30, stalks: 3 } }),
          E('palm', { x: 22, y: 116, seed: v.s(), params: { height: 64, lean: 10, fronds: 8, coconuts: true }, colorMap: { leaf: 5, leafLight: 13, trunk: 3, nut: 14 } }),
          E('scifi-plants', { x: 106, y: 96, seed: v.s(), params: { kind: 'spiky', height: 22, stalks: 4 } }),
          E('scifi-plants', { x: 50, y: 128, seed: v.s(), params: { kind: 'bulb', height: 24, stalks: 3 } }),
          E('scifi-plants', { x: 14, y: 166, seed: v.s(), params: { kind: 'tentacle', height: 50, stalks: 5 } }),
          E('scifi-plants', { x: 144, y: 166, seed: v.s(), flipX: true, params: { kind: 'bulb', height: 46, stalks: 5 } }),
          E('scifi-plants', { x: 116 + v.j(4), y: 150, seed: v.s(), params: { kind: 'spiky', height: 18, stalks: 3 } }),
        ],
      }
    },
  },
  {
    id: 'starter-scifi-pod-crash',
    name: 'Escape pod crash',
    theme: 'scifi',
    description: 'A scorched escape pod lies open in a fresh crater on a barren moon at night.',
    build(seed) {
      const v = vary(seed)
      const top = 70
      return {
        name: 'Escape pod crash',
        theme: 'scifi',
        horizon: top + 2,
        layers: [
          E('scifi-starfield', { y: top, seed: v.s(), params: { density: 160, bright: 6, nebula: 'cloud', nebY: 40, nebX: 40 + v.j(20) } }),
          E('scifi-planet', { x: 124 + v.j(8), y: 50, seed: v.s(), params: { kind: 'cratered', size: 13, moons: 0, lit: 'left' } }),
          E('mountains', { y: top, seed: v.s(), params: { height: 22, peaks: 5, snow: false, far: false }, colorMap: { rock: 8, shade: 0, line: 0, far: 8 } }),
          E('sand-dunes', { y: top, seed: v.s(), params: { dunes: 3, height: 10, ripples: 20 }, colorMap: { sand: 7, shade: 8, ripple: 8 } }),
          E('scifi-crater', { x: 30, y: 96, seed: v.s(), params: { width: 22, depth: 5, rim: true, debris: false }, colorMap: { rim: 15, inside: 8, shadow: 0 } }),
          E('scifi-crater', { x: 84, y: 134, seed: v.s(), params: { width: 58, depth: 14, rim: true, debris: true }, colorMap: { rim: 15, inside: 8, shadow: 0 } }),
          E('scifi-escape-pod', { x: 88, y: 128, seed: v.s(), scale: 1.3, params: { size: 36, state: 'open', legs: false, scorch: true } }),
          E('rock-cluster', { x: 136 + v.j(4), y: 112, seed: v.s(), params: { count: 4, size: 7, spread: 12 } }),
          E('rock-cluster', { x: 30 + v.j(4), y: 150, seed: v.s(), params: { count: 3, size: 6, spread: 10 } }),
          E('boulder', { x: 146, y: 162, seed: v.s(), params: { width: 16, height: 20, cracks: 3 } }),
        ],
      }
    },
  },
]
