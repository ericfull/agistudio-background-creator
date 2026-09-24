/**
 * Part overlays for the base bodies. Head-anchored parts are drawn relative
 * to the shared 7×7 head box (row 0 = top of the hair), so they fit every
 * body. Body-anchored parts use body rows and say which bodies they fit.
 *
 * Reference head box (right / down / up):
 *
 *   ..hhh..   ..hhh..   ..hhh..
 *   ..hhhh.   ..hhh..   ..hhh..
 *   ..hhss.   ..sss..   ..hhh..
 *   ..hhes.   ..ese..   ..hhh..
 *   ..ssss.   ..sss..   ..hhh..
 *   ...ss..   ...s...   ...s...
 *   ...s...   ...s...   ...s...
 *
 * Adult rows: torso 7–14, belt 15, hips 16, legs 17–30, feet 31.
 * Short rows: torso 7–11, belt 12, hips 13, legs 14–20, feet 21.
 */
import type { Grid } from './ascii'
import type { PartDef, PartLayer } from './compose'

const head = (at: [number, number], ...cels: Grid[]): PartLayer => ({ anchor: 'head', at, cels })
const body = (at: [number, number], ...cels: Grid[]): PartLayer => ({ at, cels })

// ================================================================= hats & helmets

export const featherCap: PartDef = {
  id: 'feather-cap',
  label: 'Feathered cap',
  slot: 'hat',
  roles: { a: { key: 'feather', label: 'Feather', color: 15 } },
  layers: {
    right: [head([0, -3], [
      'a......',
      '.a.....',
      '.akkk..',
      '..kkkkk',
    ])],
    down: [head([0, -3], [
      '.....a.',
      '....a..',
      '..kkka.',
      '.kkkkk.',
    ])],
    up: [head([0, -3], [
      '.a.....',
      '..a....',
      '.akkk..',
      '.kkkkk.',
    ])],
  },
}

export const knightHelm: PartDef = {
  id: 'knight-helm',
  label: 'Plumed helmet',
  slot: 'hat',
  roles: {
    m: { key: 'helmet', label: 'Helmet', color: 7 },
    a: { key: 'plume', label: 'Plume', color: 4 },
  },
  layers: {
    right: [head([0, -3], [
      '...aa..',
      '.aaa...',
      '..mmm..',
      '.mmmmm.',
      '.mmmmmm',
      '.mmm...',
      '.mmm...',
      '.mm....',
    ])],
    down: [head([0, -3], [
      '...a...',
      '..aaa..',
      '..mmm..',
      '.mmmmm.',
      '.mmmmm.',
      '.mm.mm.',
      '.m...m.',
      '.m...m.',
    ])],
    up: [head([0, -3], [
      '...a...',
      '..aaa..',
      '..mmm..',
      '.mmmmm.',
      '.mmmmm.',
      '.mmmmm.',
      '.mmmmm.',
      '..mmm..',
    ])],
  },
}

export const wizardHat: PartDef = {
  id: 'wizard-hat',
  label: 'Pointed hat',
  slot: 'hat',
  roles: { a: { key: 'stars', label: 'Stars', color: 14 } },
  layers: {
    right: [head([0, -7], [
      'k......',
      '.k.....',
      '.kk....',
      '..kk...',
      '..kak..',
      '..kkk..',
      '.kkkkk.',
      'kkkkkkk',
    ])],
    down: [head([0, -7], [
      '...k...',
      '...k...',
      '..kkk..',
      '..kak..',
      '..kkk..',
      '.kkkkk.',
      '.kkkkk.',
      'kkkkkkk',
    ])],
    up: [head([0, -7], [
      '...k...',
      '...k...',
      '..kkk..',
      '..kkk..',
      '..kkk..',
      '.kkkkk.',
      '.kkkkk.',
      'kkkkkkk',
    ])],
  },
}

// ================================================================= hair & faces

export const longHair: PartDef = {
  id: 'long-hair',
  label: 'Long hair',
  slot: 'hair',
  layers: {
    right: [head([0, 0], [
      '.......',
      '.......',
      '.h.....',
      '.hh....',
      '.hh....',
      '.hh....',
    ])],
    down: [head([0, 0], [
      '.......',
      '.hhhhh.',
      '.h...h.',
      '.h...h.',
      '.h...h.',
      '.h...h.',
    ])],
    up: [head([0, 0], [
      '.......',
      '.hhhhh.',
      '.hhhhh.',
      '.hhhhh.',
      '.hhhhh.',
      '.hhhhh.',
      '..hhh..',
    ])],
  },
}

export const longBeard: PartDef = {
  id: 'long-beard',
  label: 'Long beard',
  slot: 'face',
  layers: {
    right: [head([0, 4], [
      '...bbb.',
      '...bbb.',
      '...bbb.',
      '...bb..',
      '...bb..',
      '...b...',
    ])],
    down: [head([0, 4], [
      '..bbb..',
      '..bbb..',
      '..bbb..',
      '..bbb..',
      '...b...',
      '...b...',
    ])],
  },
}

// ================================================================= outfits

export const tunicSkirt: PartDef = {
  id: 'tunic',
  label: 'Tunic',
  slot: 'top',
  bodies: ['adult'],
  layers: {
    right: [body([0, 16], [
      '..ccc..',
      '..cccc.',
      '.ccccc.',
    ])],
    down: [body([0, 16], [
      '..ccc..',
      '..ccc..',
      '.ccccc.',
    ])],
    up: [body([0, 16], [
      '..ccc..',
      '..ccc..',
      '.ccccc.',
    ])],
  },
}

export const boots: PartDef = {
  id: 'boots',
  label: 'Boots',
  slot: 'bottom',
  layers: {
    right: [{ recolor: { p: 'f' }, rows: [-4, -1] }],
    down: [{ recolor: { p: 'f' }, rows: [-4, -1] }],
    up: [{ recolor: { p: 'f' }, rows: [-4, -1] }],
  },
}

export const surcoat: PartDef = {
  id: 'surcoat',
  label: 'Surcoat',
  slot: 'top',
  bodies: ['adult'],
  roles: { a: { key: 'surcoat', label: 'Surcoat', color: 4 } },
  layers: {
    right: [
      { recolor: { c: 'a' }, rows: [8, 14] },
      body([0, 16], ['..aaa..', '..aaaa.', '.aaaaa.']),
    ],
    down: [
      { recolor: { c: 'a' }, rows: [8, 14] },
      body([0, 16], ['..aaa..', '..aaa..', '..aaa..']),
    ],
    up: [
      { recolor: { c: 'a' }, rows: [8, 14] },
      body([0, 16], ['..aaa..', '..aaa..', '..aaa..']),
    ],
  },
}

/** Full-length robe: widens toward the hem and sways with the stride. */
export const robe: PartDef = {
  id: 'robe',
  label: 'Robe',
  slot: 'outfit',
  bodies: ['adult'],
  layers: {
    right: [body([0, 16],
      [
        '__ccc__',
        '__ccc__',
        '__cccc_',
        '__cccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_cccccc',
        'ccccccc',
        'cccccc_',
        'cccccc_',
        'cccccc_',
        'cccccc_',
      ],
      [
        '__ccc__',
        '__ccc__',
        '__cccc_',
        '__cccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        'cccccc_',
        'cccccc_',
        'cccccc_',
        'cccccc_',
      ],
      [
        '__ccc__',
        '__ccc__',
        '__ccc__',
        '__ccc__',
        '__cccc_',
        '__cccc_',
        '__cccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
      ],
      // cels 3–5 repeat the stride
      [
        '__ccc__',
        '__ccc__',
        '__cccc_',
        '__cccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_cccccc',
        'ccccccc',
        'cccccc_',
        'cccccc_',
        'cccccc_',
        'cccccc_',
      ],
      [
        '__ccc__',
        '__ccc__',
        '__cccc_',
        '__cccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        'cccccc_',
        'cccccc_',
        'cccccc_',
        'cccccc_',
      ],
      [
        '__ccc__',
        '__ccc__',
        '__ccc__',
        '__ccc__',
        '__cccc_',
        '__cccc_',
        '__cccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
        '_ccccc_',
      ],
    )],
    down: [body([0, 16], [
      '..ccc..',
      '..ccc..',
      '..ccc..',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      'ccccccc',
      'ccccccc',
      'ccccccc',
      'ccccccc',
    ])],
    up: [body([0, 16], [
      '..ccc..',
      '..ccc..',
      '..ccc..',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      'ccccccc',
      'ccccccc',
      'ccccccc',
      'ccccccc',
    ])],
  },
}

export const gnomeHat: PartDef = {
  id: 'gnome-hat',
  label: 'Gnome hat',
  slot: 'hat',
  layers: {
    right: [head([0, -5], [
      'k......',
      '.k.....',
      '.kk....',
      '..kkk..',
      '..kkkk.',
      '..kkkk.',
      '.kkkkkk',
    ])],
    down: [head([0, -5], [
      '...k...',
      '...k...',
      '..kkk..',
      '..kkk..',
      '..kkk..',
      '.kkkkk.',
      '.kkkkk.',
    ])],
    up: [head([0, -5], [
      '...k...',
      '...k...',
      '..kkk..',
      '..kkk..',
      '..kkk..',
      '.kkkkk.',
      '.kkkkk.',
    ])],
  },
}

export const policeCap: PartDef = {
  id: 'police-cap',
  label: 'Police cap',
  slot: 'hat',
  roles: { a: { key: 'badge', label: 'Badge', color: 14 } },
  layers: {
    right: [head([0, -2], [
      '.kkkkk.',
      '..kkak.',
      '..kkkk.',
      '....000',
    ])],
    down: [head([0, -2], [
      '.kkkkk.',
      '.kkakk.',
      '..kkk..',
      '..000..',
    ])],
    up: [head([0, -2], [
      '.kkkkk.',
      '.kkkkk.',
      '..kkk..',
    ])],
  },
}

// ================================================================= more hair & faces

export const balding: PartDef = {
  id: 'balding',
  label: 'Receding hair',
  slot: 'hair',
  layers: {
    right: [head([0, 0], ['..hss..', '..hhss.'])],
    down: [head([0, 0], ['..hhh..', '..sss..'])],
    up: [head([0, 0], ['..sss..', '..hhh..'])],
  },
}

export const widowsPeak: PartDef = {
  id: 'widows-peak',
  label: "Widow's peak",
  slot: 'hair',
  layers: {
    right: [head([0, 0], ['..hhh..', '.hhhhh.', '.hhhss.'])],
    down: [head([0, 0], ['..hhh..', '.hhhhh.', '...h...'])],
    up: [head([0, 0], ['..hhh..', '.hhhhh.', '.hhhhh.', '..hhh..'])],
  },
}

export const mustache: PartDef = {
  id: 'mustache',
  label: 'Mustache',
  slot: 'face',
  layers: {
    right: [head([0, 4], ['....hh.'])],
    down: [head([0, 4], ['..hhh..'])],
  },
}

// ================================================================= sci-fi heads

/** Replaces the head with a big bald dome, huge eyes and antennae. */
export const alienHead: PartDef = {
  id: 'alien-head',
  label: 'Alien head',
  slot: 'head',
  roles: { a: { key: 'antennae', label: 'Antennae', color: 14 } },
  layers: {
    right: [head([0, -4], [
      '.....a.',
      '....s..',
      '..ssss.',
      '.ssssss',
      '.ssssss',
      '.sss00s',
      '.sss00s',
      '..ssss.',
      '..sss._',
      '...s_..',
      '...s...',
    ])],
    down: [head([0, -4], [
      '.a...a.',
      '..s.s..',
      '.sssss.',
      'sssssss',
      'sssssss',
      's00s00s',
      's00s00s',
      '.sssss.',
      '..sss..',
      '...s...',
      '...s...',
    ])],
    up: [head([0, -4], [
      '.a...a.',
      '..s.s..',
      '.sssss.',
      'sssssss',
      'sssssss',
      'sssssss',
      'sssssss',
      '.sssss.',
      '..sss..',
      '...s...',
      '...s...',
    ])],
  },
}

/** Replaces the head with a boxy robot head: dark edges, visor, grille and antenna light. */
export const robotHead: PartDef = {
  id: 'robot-head',
  label: 'Robot head',
  slot: 'head',
  roles: {
    m: { key: 'metal', label: 'Metal', color: 7 },
    v: { key: 'visor', label: 'Visor', color: 12 },
    a: { key: 'light', label: 'Light', color: 14 },
  },
  layers: {
    right: [head([0, -3], [
      '...a...',
      '...0...',
      '.00000.',
      '.0mmm0.',
      '.0mmvv.',
      '.0mmm0.',
      '.0mmm0.',
      '.00000.',
      '...0_..',
      '...0...',
    ])],
    down: [head([0, -3], [
      '...a...',
      '...0...',
      '.00000.',
      '.0mmm0.',
      '.vvvvv.',
      '.0mmm0.',
      '.0m0m0.',
      '.00000.',
      '...0...',
      '...0...',
    ])],
    up: [head([0, -3], [
      '...a...',
      '...0...',
      '.00000.',
      '.0mmm0.',
      '.0mmm0.',
      '.0mmm0.',
      '.0mmm0.',
      '.00000.',
      '...0...',
      '...0...',
    ])],
  },
}

export const chestLight: PartDef = {
  id: 'chest-light',
  label: 'Chest panel',
  slot: 'top',
  roles: { a: { key: 'light', label: 'Light', color: 14 } },
  layers: {
    right: [{ ...body([0, 8], ['....0..', '....a..']), onlyOver: 'c' }],
    down: [{ ...body([0, 8], ['..000..', '..0a0..']), onlyOver: 'c' }],
  },
}

// ================================================================= modern outfits

export const badge: PartDef = {
  id: 'badge',
  label: 'Badge',
  slot: 'top',
  roles: { a: { key: 'badge', label: 'Badge', color: 14 } },
  layers: {
    right: [{ ...body([0, 9], ['....a..']), onlyOver: 'c' }],
    down: [{ ...body([0, 9], ['....a..']), onlyOver: 'c' }],
  },
}

/** Dark collar and zip so a pale jumpsuit still reads against pale walls. */
export const coverallSeams: PartDef = {
  id: 'coverall-seams',
  label: 'Collar and zip',
  slot: 'top',
  roles: { d: { key: 'seams', label: 'Seams', color: 8 } },
  layers: {
    right: [{ ...body([0, 7], ['....d..', '....d..']), onlyOver: 'c' }],
    down: [{ ...body([0, 7], ['..d.d..', '...d...', '...d...', '...d...', '...d...', '...d...', '...d...']), onlyOver: 'c' }],
    up: [{ ...body([0, 7], ['..ddd..']), onlyOver: 'c' }],
  },
}

export const openCollar: PartDef = {
  id: 'open-collar',
  label: 'Open collar',
  slot: 'top',
  roles: { a: { key: 'undershirt', label: 'Shirt', color: 0 } },
  layers: {
    right: [body([0, 7], ['....a..', '....a..'])],
    down: [body([0, 7], ['..asa..', '...a...', '...a...'])],
  },
}

export const vestAndBowtie: PartDef = {
  id: 'vest',
  label: 'Vest and bow tie',
  slot: 'top',
  roles: {
    a: { key: 'vest', label: 'Vest', color: 0 },
    x: { key: 'tie', label: 'Bow tie', color: 4 },
  },
  layers: {
    right: [
      { ...body([0, 8], ['..aa...', '..aa...', '..aa...', '..aa...', '..aa...', '..aa...', '..aa...']), onlyOver: 'c' },
      body([0, 7], ['....x..']),
    ],
    down: [
      { ...body([0, 8], ['..a.a..', '..a.a..', '..a.a..', '..a.a..', '..a.a..', '..aaa..', '..aaa..']), onlyOver: 'c' },
      body([0, 7], ['..xxx..']),
    ],
    up: [{ ...body([0, 8], ['..aaa..', '..aaa..', '..aaa..', '..aaa..', '..aaa..', '..aaa..', '..aaa..']), onlyOver: 'c' }],
  },
}

// ================================================================= spooky

/** Skull head (uses the shirt/bone letter 'c'). */
export const skull: PartDef = {
  id: 'skull',
  label: 'Skull',
  slot: 'head',
  layers: {
    right: [head([0, 0], [
      '..ccc..',
      '.ccccc.',
      '.ccc0c.',
      '.ccccc.',
      '..c0c0.',
      '...cc..',
      '...c...',
    ])],
    down: [head([0, 0], [
      '..ccc..',
      '.ccccc.',
      '.c0c0c.',
      '.ccccc.',
      '..c0c..',
      '..ccc..',
      '...c...',
    ])],
    up: [head([0, 0], [
      '..ccc..',
      '.ccccc.',
      '.ccccc.',
      '.ccccc.',
      '..ccc..',
      '...c...',
      '...c...',
    ])],
  },
}

/** Ribs and pelvis cut out of the torso (arms in front stay whole). */
export const ribcage: PartDef = {
  id: 'ribcage',
  label: 'Ribcage',
  slot: 'top',
  bodies: ['adult'],
  layers: {
    right: [{ ...body([0, 8], [
      '.......',
      '...__..',
      '.......',
      '...__..',
      '.......',
      '...__..',
      '...__..',
      '..c_c..',
    ]), onlyOver: 'ct' }],
    down: [{ ...body([0, 8], [
      '.......',
      '.._._..',
      '.......',
      '.._._..',
      '.......',
      '.._._..',
      '.._._..',
      '.......',
      '..._...',
    ]), onlyOver: 'ctp' }],
    up: [{ ...body([0, 8], [
      '.......',
      '.._._..',
      '.......',
      '.._._..',
      '.......',
      '.._._..',
      '.._._..',
      '.......',
      '..._...',
    ]), onlyOver: 'ctp' }],
  },
}

/** Vampire cape: behind the body from the side, open at the front, covering the back. */
export const cape: PartDef = {
  id: 'cape',
  label: 'Cape',
  slot: 'back',
  bodies: ['adult'],
  roles: {
    v: { key: 'cape', label: 'Cape', color: 0 },
    l: { key: 'lining', label: 'Lining', color: 4 },
  },
  layers: {
    right: [
      { at: [0, 4], under: true, cels: [
        [
          '.l.....',
          '.ll....',
          '.lv....',
          '.lvv...',
          '.lvv...',
          '.lvv...',
          '.lvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvv....',
          'lv.....',
          'l......',
        ],
        [
          '.l.....',
          '.ll....',
          '.lv....',
          '.lvv...',
          '.lvv...',
          '.lvv...',
          '.lvv...',
          '.lvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvvv...',
          'lvv....',
          'lvv....',
          '.lv....',
          '.l.....',
        ],
      ] },
    ],
    down: [
      { at: [0, 4], under: true, cels: [[
        '.l...l.',
        '.l...l.',
        '.l...l.',
        'vv...vv',
        'v.....v',
        'v.....v',
        'v.....v',
        'v.....v',
        'v.....v',
        'v.....v',
        'v.....v',
        'v.....v',
        'v.....v',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'vl...lv',
        'v.....v',
      ]] },
    ],
    up: [
      { at: [0, 4], cels: [[
        '.l...l.',
        '.lvvvl.',
        '.vvvvv.',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'vvvvvvv',
        'v.v.v.v',
      ]] },
    ],
  },
}

export const shirtFront: PartDef = {
  id: 'shirt-front',
  label: 'Shirt front',
  slot: 'top',
  roles: { x: { key: 'shirtfront', label: 'Shirt front', color: 15 } },
  layers: {
    right: [{ ...body([0, 7], ['....x..', '....x..']), onlyOver: 'c' }],
    down: [{ ...body([0, 7], ['...x...', '...x...', '...x...']), onlyOver: 'c' }],
  },
}

/** Every part, for a future character creator (filter by `slot` and `bodies`). */
export const PARTS: PartDef[] = [
  featherCap,
  knightHelm,
  wizardHat,
  gnomeHat,
  policeCap,
  longHair,
  balding,
  widowsPeak,
  longBeard,
  mustache,
  alienHead,
  robotHead,
  skull,
  tunicSkirt,
  surcoat,
  robe,
  ribcage,
  vestAndBowtie,
  openCollar,
  shirtFront,
  badge,
  coverallSeams,
  chestLight,
  cape,
  boots,
]
