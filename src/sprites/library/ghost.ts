/**
 * The ghost has no legs, so it is drawn whole instead of from a base body:
 * each facing is one sheet shape plus a wavy hem, bobbing up and down over
 * four cels. It floats a few pixels above its baseline (the ground).
 */
import type { Grid } from './ascii'
import type { CustomCharacterDef, Facing } from './compose'

/** Rows under the ghost at its lowest point, so it hovers. */
const HOVER = 3
const BOB = [0, 1, 2, 1]

const SHAPES: Record<Facing, Grid> = {
  right: [
    '...ggg...',
    '..ggggg..',
    '.ggggggg.',
    '.ggggggg.',
    '.ggg0gg0.',
    '.ggg0gg0.',
    '.ggggggg.',
    '.ggggggg.',
    '.gggggggg',
    '.gggggggg',
    '.ggggggg.',
    'gggggggg.',
    'ggggggg..',
    'ggggggg..',
    'ooooooo..',
    'oooooo...',
    'ooooo....',
  ],
  down: [
    '...ggg...',
    '..ggggg..',
    '.ggggggg.',
    '.ggggggg.',
    '.g0ggg0g.',
    '.g0ggg0g.',
    '.ggggggg.',
    '.ggg0ggg.',
    '.ggg0ggg.',
    'ggggggggg',
    'ggggggggg',
    'g.ggggg.g',
    '..ggggg..',
    '..ggggg..',
    '.ooooooo.',
    '.ooooooo.',
    'ooooooooo',
  ],
  up: [
    '...ggg...',
    '..ggggg..',
    '.ggggggg.',
    '.ggggggg.',
    '.ggggggg.',
    '.ggggggg.',
    '.ggggggg.',
    '.ggggggg.',
    '.ggggggg.',
    'ggggggggg',
    'ggggggggg',
    'g.ggggg.g',
    '..ggggg..',
    '..ggggg..',
    '.ooooooo.',
    '.ooooooo.',
    'ooooooooo',
  ],
}

/** Two-row wavy hem per cel (the wisps drift sideways as it floats). */
const HEMS: Record<Facing, Grid[]> = {
  right: [
    ['oooo.....', 'oo.......'],
    ['.ooo.....', '..o......'],
    ['ooo.o....', '.o.......'],
    ['oo.oo....', 'o........'],
  ],
  down: [
    ['oo.ooo.oo', 'o...o...o'],
    ['.ooo.ooo.', '..o...o..'],
    ['oo.ooo.oo', '.o...o...'],
    ['o.ooo.ooo', 'o...o...o'],
  ],
  up: [
    ['oo.ooo.oo', 'o...o...o'],
    ['.ooo.ooo.', '..o...o..'],
    ['oo.ooo.oo', '.o...o...'],
    ['o.ooo.ooo', 'o...o...o'],
  ],
}

function cels(facing: Facing): Grid[] {
  const shape = [...SHAPES[facing]]
  const w = shape[0].length
  const blank = '.'.repeat(w)
  const maxBob = Math.max(...BOB)
  return BOB.map((b, i) => {
    const body = [...shape, ...HEMS[facing][i]]
    const top = Array.from({ length: maxBob - b }, () => blank)
    const bottom = Array.from({ length: b + HOVER }, () => blank)
    return [...top, ...body, ...bottom]
  })
}

export const GHOST: CustomCharacterDef = {
  name: 'ghost',
  label: 'Ghost',
  theme: 'spooky',
  roles: {
    g: { key: 'ghost', label: 'Ghost', color: 15 },
    o: { key: 'wisp', label: 'Wisps', color: 7 },
  },
  facings: { right: cels('right'), down: cels('down'), up: cels('up') },
  fps: 6,
}
