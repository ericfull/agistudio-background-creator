import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { R, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { ASPECT } from './util'

const O = R('outline')

// ---------------------------------------------------------------- jack-o'-lantern

/** Carved features in unit coordinates (x across the pumpkin, y down), -1..1. */
const FACES: Record<string, { eyes: LP[]; nose?: LP[]; mouth: LP[]; teeth?: number[] }> = {
  grin: {
    eyes: [[-0.58, -0.1], [-0.2, -0.1], [-0.39, -0.48]],
    nose: [[-0.08, 0.12], [0.08, 0.12], [0, 0]],
    mouth: [[-0.58, 0.22], [0.58, 0.22], [0.34, 0.52], [0, 0.58], [-0.34, 0.52]],
    teeth: [-0.22, 0.22],
  },
  scary: {
    eyes: [[-0.6, -0.44], [-0.18, -0.12], [-0.54, -0.08]],
    mouth: [[-0.6, 0.2], [-0.4, 0.34], [-0.2, 0.22], [0, 0.36], [0.2, 0.22], [0.4, 0.34], [0.6, 0.2], [0.4, 0.54], [0, 0.6], [-0.4, 0.54]],
  },
  toothy: {
    eyes: [[-0.56, -0.24], [-0.38, -0.48], [-0.2, -0.24], [-0.38, -0.04]],
    mouth: [[-0.56, 0.2], [0.56, 0.2], [0.44, 0.54], [-0.44, 0.54]],
    teeth: [-0.3, 0, 0.3],
  },
}

function pumpkin(k: Kit, rng: Rng, x: number, rx: number, face: string, lit: boolean): void {
  const ry = rx * ASPECT * 0.72
  const cy = -ry
  k.ellipse(x, cy, rx, ry, R('body'), O)
  // ribs: two arcs either side of a center groove
  if (rx >= 4) {
    for (const f of [0.55, -0.55]) {
      const pts = k.ellipsePts(x, cy, rx * Math.abs(f), ry * 0.94, 10, f > 0 ? -Math.PI / 2 : Math.PI / 2, f > 0 ? Math.PI / 2 : Math.PI * 1.5)
      k.line(pts, R('rib'))
    }
    k.line([[x, cy - ry * 0.92], [x, cy - ry * 0.5]], R('rib'))
    k.line([[x, cy + ry * 0.75], [x, cy + ry * 0.92]], R('rib'))
  }
  // stem
  const lean = rng.chance(0.5) ? 1 : -1
  k.poly([[x - 0.8, cy - ry + 1], [x - 0.6, cy - ry - 2.5], [x + lean * 1.2, cy - ry - 3.5], [x + 0.8, cy - ry + 1]], R('stem'), O)
  if (face === 'plain') return
  const c: ColorRef = lit ? R('glow') : R('hollow')
  if (rx < 9) {
    pixelFace(k, x, cy, rx, ry, face, c)
    return
  }
  const F = FACES[face]
  const map = (pts: LP[], mirror = 1): LP[] => pts.map(([u, v]) => [x + u * mirror * rx, cy + v * ry])
  k.poly(map(F.eyes), c)
  k.poly(map(F.eyes, -1), c)
  if (F.nose) k.poly(map(F.nose), c)
  k.poly(map(F.mouth), c)
  // teeth left standing in the mouth
  if (F.teeth) {
    const ty = cy + 0.2 * ry + 0.5
    for (const u of F.teeth) k.dot(Math.round(x + u * rx), ty, R('body'))
    if (face === 'toothy') for (const u of [-0.15, 0.15]) k.dot(Math.round(x + u * rx), cy + 0.54 * ry - 0.5, R('body'))
  }
}

/** Hand-placed carving for small pumpkins, where polygons would smear together. */
function pixelFace(k: Kit, x: number, cy: number, rx: number, ry: number, face: string, c: ColorRef): void {
  x = Math.round(x)
  const e = Math.max(2, Math.round(rx * 0.43))
  const m = Math.max(2, Math.round(rx * 0.58))
  const eyeTop = Math.round(cy - ry * 0.42)
  const mt = Math.round(cy + ry * 0.12)
  for (const s of [-1, 1]) {
    const ex = x + s * e
    if (face === 'scary') {
      // slanted: outer end high, inner end low
      k.hline(ex - s, ex, eyeTop, c)
      k.hline(ex, ex + s, eyeTop + 1, c)
    } else if (face === 'toothy') {
      k.hline(ex - 1, ex + 1, eyeTop, c)
      k.hline(ex - 1, ex + 1, eyeTop + 1, c)
    } else {
      k.dot(ex, eyeTop, c)
      k.hline(ex - 1, ex + 1, eyeTop + 1, c)
    }
  }
  if (face === 'scary') {
    for (let i = -m; i <= m; i += 2) k.dot(x + i, mt, c)
    k.hline(x - m, x + m, mt + 1, c)
    if (m >= 3) k.hline(x - m + 2, x + m - 2, mt + 2, c)
  } else if (face === 'toothy') {
    k.hline(x - m, x + m, mt, c)
    k.hline(x - m, x + m, mt + 1, c)
    k.hline(x - m + 1, x + m - 1, mt + 2, c)
    for (let i = -m + 1; i < m; i += 2) k.dot(x + i, mt, R('body'))
  } else {
    k.hline(x - m, x + m, mt, c)
    k.hline(x - m + 1, x + m - 1, mt + 1, c)
    if (m >= 3) k.hline(x - m + 2, x + m - 2, mt + 2, c)
    if (m >= 3) for (const s of [-1, 1]) k.dot(x + s * Math.round(m * 0.45), mt, R('body'))
  }
}

const jackOLantern: ElementDef = {
  id: 'spooky-pumpkin',
  name: "Jack-o'-lantern",
  themes: ['spooky'],
  category: 'prop',
  tags: ['pumpkin', 'jack-o-lantern', 'halloween', 'glow', 'harvest'],
  roles: {
    body: { label: 'Pumpkin', color: 6 },
    rib: { label: 'Ribs', color: 0 },
    stem: { label: 'Stem', color: 2 },
    outline: { label: 'Outline', color: 0 },
    glow: { label: 'Candle glow', color: 14 },
    hollow: { label: 'Unlit hollows', color: 0 },
  },
  params: [
    { key: 'size', label: 'Size', type: 'int', min: 3, max: 12, default: 7 },
    {
      key: 'face', label: 'Face', type: 'select', default: 'grin',
      options: [{ value: 'grin', label: 'Grin' }, { value: 'scary', label: 'Scary' }, { value: 'toothy', label: 'Toothy' }, { value: 'plain', label: 'Uncarved' }],
    },
    { key: 'lit', label: 'Lit', type: 'bool', default: true },
    { key: 'count', label: 'Count', type: 'int', min: 1, max: 3, default: 1 },
  ],
  defaultPriority: 'baseline',
  perspective: true,
  place: { x: 80, y: 150 },
  hasControl: true,
  generate(k, p, rng) {
    const rx = p.n('size')
    const n = p.n('count')
    const face = p.s('face')
    const lit = p.b('lit')
    const faces = ['grin', 'scary', 'toothy', 'plain']
    // companions sit a little behind, either side
    const side = rng.chance(0.5) ? 1 : -1
    if (n >= 2) pumpkin(k, rng, side * rx * 1.55, Math.max(3, Math.round(rx * 0.75)), rng.pick(faces), lit)
    if (n >= 3) pumpkin(k, rng, -side * rx * 1.5, Math.max(3, Math.round(rx * 0.62)), 'plain', lit)
    pumpkin(k, rng, 0, rx, face, lit)
    const reach = n >= 2 ? rx * 2.4 : rx
    k.wall([[-reach, 0], [reach, 0]])
  },
}

// ---------------------------------------------------------------- gargoyle

const gargoyle: ElementDef = {
  id: 'spooky-gargoyle',
  name: 'Gargoyle',
  themes: ['spooky'],
  category: 'prop',
  tags: ['gargoyle', 'statue', 'demon', 'stone', 'pedestal', 'wings'],
  roles: {
    stone: { label: 'Gargoyle', color: 8 },
    light: { label: 'Highlights', color: 7 },
    plinth: { label: 'Pedestal', color: 7 },
    shade: { label: 'Pedestal shade', color: 8 },
    outline: { label: 'Outline', color: 0 },
    eyes: { label: 'Glowing eyes', color: 12 },
    fang: { label: 'Fangs', color: 15 },
  },
  params: [
    { key: 'pedestal', label: 'Pedestal height', type: 'int', min: 0, max: 30, default: 14 },
    {
      key: 'wings', label: 'Wings', type: 'select', default: 'spread',
      options: [{ value: 'folded', label: 'Folded' }, { value: 'spread', label: 'Spread' }],
    },
    { key: 'glow', label: 'Glowing eyes', type: 'bool', default: true },
    { key: 'horns', label: 'Horns', type: 'bool', default: true },
  ],
  defaultPriority: 'baseline',
  perspective: true,
  place: { x: 112, y: 140 },
  hasControl: true,
  generate(k, p) {
    const ph = p.n('pedestal')
    const S = R('stone')
    // pedestal
    let y0 = 0
    if (ph > 0) {
      const capH = Math.min(3, Math.max(1, Math.round(ph / 5)))
      const baseH = Math.min(3, Math.max(1, Math.round(ph / 5)))
      k.rect(-7, -baseH, 7, 0, R('plinth'), O)
      if (ph > capH + baseH) {
        k.rect(-5, -ph + capH, 5, -baseH, R('plinth'), O)
        k.rect(2, -ph + capH + 1, 4, -baseH - 1, R('shade'))
      }
      k.rect(-7, -ph, 7, -ph + capH, R('plinth'), O)
      y0 = -ph
    }
    const Y = (v: number) => y0 + v
    const pts = (a: LP[], s = 1): LP[] => a.map(([x, y]) => [x * s, Y(y)])

    // wings behind the body
    if (p.s('wings') === 'spread') {
      const wing: LP[] = [[-3, -12], [-7, -17], [-13, -20], [-12, -15], [-13, -10], [-10, -11], [-8, -7], [-6, -9], [-3, -6]]
      for (const s of [1, -1]) {
        k.poly(pts(wing, s), S, O)
        k.line(pts([[-4, -12], [-9, -12], [-12, -15]], s), O)
        k.line(pts([[-6, -13], [-8, -8]], s), O)
      }
    } else {
      const wing: LP[] = [[-2, -7], [-4, -14], [-6, -22], [-8, -15], [-7, -8], [-5, -4]]
      for (const s of [1, -1]) {
        k.poly(pts(wing, s), S, O)
        k.line(pts([[-4, -8], [-6, -19]], s), O)
      }
    }
    // hunched body and haunches
    k.ellipse(0, Y(-6), 4.5, 6, S, O)
    for (const s of [-1, 1]) k.ellipse(s * 3.5, Y(-3), 2.3, 3.2, S, O)
    // arms reaching down between the knees, claws over the edge
    for (const s of [-1, 1]) {
      k.poly(pts([[-3.5, -9], [-2, -9], [-1, -2], [-2.5, -2]], s), S, O)
      k.hline(s * 1 - 1, s * 1 + 1, Y(0), O)
      k.hline(s * 4 - 1, s * 4 + 1, Y(0), O)
    }
    k.vline(-2, Y(-8), Y(-4), R('light'))
    // head
    if (p.b('horns')) {
      for (const s of [-1, 1]) k.poly(pts([[-1.5, -15], [-3.5, -19], [-4, -21], [-3, -16]], s), S, O)
    }
    for (const s of [-1, 1]) k.poly(pts([[-2.5, -13], [-5, -15], [-3, -11]], s), S, O)
    k.ellipse(0, Y(-12), 3, 3.6, S, O)
    k.hline(-2, 2, Y(-13), O)
    const eye = p.b('glow') ? R('eyes') : O
    k.dot(-1, Y(-12), eye)
    k.dot(1, Y(-12), eye)
    k.hline(-1, 1, Y(-10), O)
    k.dot(-1, Y(-9), R('fang'))
    k.dot(1, Y(-9), R('fang'))
    k.dot(-1, Y(-14), R('light'))

    k.wall([[-7, 0], [7, 0]])
  },
}

export const props: ElementDef[] = [jackOLantern, gargoyle]
