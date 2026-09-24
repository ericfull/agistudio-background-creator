/**
 * Base bodies with full AGI walk cycles: right (6 cels), down (4), up (4).
 * Letters: s skin, h hair, e eyes, c shirt, r sleeves (arms; same role as the
 * shirt unless a character overrides it), t belt, p pants, f shoes.
 *
 * Each cel is assembled from strips (head, torso, arm, legs) placed at fixed
 * rows so the pieces stay in step. Both bodies share the same 7×7 head box,
 * so hair and hats anchored to the head fit either body.
 */
import { CharCanvas, type Grid } from './ascii'
import type { BodyDef, BodyId, Facing } from './compose'

/** Stamp strips at [x, y] and read back a w×h grid. */
function build(w: number, h: number, ...strips: [Grid, number, number][]): Grid {
  const cv = new CharCanvas()
  for (const [g, x, y] of strips) cv.stamp(g, x, y)
  return cv.crop(0, 0, w, h)
}

// ------------------------------------------------------------------ heads (7×7)

export const HEAD: Record<Facing, Grid> = {
  right: [
    '..hhh..',
    '..hhhh.',
    '..hhss.',
    '..hhes.',
    '..ssss.',
    '...ss..',
    '...s...',
  ],
  down: [
    '..hhh..',
    '..hhh..',
    '..sss..',
    '..ese..',
    '..sss..',
    '...s...',
    '...s...',
  ],
  up: [
    '..hhh..',
    '..hhh..',
    '..hhh..',
    '..hhh..',
    '..hhh..',
    '...s...',
    '...s...',
  ],
}

// ------------------------------------------------------------------ side arms

/** Near arm for the side view, drawn from the shoulder row. `len` = rows to the hand. */
function sideArm(pose: 'back' | 'down' | 'fwd', len: number): Grid {
  const rows: string[] = []
  for (let y = 0; y <= len; y++) {
    const ch = y === len ? 's' : 'r'
    const t = y / len
    let x = 3
    if (pose === 'fwd') x = t < 0.45 ? 3 : t < 0.8 ? 4 : 5
    if (pose === 'back') x = t < 0.45 ? 3 : t < 0.8 ? 2 : 1
    rows.push('.......'.slice(0, x) + ch + '.......'.slice(x + 1))
  }
  return rows
}

const ARMS_R: ('back' | 'down' | 'fwd')[] = ['back', 'back', 'down', 'fwd', 'fwd', 'down']

// ------------------------------------------------------------------ front/back

/** Front/back torso of `n` shirt rows + belt; hands one row under the arm (per side). */
function torsoFB(n: number, handL: number, handR: number): Grid {
  const rows: string[] = []
  for (let y = 0; y <= n + 1; y++) {
    const arm = (hand: number) => (y === 0 ? '.' : y < hand ? 'r' : y === hand ? 's' : '.')
    const mid = y < n ? 'ccc' : y === n ? 'ttt' : 'ppp'
    rows.push(`.${arm(handL)}${mid}${arm(handR)}.`)
  }
  return rows
}

/**
 * Front/back legs `n` rows tall, feet on the last row. Legs sit on columns 2
 * and 4 with feet turned out to 1–2 and 4–5; `liftL`/`liftR` shorten a leg
 * so its foot comes off the ground.
 */
function legsFB(n: number, liftL: number, liftR: number): Grid {
  const rows: string[] = []
  const endL = n - 1 - liftL
  const endR = n - 1 - liftR
  for (let y = 0; y < n; y++) {
    const l = y < endL ? '.p' : y === endL ? 'ff' : '..'
    const r = y < endR ? 'p.' : y === endR ? 'ff' : '..'
    rows.push(`.${l}.${r}.`)
  }
  return rows
}

/**
 * Four-cel walk toward/away from the viewer: each foot lifts high, comes
 * down, then the other one steps; the opposite hand swings up with it.
 */
function frontBack(facing: 'down' | 'up', h: number, torsoRows: number, legRows: number, lift: number): Grid[] {
  const n = torsoRows
  const poses: [number, number, number, number][] = [
    [n - 2, n, 0, lift],
    [n - 1, n, 0, 1],
    [n, n - 2, lift, 0],
    [n, n - 1, 1, 0],
  ]
  return poses.map(([hl, hr, liftL, liftR]) =>
    build(
      7,
      h,
      [legsFB(legRows, liftL, liftR), 0, h - legRows],
      [torsoFB(torsoRows, hl, hr), 0, 7],
      [HEAD[facing], 0, 0],
    ),
  )
}

// ------------------------------------------------------------------ adult (7 × 32)

/** Side-view legs, rows 16–31: hips, then the 6-cel stride. */
const ADULT_LEGS_R: Grid[] = [
  // 0 contact: wide stride
  [
    '..ppp..',
    '..p.p..',
    '..p.p..',
    '.pp.pp.',
    '.p...p.',
    '.p...p.',
    '.p...p.',
    '.p...p.',
    'p....p.',
    'p....p.',
    'p....p.',
    'p....p.',
    'p....p.',
    'p....p.',
    'f....p.',
    'f....ff',
  ],
  // 1 down: stride closing, back heel lifts
  [
    '..ppp..',
    '..p.p..',
    '..p.p..',
    '..p.p..',
    '.pp.p..',
    '.p..pp.',
    '.p...p.',
    '.p...p.',
    '.p...p.',
    '.p...p.',
    '.p...p.',
    '.p...p.',
    'p....p.',
    'p....p.',
    'f....p.',
    '.....ff',
  ],
  // 2 passing: legs together, back foot raised
  [
    '..ppp..',
    '..pp...',
    '..pp...',
    '..pp...',
    '..pp...',
    '..pp...',
    '..pp...',
    '..pp...',
    '..pp...',
    '..pp...',
    '..pp...',
    '.p.p...',
    '.p.p...',
    'f..p...',
    '...p...',
    '...ff..',
  ],
]
const ADULT_LEGS_CYCLE = [0, 1, 2, 0, 1, 2]

const adult: BodyDef = {
  id: 'adult',
  label: 'Adult',
  facings: {
    right: {
      head: [0, 0],
      cels: ADULT_LEGS_CYCLE.map((li, i) =>
        build(
          7,
          32,
          [ADULT_LEGS_R[li], 0, 16],
          [['..ccc..', '..ccc..', '..ccc..', '..ccc..', '..ccc..', '..ccc..', '..ccc..', '..ccc..', '..ttt..'], 0, 7],
          [sideArm(ARMS_R[i], 8), 0, 8],
          [HEAD.right, 0, 0],
        ),
      ),
    },
    down: { head: [0, 0], cels: frontBack('down', 32, 8, 15, 3) },
    up: { head: [0, 0], cels: frontBack('up', 32, 8, 15, 3) },
  },
}

// ------------------------------------------------------------------ short (7 × 22)

/** Side-view legs, rows 13–21. */
const SHORT_LEGS_R: Grid[] = [
  [
    '..ppp..',
    '..p.p..',
    '.pp.pp.',
    '.p...p.',
    '.p...p.',
    'p....p.',
    'p....p.',
    'f....p.',
    'f....ff',
  ],
  [
    '..ppp..',
    '..p.p..',
    '..p.p..',
    '.pp.pp.',
    '.p...p.',
    '.p...p.',
    'p....p.',
    'f....p.',
    '.....ff',
  ],
  [
    '..ppp..',
    '..pp...',
    '..pp...',
    '..pp...',
    '..pp...',
    '.p.p...',
    'f..p...',
    '...p...',
    '...ff..',
  ],
]

const short: BodyDef = {
  id: 'short',
  label: 'Short',
  facings: {
    right: {
      head: [0, 0],
      cels: ADULT_LEGS_CYCLE.map((li, i) =>
        build(
          7,
          22,
          [SHORT_LEGS_R[li], 0, 13],
          [['..ccc..', '..ccc..', '..ccc..', '..ccc..', '..ccc..', '..ttt..'], 0, 7],
          [sideArm(ARMS_R[i], 5), 0, 8],
          [HEAD.right, 0, 0],
        ),
      ),
    },
    down: { head: [0, 0], cels: frontBack('down', 22, 5, 8, 2) },
    up: { head: [0, 0], cels: frontBack('up', 22, 5, 8, 2) },
  },
}

export const BODIES: Record<BodyId, BodyDef> = { adult, short }
