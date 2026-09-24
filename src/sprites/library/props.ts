/**
 * Built-in props, most with a looping 'idle' animation. Art is ASCII (see
 * ascii.ts): hex digits are fixed EGA colors, lowercase letters are the
 * recolorable roles listed in each prop's `roles`.
 */
import type { View } from '../types'
import type { Grid, RoleTable } from './ascii'
import { overBase, propView, type PropDef } from './compose'

const idle = (...cels: Grid[]) => [{ name: 'idle', cels }]
const blank = (w: number, h: number): Grid => Array.from({ length: h }, () => '.'.repeat(w))

/** Place `g` at (x, y) in a w×h transparent canvas. */
function place(w: number, h: number, g: Grid, x: number, y: number): Grid {
  return overBase(blank(w, h), [g], [x, y])[0]
}

/** Flames: e = outer flame, y = inner flame; F = white-hot core. */
const FLAME_ROLES: RoleTable = {
  e: { key: 'flame', label: 'Flame', color: 12 },
  y: { key: 'core', label: 'Core', color: 14 },
}

/** Campfire-size flame, 7×7, four cels. */
const FLAME7: Grid[] = [
  [
    '...e...',
    '...ee..',
    '..eye..',
    '.eeye.e',
    '.eyyyee',
    'eyyFyye',
    'eyFFFye',
  ],
  [
    '..e....',
    '..ee.e.',
    '..eyee.',
    '.eyyee.',
    'eeyyye.',
    'eyyFyye',
    'eyFFFye',
  ],
  [
    '....e..',
    '...ee..',
    '.e.eye.',
    '.eeyye.',
    '.eyyyee',
    'eyyFyye',
    'eyFFFye',
  ],
  [
    '.......',
    '...e...',
    '..eye..',
    '.eeyee.',
    '.eyyyee',
    'eyyFyye',
    'eyFFFye',
  ],
]

// ================================================================= fantasy

const torch: PropDef = {
  name: 'torch',
  label: 'Wall torch',
  theme: 'fantasy',
  fps: 8,
  roles: { ...FLAME_ROLES, w: { key: 'handle', label: 'Handle', color: 6 } },
  loops: idle(
    ...overBase(
      [
        '.....',
        '.....',
        '.....',
        '.....',
        '.....',
        '.....',
        '.8w8.',
        '.8w8.',
        '..w..',
        '.888.',
        '..w..',
        '..w..',
      ],
      [
        ['..e..', '..ee.', '.eye.', '.eyye', 'eyFye', 'eyyye'],
        ['...e.', '..ee.', '.eyee', '.eyye', 'eyyFe', 'eyyye'],
        ['.e...', '.ee..', '.eye.', 'eyye.', 'eyFye', 'eyyye'],
        ['.....', '..e..', '.eee.', '.eyye', 'eyFye', 'eyyye'],
      ],
    ),
  ),
}

const flag: PropDef = {
  name: 'flag',
  label: 'Waving flag',
  theme: 'fantasy',
  fps: 6,
  roles: {
    k: { key: 'flag', label: 'Flag', color: 4 },
    a: { key: 'emblem', label: 'Emblem', color: 14 },
    w: { key: 'pole', label: 'Pole', color: 6 },
  },
  loops: idle(
    ...overBase(
      ['E........', ...Array.from({ length: 17 }, () => 'w........')],
      [
        ['kkk.....', 'kkkkk...', 'kkakkkkk', 'kaaakkkk', 'kkakkkkk', 'kkkkkkk.', '...kkk..'],
        ['kkkk....', 'kkkkkkk.', 'kkakkkkk', 'kaaakkkk', 'kkakkkk.', 'kkkkk...', '........'],
        ['kkk...kk', 'kkkkkkkk', 'kkakkkkk', 'kaaakkkk', 'kkakkkkk', 'kkk.....', '........'],
        ['kk......', 'kkkk..kk', 'kkakkkkk', 'kaaakkkk', 'kkakkkkk', 'kkkkkkk.', 'kkk.....'],
      ],
      [1, 1],
    ),
  ),
}

/** Door (12×38, walker height) whose panel narrows as it swings open on its left hinge. */
function doorCel(panel: number): Grid {
  const rows: string[] = ['.gggggggggg.', 'gggggggggggg']
  for (let y = 2; y < 38; y++) {
    let row = 'g'
    for (let x = 0; x < 10; x++) {
      if (x >= panel) row += '0'
      else if (panel === 1) row += 'd'
      else if (y === 8 || y === 31) row += 'm'
      else if (x === panel - 2 && y === 20 && panel >= 4) row += 'E'
      else row += x % 3 === 2 ? 'd' : 'w'
    }
    rows.push(row + 'g')
  }
  return rows
}

const door: PropDef = {
  name: 'door',
  label: 'Door opening',
  theme: 'fantasy',
  fps: 4,
  roles: {
    g: { key: 'frame', label: 'Frame', color: 8 },
    w: { key: 'door', label: 'Door', color: 6 },
    d: { key: 'planks', label: 'Plank lines', color: 0 },
    m: { key: 'bands', label: 'Iron bands', color: 8 },
  },
  loops: [
    { name: 'open', cels: [doorCel(10), doorCel(7), doorCel(4), doorCel(1)] },
    { name: 'close', cels: [doorCel(1), doorCel(4), doorCel(7), doorCel(10)] },
  ],
}

const CHEST: Grid = [
  '...........',
  '...........',
  '.wwwwwwwww.',
  '.w0000000w.',
  '.w0000000w.',
  '.wEEE6EEEw.',
  'EE6EEEEE6EE',
  'wwwwwwwwwww',
  'w6666m6666w',
  'w666mEm666w',
  'w6666m6666w',
  'wwwwwwwwwww',
]

const treasure: PropDef = {
  name: 'treasure',
  label: 'Treasure chest',
  theme: 'fantasy',
  fps: 6,
  roles: {
    w: { key: 'wood', label: 'Wood', color: 6 },
    m: { key: 'metal', label: 'Metal', color: 7 },
  },
  loops: idle(
    ...overBase(CHEST, [
      place(11, 8, ['.F.', 'FFF', '.F.'], 1, 4),
      place(11, 8, ['F'], 2, 5),
      place(11, 8, ['.F.', 'FFF', '.F.'], 5, 3),
      place(11, 8, ['F'], 6, 5),
      place(11, 8, ['.F.', 'FFF', '.F.'], 8, 5),
      place(11, 8, ['F'], 9, 6),
    ]),
  ),
}

const fireplaceFire: PropDef = {
  name: 'fireplace-fire',
  label: 'Fireplace fire',
  theme: 'fantasy',
  fps: 8,
  roles: { ...FLAME_ROLES, w: { key: 'logs', label: 'Logs', color: 6 } },
  loops: idle(
    ...[0, 1, 2, 3].map((i) =>
      overBase(
        overBase(
          [
            ...blank(13, 7),
            '.wwwwwwwwwww.',
            'wwww6ww6wwwww',
          ],
          [FLAME7[i]],
          [0, 0],
        )[0],
        [FLAME7[(i + 2) % 4]],
        [6, 1],
      )[0],
    ),
  ),
}

// ================================================================= nature

const campfire: PropDef = {
  name: 'campfire',
  label: 'Campfire',
  theme: 'nature',
  fps: 8,
  roles: {
    ...FLAME_ROLES,
    w: { key: 'logs', label: 'Logs', color: 6 },
    r: { key: 'stones', label: 'Stones', color: 8 },
  },
  loops: idle(
    ...overBase(
      [
        ...blank(11, 7),
        '..ww...ww..',
        '...wwwww...',
        '.rr.www.rr.',
        'r7rr7r7rr7r',
      ],
      FLAME7,
      [2, 0],
    ),
  ),
}

const waterSparkle: PropDef = {
  name: 'water-sparkle',
  label: 'Water sparkle',
  theme: 'nature',
  fps: 5,
  roles: {
    a: { key: 'glint', label: 'Glint', color: 15 },
    b: { key: 'shimmer', label: 'Shimmer', color: 11 },
  },
  loops: idle(
    ['..a........bb..', '.bbb...........', '.........bb....', '....bb.......a.'],
    ['.bbb.......b...', '........a......', '..........bbb..', '.....a.........'],
    ['...........bb..', '..a.......b....', '.bb......a.....', '..........b..bb'],
    ['........a......', '.bb..........b.', '..........bb...', '..bbb..........'],
  ),
}

const bird: PropDef = {
  name: 'bird',
  label: 'Bird flying',
  theme: 'nature',
  fps: 8,
  roles: { k: { key: 'bird', label: 'Bird', color: 0 } },
  loops: idle(
    ['k.....k', '.k...k.', '..kkk..', '...k...', '.......'],
    ['.......', 'kk...kk', '.kkkkk.', '...k...', '.......'],
    ['.......', '.......', '..kkk..', '.kkkkk.', 'k..k..k'],
    ['.......', 'kk...kk', '.kkkkk.', '...k...', '.......'],
  ),
}

const smoke: PropDef = {
  name: 'smoke',
  label: 'Smoke puff',
  theme: 'nature',
  fps: 5,
  roles: {
    o: { key: 'smoke', label: 'Smoke', color: 7 },
    d: { key: 'shade', label: 'Shade', color: 8 },
  },
  loops: idle(
    place(9, 20, ['oo', 'oo', 'dd'], 3, 17),
    place(9, 20, ['.o.', 'ooo', 'ooo', 'ood', '.d.'], 3, 12),
    place(9, 20, ['.oo.', 'oooo', 'oooo', 'oooo', 'oood', '.dd.'], 2, 7),
    place(9, 20, ['..oo...', '.oooo..', 'oooooo.', 'ooooooo', 'ooooooo', '.oooodd', '..ddd..'], 1, 1),
    place(9, 20, ['...o.....', '..oo..o..', '.o...ooo.', 'oo....o..', '.o..o....', '...oo....', '....d....'], 0, 0),
  ),
}

const fish: PropDef = {
  name: 'fish',
  label: 'Fish jumping',
  theme: 'nature',
  fps: 8,
  roles: {
    f: { key: 'fish', label: 'Fish', color: 7 },
    b: { key: 'splash', label: 'Splash', color: 11 },
  },
  loops: idle(
    place(14, 10, ['b.b.', '.bb.', 'bFFb'], 1, 7),
    place(14, 10, ['..ff', '.ff0', 'ff..', 'f...'], 2, 3),
    place(14, 10, ['f.ff..', '.ffff0', 'f.ff..'], 4, 0),
    place(14, 10, ['f...', 'ff..', '.ff0', '..ff'], 8, 3),
    place(14, 10, ['.b.b', 'b.f.', 'bFFb'], 9, 7),
    place(14, 10, ['bb..bb', '..bb..'], 8, 8),
  ),
}

const butterfly: PropDef = {
  name: 'butterfly',
  label: 'Butterfly',
  theme: 'nature',
  fps: 8,
  roles: {
    y: { key: 'wings', label: 'Wings', color: 14 },
    k: { key: 'body', label: 'Body', color: 0 },
  },
  loops: idle(
    place(5, 5, ['yy.yy', 'yykyy', '.yky.'], 0, 0),
    place(5, 5, ['.y.y.', '.yky.', '..k..'], 0, 1),
    place(5, 5, ['..y..', '..k..', '..k..'], 0, 2),
    place(5, 5, ['.y.y.', '.yky.', '..k..'], 0, 1),
  ),
}

// ================================================================= spooky

const candle: PropDef = {
  name: 'candle',
  label: 'Candle',
  theme: 'spooky',
  fps: 6,
  roles: {
    y: { key: 'flame', label: 'Flame', color: 14 },
    x: { key: 'wax', label: 'Wax', color: 15 },
    m: { key: 'holder', label: 'Holder', color: 6 },
  },
  loops: idle(
    ...overBase(
      ['.....', '.....', '.....', '..0..', '.xxx.', '.xxx.', '.xxx.', '.xxx.', '.xxx.', '.xxx.', 'mmmmm', '.mmm.'],
      [
        ['..y..', '..y..', '.yFy.'],
        ['...y.', '..yy.', '..Fy.'],
        ['.y...', '.yy..', '.yF..'],
        ['.....', '..y..', '.yFy.'],
      ],
    ),
  ),
}

const bat: PropDef = {
  name: 'bat',
  label: 'Bat flapping',
  theme: 'spooky',
  fps: 10,
  roles: { k: { key: 'bat', label: 'Bat', color: 0 } },
  loops: idle(
    ['k.........k', 'kk..k.k..kk', '.kk.CkC.kk.', '..kkkkkkk..', '....kkk....', '.....k.....'],
    ['...........', '....k.k....', '.kkkCkCkkk.', 'kkkkkkkkkkk', 'k.k.kkk.k.k', '.....k.....'],
    ['...........', '....k.k....', '....CkC....', '..kkkkkkk..', '.kk.kkk.kk.', 'kk...k...kk'],
    ['...........', '....k.k....', '.kkkCkCkkk.', 'kkkkkkkkkkk', 'k.k.kkk.k.k', '.....k.....'],
  ),
}

const WISP_BOB = [0, 1, 2, 1]
const wisp: PropDef = {
  name: 'wisp',
  label: 'Ghost wisp',
  theme: 'spooky',
  fps: 6,
  roles: {
    o: { key: 'glow', label: 'Glow', color: 11 },
    i: { key: 'core', label: 'Core', color: 15 },
  },
  loops: idle(
    ...[
      ['..3..', '.3o3.', '3oio3', '.oio.', '..o..', '..3..', '.3...'],
      ['..3..', '.3o3.', '3oio3', '.oio.', '..o..', '...3.', '.....'],
      ['.3...', '.3o3.', '3oio3', '.oio.', '..o..', '..3..', '...3.'],
      ['...3.', '.3o3.', '3oio3', '.oio.', '..o..', '.3...', '.....'],
    ].map((g, i) => place(5, 10, g, 0, 2 - WISP_BOB[i] + 1)),
  ),
}

const lantern: PropDef = {
  name: 'lantern',
  label: 'Hanging lantern',
  theme: 'spooky',
  fps: 5,
  roles: {
    m: { key: 'frame', label: 'Frame', color: 0 },
    y: { key: 'glow', label: 'Glow', color: 14 },
    e: { key: 'flame', label: 'Flame', color: 12 },
  },
  loops: idle(
    ...overBase(
      ['..8..', '..8..', '.mmm.', 'mmmmm', 'm...m', 'm...m', 'm...m', 'mmmmm', '.mmm.'],
      [
        ['yyy', 'yFy', 'yey'],
        ['yyy', 'yFy', 'yyy'],
        ['yey', 'yFy', 'yey'],
      ],
      [1, 4],
    ),
  ),
}

const cauldron: PropDef = {
  name: 'cauldron',
  label: 'Bubbling cauldron',
  theme: 'spooky',
  fps: 6,
  roles: {
    g: { key: 'brew', label: 'Brew', color: 10 },
    b: { key: 'bubbles', label: 'Bubbles', color: 2 },
    k: { key: 'pot', label: 'Pot', color: 8 },
    ...FLAME_ROLES,
  },
  loops: idle(
    ...overBase(
      [
        '...........',
        '...........',
        '...........',
        '...........',
        '.kgggggggk.',
        'kkkkkkkkkkk',
        'kkkkkkkkkkk',
        'kkkkkkkkkkk',
        '.kkkkkkkkk.',
        '.kkkkkkkkk.',
        '..kkkkkkk..',
        '..k.....k..',
        '.kk.....kk.',
      ],
      [
        ['...........', '....g......', '...g.......', '..b.....g..', '.kgbgggbgk.', ...blank(11, 6), '...e.y.e...', '...eyyye...'],
        ['.....g.....', '...........', '........g..', '...g..b....', '.kggbgggbk.', ...blank(11, 6), '..e.eye....', '...eyyye...'],
        ['........g..', '....g......', '...........', '.......b...', '.kbgggbggk.', ...blank(11, 6), '...eye.e...', '...eyyye...'],
        ['...........', '........g..', '.....g.....', '...b.......', '.kggbggbgk.', ...blank(11, 6), '....e.eye..', '...eyyye...'],
      ],
    ),
  ),
}

// ================================================================= sci-fi

/** Panel with a scrolling trace on its screen and lights blinking in turn. */
function consoleCel(i: number): Grid {
  const traces = [
    ['.A..', 'A.A.', '...A'],
    ['A..A', '.A..', '..A.'],
    ['..A.', '.A.A', 'A...'],
    ['.A.A', 'A...', '..A.'],
  ]
  const on = ['C', 'A', 'E', 'B']
  const off = ['4', '2', '6', '3']
  const light = (n: number) => ((n + i) % 4 === 0 || (n * 3 + i) % 4 === 1 ? on[n] : off[n])
  const t = traces[i]
  return [
    'kkkkkkkkkkkkkk',
    'kmmmmmmmmmmmmk',
    `km0${t[0]}0m${light(0)}m${light(1)}mk`,
    `km0${t[1]}0mmmmmk`,
    `km0${t[2]}0m${light(2)}m${light(3)}mk`,
    'kmmmmmmmmmmmmk',
    'kkkkkkkkkkkkkk',
  ]
}

const consoleLights: PropDef = {
  name: 'console',
  label: 'Blinking console',
  theme: 'scifi',
  fps: 4,
  roles: {
    k: { key: 'edge', label: 'Edge', color: 8 },
    m: { key: 'panel', label: 'Panel', color: 7 },
  },
  loops: idle(consoleCel(0), consoleCel(1), consoleCel(2), consoleCel(3)),
}

/** Dish seen as it turns: front, three-quarter, edge, back and round again. */
const RADAR_DISH: Grid[] = [
  ['..mmm..', '.m888m.', 'm88888m', 'm88088m', 'm88888m', '.m888m.', '..mmm..'],
  ['...mm..', '..m88m.', '..m888m', '..m808m', '..m888m', '..m88m.', '...mm..'],
  ['...m...', '...m...', '...mm..', '...mmm.', '...mm..', '...m...', '...m...'],
  ['..mm...', '.mmmm..', '.mmmmm.', '.mmmmm.', '.mmmmm.', '.mmmm..', '..mm...'],
  ['..mmm..', '.mmmmm.', 'mmmmmmm', 'mmmmmmm', 'mmmmmmm', '.mmmmm.', '..mmm..'],
  ['...mm..', '..mmmm.', '.mmmmm.', '.mmmmm.', '.mmmmm.', '..mmmm.', '...mm..'],
  ['...m...', '...m...', '..mm...', '.mmm...', '..mm...', '...m...', '...m...'],
  ['..mm...', '.m88m..', 'm888m..', 'm808m..', 'm888m..', '.m88m..', '..mm...'],
]

const radar: PropDef = {
  name: 'radar',
  label: 'Radar dish',
  theme: 'scifi',
  fps: 6,
  roles: {
    m: { key: 'dish', label: 'Dish', color: 7 },
    k: { key: 'mast', label: 'Mast', color: 8 },
    a: { key: 'beacon', label: 'Beacon', color: 12 },
  },
  loops: idle(
    ...RADAR_DISH.map((dish, i) => [
      ...dish,
      '...k...',
      '...k...',
      '...k...',
      '..kkk..',
      i % 4 === 0 ? '..kak..' : '..kkk..',
      '.kkkkk.',
      'kkkkkkk',
    ]),
  ),
}

/** Sliding hatch (14×36): two panels part from the middle seam. */
function hatchCel(gap: number): Grid {
  const rows = ['kkkkkkkkkkkkkk', 'k6E6E6E6E6E6Ek', 'kkkkkkkkkkkkkk']
  for (let y = 0; y < 32; y++) {
    let row = 'k'
    for (let x = 0; x < 12; x++) {
      const left = x < 6 - gap
      const right = x >= 6 + gap
      if (!left && !right) row += '0'
      else if (x === 5 - gap || x === 6 + gap) row += 'd'
      else if ((y === 15 || y === 16) && (x === 2 || x === 9)) row += 'a'
      else if (y === 4 || y === 27) row += 'd'
      else row += 'm'
    }
    rows.push(row + 'k')
  }
  rows.push('kkkkkkkkkkkkkk')
  return rows
}

const hatch: PropDef = {
  name: 'hatch',
  label: 'Sliding hatch',
  theme: 'scifi',
  fps: 6,
  roles: {
    k: { key: 'frame', label: 'Frame', color: 8 },
    m: { key: 'door', label: 'Door', color: 7 },
    d: { key: 'seam', label: 'Seam', color: 8 },
    a: { key: 'light', label: 'Light', color: 12 },
  },
  loops: [
    { name: 'open', cels: [hatchCel(0), hatchCel(2), hatchCel(4), hatchCel(6)] },
    { name: 'close', cels: [hatchCel(6), hatchCel(4), hatchCel(2), hatchCel(0)] },
  ],
}

// ================================================================= modern

const LETTERS: Record<string, Grid> = {
  B: ['bb.', 'b.b', 'bb.', 'b.b', 'bb.'],
  A: ['.b.', 'b.b', 'bbb', 'b.b', 'b.b'],
  R: ['bb.', 'b.b', 'bb.', 'b.b', 'b.b'],
}

function neonCel(tube: boolean, letters: boolean): Grid {
  const w = 15
  const rows: string[] = []
  const t = tube ? 'n' : '5'
  rows.push(t.repeat(w))
  for (let y = 0; y < 7; y++) {
    let row = t
    for (let x = 0; x < w - 2; x++) {
      const li = Math.floor((x - 1) / 4)
      const lx = (x - 1) % 4
      const ch = y >= 1 && y <= 5 && x >= 1 && lx < 3 && li < 3 ? LETTERS['BAR'[li]][y - 1][lx] : '.'
      row += ch === 'b' ? (letters ? 'b' : '4') : '0'
    }
    rows.push(row + t)
  }
  rows.push(t.repeat(w))
  return rows
}

const neon: PropDef = {
  name: 'neon',
  label: 'Neon bar sign',
  theme: 'modern',
  fps: 6,
  roles: {
    n: { key: 'tube', label: 'Tube', color: 13 },
    b: { key: 'letters', label: 'Letters', color: 12 },
  },
  loops: idle(
    neonCel(true, true),
    neonCel(true, true),
    neonCel(true, true),
    neonCel(true, false),
    neonCel(true, true),
    neonCel(false, false),
  ),
}

function trafficCel(lit: 0 | 1 | 2): Grid {
  const lamp = (n: number, on: string, off: string) => (lit === n ? on : off).repeat(3)
  return [
    'kkkkk',
    `k${lamp(0, 'C', '4')}k`,
    `k${lamp(0, 'C', '4')}k`,
    'kkkkk',
    `k${lamp(1, 'E', '6')}k`,
    `k${lamp(1, 'E', '6')}k`,
    'kkkkk',
    `k${lamp(2, 'A', '2')}k`,
    `k${lamp(2, 'A', '2')}k`,
    'kkkkk',
    ...Array.from({ length: 12 }, () => '..p..'),
    '.ppp.',
  ]
}

const trafficLight: PropDef = {
  name: 'traffic-light',
  label: 'Traffic light',
  theme: 'modern',
  fps: 1,
  roles: {
    k: { key: 'housing', label: 'Housing', color: 0 },
    p: { key: 'pole', label: 'Pole', color: 8 },
  },
  loops: idle(trafficCel(2), trafficCel(2), trafficCel(1), trafficCel(0), trafficCel(0)),
}

const TV: Grid = [
  '..8...8...',
  '...8.8....',
  '....8.....',
  'wwwwwwwwww',
  'w........w',
  'w........w',
  'w........w',
  'w........w',
  'wwwwwwwmmw',
  '.w......w.',
]

const tv: PropDef = {
  name: 'tv',
  label: 'Flickering TV',
  theme: 'modern',
  fps: 8,
  roles: {
    w: { key: 'cabinet', label: 'Cabinet', color: 6 },
    m: { key: 'knobs', label: 'Knobs', color: 14 },
  },
  loops: idle(
    ...overBase(
      TV,
      [
        ['F7B8F77B', '7F87BF7F', 'B7F7F8B7', '87BF7F7F'],
        ['7BF7F8F7', 'F7B7F7B8', '7F8B7FF7', 'BF7F87B7'],
        ['B7F87BF7', '7FB7F7F8', 'F7B7F8B7', '7F7BF7F7'],
      ],
      [1, 4],
    ),
  ),
}

// ================================================================= export

export const PROP_DEFS: PropDef[] = [
  torch,
  flag,
  door,
  treasure,
  fireplaceFire,
  campfire,
  waterSparkle,
  bird,
  smoke,
  fish,
  butterfly,
  candle,
  bat,
  wisp,
  lantern,
  cauldron,
  consoleLights,
  radar,
  hatch,
  neon,
  trafficLight,
  tv,
]

export const PROP_VIEWS: View[] = PROP_DEFS.map(propView)
