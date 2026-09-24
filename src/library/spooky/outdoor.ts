import type { Rng } from '../../agi/rng'
import { clamp, R, wave, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { ASPECT, bat, crack, drawLimbs, shear, type Stroke } from './util'

const O = R('outline')
const W = 159

// ---------------------------------------------------------------- gnarled tree

/** A crooked limb: walks in visual space, turning more and more downward at the tip (a claw). */
function limb(rng: Rng, x: number, y: number, angle: number, len: number, w0: number, curl: number): Stroke {
  const pts: LP[] = [[x, y]]
  const hw: number[] = [w0]
  const n = Math.max(3, Math.round(len / 4))
  let drift = 0
  let bend = 0
  for (let i = 1; i <= n; i++) {
    const t = i / n
    const step = len / n
    // gnarly wobble stays within a narrow cone; only the tip curls into a claw
    drift = Math.max(-0.28, Math.min(0.28, drift + rng.range(-0.22, 0.22)))
    if (t > 0.7) bend += (curl * 1.1 * t) / n
    const a = angle + drift + bend
    x += (Math.cos(a) * step) / ASPECT
    y += Math.sin(a) * step
    pts.push([x, y])
    hw.push(Math.max(0.2, w0 * (1 - t * 0.92)))
  }
  return { pts, hw }
}

const tree: ElementDef = {
  id: 'spooky-tree',
  name: 'Gnarled tree',
  themes: ['spooky'],
  category: 'flora',
  tags: ['tree', 'dead', 'twisted', 'haunted', 'face', 'forest'],
  roles: {
    bark: { label: 'Bark', color: 8 },
    outline: { label: 'Outline', color: 0 },
    hollow: { label: 'Hollows', color: 0 },
    glow: { label: 'Glowing eyes', color: 14 },
  },
  params: [
    { key: 'height', label: 'Height', type: 'int', min: 36, max: 120, default: 70 },
    { key: 'spread', label: 'Branch spread', type: 'int', min: 10, max: 40, default: 28 },
    { key: 'lean', label: 'Lean', type: 'int', min: -10, max: 10, default: 3 },
    { key: 'branches', label: 'Branches', type: 'int', min: 2, max: 7, default: 5 },
    {
      key: 'face', label: 'Face', type: 'select', default: 'knothole',
      options: [{ value: 'none', label: 'None' }, { value: 'knothole', label: 'Knothole' }, { value: 'face', label: 'Face' }, { value: 'glowing', label: 'Glowing eyes' }],
    },
  ],
  defaultPriority: 'baseline',
  perspective: true,
  place: { x: 40, y: 140 },
  hasControl: true,
  generate(k, p, rng) {
    const h = p.n('height')
    const spread = p.n('spread')
    const lean = p.n('lean')
    const tw = 1.7 + h * 0.024
    const trunkH = h * 0.64
    // twisting trunk centerline
    const wob = rng.range(1, 2.2)
    const ph = rng.range(0, Math.PI * 2)
    const cx = (t: number) => lean * t * t + Math.sin(t * Math.PI * 1.6 + ph) * wob * t
    const n = 8
    const trunk: Stroke = { pts: [], hw: [] }
    for (let i = 0; i <= n; i++) {
      const t = i / n
      trunk.pts.push([cx(t), -t * trunkH])
      trunk.hw.push(tw * (1 - t * 0.6) + (t < 0.12 ? (0.12 - t) * 10 : 0) + Math.sin(t * 9 + ph) * 0.3)
    }
    const strokes: Stroke[] = []
    // roots
    for (const s of [-1, 1]) {
      const nr = rng.int(1, 2)
      for (let i = 0; i < nr; i++) {
        const x0 = cx(0) + s * tw * 0.4
        const a = s > 0 ? rng.range(-0.05, 0.25) : Math.PI - rng.range(-0.05, 0.25)
        strokes.push(limb(rng, x0, -2, a, tw * ASPECT * rng.range(1.2, 2), tw * 0.5, s > 0 ? 0.3 : -0.3))
      }
    }
    const reach = spread * ASPECT * (0.6 + h / 150)
    /** A branch ending in a clawed hand of bony fingers. */
    const branch = (t: number, side: number, up: number, len: number, w0: number): void => {
      const a = side > 0 ? -up : Math.PI + up
      const curl = side * rng.range(0.3, 0.6)
      const b = limb(rng, cx(t), -t * trunkH, a, len, w0, curl)
      strokes.push(b)
      const nt = len > 24 ? 1 : 0
      for (let j = 0; j < nt; j++) {
        const q = b.pts[rng.int(1, Math.max(1, b.pts.length - 3))]
        const ta = a + side * (rng.chance(0.5) ? -0.5 : 0.4)
        strokes.push(limb(rng, q[0], q[1], ta, len * rng.range(0.3, 0.45), w0 * 0.45, curl))
      }
      const tip = b.pts[b.pts.length - 1]
      const prev = b.pts[b.pts.length - 2]
      const ea = Math.atan2(tip[1] - prev[1], (tip[0] - prev[0]) * ASPECT)
      const nf = rng.int(2, 3)
      for (let j = 0; j < nf; j++) {
        const fa = ea + (j - (nf - 1) / 2) * 0.75 + side * 0.45
        strokes.push(limb(rng, tip[0], tip[1], fa, rng.range(5, 9), 0.45, side * 1.4))
      }
    }
    // one long grasping arm, then branches reaching up and out
    const arm = rng.chance(0.5) ? -1 : 1
    branch(rng.range(0.5, 0.6), arm, rng.range(0.5, 0.75), reach * rng.range(0.95, 1.1), tw * 0.5)
    const nb = p.n('branches') - 1
    for (let i = 0; i < nb; i++) {
      const side = i % 2 === 0 ? -arm : arm
      const t = 0.62 + (0.38 * i) / Math.max(1, nb - 1) * (nb > 1 ? 1 : 0)
      branch(Math.min(1, t), side, rng.range(0.6, 1.0), reach * rng.range(0.55, 0.85), tw * (1 - t * 0.6) * 0.55)
    }
    // crown spike from the top
    const top = trunk.pts[n]
    strokes.push(limb(rng, top[0], top[1], -Math.PI / 2 + rng.range(-0.4, 0.4), h * 0.3, tw * 0.35, rng.chance(0.5) ? 0.5 : -0.5))
    strokes.push(trunk)
    drawLimbs(k, strokes, R('bark'), O, 0.45)

    // twist grooves spiralling round the trunk
    const face = p.s('face')
    for (let i = 0; i < 3; i++) {
      if (i === 1 && face !== 'none') continue
      const t0 = 0.12 + i * 0.17
      const t1 = t0 + 0.14
      const w0 = tw * (1 - t0 * 0.6)
      const w1 = tw * (1 - t1 * 0.6)
      k.line([[cx(t0) - w0 * 0.7, -t0 * trunkH], [cx((t0 + t1) / 2), -((t0 + t1) / 2) * trunkH + 1], [cx(t1) + w1 * 0.6, -t1 * trunkH]], O)
    }

    // knothole or face
    const fy = -trunkH * 0.36
    const fx = cx(0.36)
    const fw = tw * (1 - 0.36 * 0.6)
    if (face === 'knothole') {
      k.ellipse(fx + fw * 0.15, fy, Math.max(1, fw * 0.4), Math.max(2, fw * 0.95), R('hollow'))
    } else if (face !== 'none') {
      const ex = Math.max(2, fw * 0.6)
      for (const s of [-1, 1]) {
        const x = Math.round(fx + s * ex)
        k.dot(x + s, fy - 6, R('hollow'))
        k.hline(x - 1, x + 1, fy - 5, R('hollow'))
        k.hline(x - 1, x + 1, fy - 4, R('hollow'))
        if (face === 'glowing') k.hline(x - (s < 0 ? 0 : 1), x + (s < 0 ? 1 : 0), fy - 5, R('glow'))
      }
      // howling mouth
      k.poly([[fx - 1.5, fy], [fx + 1.5, fy], [fx + 1, fy + 5], [fx - 1, fy + 5]], R('hollow'))
    }
    k.wall([[cx(0) - tw - 1, 0], [cx(0) + tw + 1, 0]])
  },
}

// ---------------------------------------------------------------- gravestones

type StoneShape = 'rounded' | 'cross' | 'obelisk'

function gravestone(k: Kit, rng: Rng, shape: StoneShape, x: number, y: number, h: number, tilt: number, cracks: boolean): number {
  const T = (pts: LP[]) => shear(pts, tilt, x, y)
  const S = R('stone')
  const D = R('shade')
  let face: LP[]
  let hw: number
  if (shape === 'rounded') {
    hw = Math.max(2.5, Math.round(h * 0.22))
    const ry = hw * 1.5
    const arc = k.ellipsePts(0, -h + ry, hw, ry, 10, Math.PI, Math.PI * 2).map(([x, y]) => [x, y] as LP)
    face = [[-hw, 0], ...arc, [hw, 0]]
  } else if (shape === 'cross') {
    hw = Math.max(1.5, Math.round(h * 0.1 * 2) / 2)
    const bar = Math.max(3, Math.round(h * 0.22))
    const by = -h + Math.round(h * 0.42)
    const bt = Math.max(2, Math.round(h * 0.14))
    face = [[-hw, 0], [-hw, by], [-bar, by], [-bar, by - bt], [-hw, by - bt], [-hw, -h], [hw, -h], [hw, by - bt], [bar, by - bt], [bar, by], [hw, by], [hw, 0]]
  } else {
    h = Math.round(h * 1.25)
    hw = Math.max(2, Math.round(h * 0.11))
    const tip = Math.max(3, Math.round(h * 0.14))
    const top = Math.max(1, hw - 1)
    face = [[-hw - 1, 0], [-hw - 1, -3], [-hw, -3], [-top, -h + tip], [0, -h], [top, -h + tip], [hw, -3], [hw + 1, -3], [hw + 1, 0]]
  }
  if (shape === 'rounded') {
    // thickness on the right side, then the face
    k.poly(T(face.map(([px, py]) => [px + 1, py - 1] as LP)), D, O)
    k.poly(T(face), S, O)
  } else {
    k.poly(T(face), S, O)
    const sx = shape === 'cross' ? Math.floor(hw) - 0.5 : hw - 1
    if (hw >= 1.5) k.line(T([[sx, -1], [sx, shape === 'cross' ? -h + 1 : -h + Math.max(3, Math.round(h * 0.14))]]), D)
  }
  if (shape === 'rounded') {
    const ty = Math.round(-h * 0.55)
    k.line(T([[-hw + 2, ty], [hw - 2, ty]]), D)
    if (h >= 16) k.line(T([[-hw + 2, ty + 3], [hw - 3, ty + 3]]), D)
  }
  if (cracks && shape !== 'cross' && rng.chance(0.7)) {
    const [cx, cy] = T([[rng.range(-hw * 0.6, hw * 0.4), shape === 'rounded' ? -h + 1 : -h * 0.7]])[0]
    crack(k, rng, cx, cy, h * rng.range(0.3, 0.55), Math.PI / 2 + rng.range(-0.5, 0.5), O)
  }
  return hw
}

const gravestones: ElementDef = {
  id: 'spooky-gravestones',
  name: 'Gravestones',
  themes: ['spooky'],
  category: 'prop',
  tags: ['grave', 'tombstone', 'headstone', 'cemetery', 'graveyard', 'cross', 'obelisk'],
  roles: {
    stone: { label: 'Stone', color: 7 },
    shade: { label: 'Shade and lettering', color: 8 },
    outline: { label: 'Outline', color: 0 },
    dirt: { label: 'Grave dirt', color: 6 },
  },
  params: [
    {
      key: 'shape', label: 'Shape', type: 'select', default: 'mixed',
      options: [{ value: 'rounded', label: 'Rounded' }, { value: 'cross', label: 'Cross' }, { value: 'obelisk', label: 'Obelisk' }, { value: 'mixed', label: 'Mixed' }],
    },
    { key: 'count', label: 'Count', type: 'int', min: 1, max: 6, default: 3 },
    { key: 'height', label: 'Height', type: 'int', min: 10, max: 30, default: 17 },
    { key: 'tilt', label: 'Leaning', type: 'int', min: 0, max: 10, default: 4 },
    { key: 'cracks', label: 'Cracks', type: 'bool', default: true },
    { key: 'mound', label: 'Fresh graves', type: 'bool', default: false },
  ],
  defaultPriority: 'baseline',
  perspective: true,
  place: { x: 80, y: 136 },
  hasControl: true,
  generate(k, p, rng) {
    const n = p.n('count')
    const H = p.n('height')
    const shapeP = p.s('shape')
    const shapes: StoneShape[] = ['rounded', 'cross', 'obelisk']
    const gap = Math.round(H * 0.5) + 6
    const stones = Array.from({ length: n }, (_, i) => ({
      x: Math.round((i - (n - 1) / 2) * gap + (n > 1 ? rng.range(-1.5, 1.5) : 0)),
      y: n > 1 ? -rng.int(0, 4) : 0,
      h: Math.round(H * (n > 1 ? rng.range(0.8, 1.12) : 1)),
      shape: (shapeP === 'mixed' ? (i === 0 ? 'rounded' : rng.pick(shapes)) : shapeP) as StoneShape,
      tilt: (p.n('tilt') / 10) * rng.range(-0.22, 0.22),
    }))
    for (const s of stones) if (s.shape === 'cross') s.tilt *= 0.5
    stones.sort((a, b) => a.y - b.y)
    const walls: LP[][] = []
    for (const s of stones) {
      const hw = gravestone(k, rng, s.shape, s.x, s.y, s.h, s.tilt, p.b('cracks'))
      if (p.b('mound')) {
        k.withPriority('rows', () => {
          k.poly(k.ellipsePts(s.x, s.y + 3, hw + 3, 3, 12), R('dirt'), O)
          k.hline(s.x - hw, s.x + hw - 1, s.y + 2, R('shade'))
        })
      }
      walls.push([[s.x - hw - 1, s.y], [s.x + hw + 2, s.y]])
    }
    for (const w of walls) k.wall(w)
  },
}

// ---------------------------------------------------------------- swamp

const swamp: ElementDef = {
  id: 'spooky-swamp',
  name: 'Swamp',
  themes: ['spooky'],
  category: 'water',
  tags: ['swamp', 'bog', 'marsh', 'water', 'lily pads', 'murky'],
  span: 'full',
  roles: {
    murk: { label: 'Water', color: 2 },
    ripple: { label: 'Ripples', color: 8 },
    scum: { label: 'Scum', color: 10 },
    pad: { label: 'Lily pads', color: 10 },
    mud: { label: 'Mud bank', color: 6 },
    stump: { label: 'Stumps', color: 8 },
    reed: { label: 'Reeds', color: 0 },
    plank: { label: 'Boardwalk', color: 6 },
    outline: { label: 'Outline', color: 0 },
  },
  params: [
    { key: 'depth', label: 'Depth', type: 'int', min: 14, max: 100, default: 40 },
    { key: 'pads', label: 'Lily pads', type: 'int', min: 0, max: 16, default: 7 },
    { key: 'stumps', label: 'Stumps', type: 'int', min: 0, max: 5, default: 2 },
    { key: 'banks', label: 'Banks and reeds', type: 'bool', default: true },
    {
      key: 'crossing', label: 'Crossing', type: 'select', default: 'causeway',
      options: [{ value: 'none', label: 'None' }, { value: 'causeway', label: 'Mud causeway' }, { value: 'boardwalk', label: 'Boardwalk' }],
    },
    { key: 'crossX', label: 'Crossing x', type: 'int', min: 10, max: 150, default: 80 },
  ],
  defaultPriority: 'rows',
  perspective: false,
  place: { x: 80, y: 110 },
  hasControl: true,
  generate(k, p, rng) {
    const y0 = k.ctx.y
    const depth = p.n('depth')
    const toBottom = y0 + depth >= 163
    const wt = wave(rng)
    const wb = wave(rng)
    const topAt = (x: number) => Math.round(y0 + 1.5 + wt(x) * 2.5)
    const botAt = (x: number) => (toBottom ? 167 : Math.min(167, Math.round(y0 + depth + wb(x) * 4)))
    const topE: LP[] = []
    const botE: LP[] = []
    for (let x = 0; x <= W; x += 5) {
      topE.push([x, topAt(x)])
      botE.push([x, botAt(x)])
    }
    if (topE[topE.length - 1][0] !== W) {
      topE.push([W, topAt(W)])
      botE.push([W, botAt(W)])
    }
    const water: LP[] = [...topE, ...botE.slice().reverse()]
    const banks = p.b('banks')
    if (banks) {
      k.poly([...topE.map(([x, y]) => [x, y - 3] as LP), ...topE.slice().reverse().map(([x, y]) => [x, y + 1] as LP)], R('mud'))
      if (!toBottom) k.poly([...botE.map(([x, y]) => [x, y - 1] as LP), ...botE.slice().reverse().map(([x, y]) => [x, Math.min(167, y + 3)] as LP)], R('mud'))
    }
    k.poly(water, R('murk'))
    k.line(topE, O)
    const stumpWalls: LP[][] = []

    // a walkable crossing lines up with a ground path (same x at the bottom edge)
    const crossing = p.s('crossing')
    const cX = p.n('crossX')
    const chw = (y: number) => Math.max(3, (y - k.ctx.horizon) * 0.14) * (crossing === 'boardwalk' ? 0.8 : 1)
    const onCross = (x: number, y: number) => crossing !== 'none' && Math.abs(x - cX) < chw(y) + 3
    const inWater = (x: number, y: number, m = 2) => y > topAt(x) + m && y < botAt(x) - m && !onCross(x, y)
    // ripples get longer toward the viewer
    const nr = Math.round(depth * 0.7)
    for (let i = 0; i < nr; i++) {
      const x = rng.range(2, W - 2)
      const y = Math.round(rng.range(y0 + 3, y0 + depth))
      if (!inWater(x, y, 1)) continue
      const len = 3 + ((y - y0) / Math.max(1, depth)) * 12 * rng.range(0.5, 1.3)
      k.hline(Math.round(x - len / 2), Math.round(x + len / 2), y, R('ripple'))
    }
    for (let i = 0; i < nr; i++) {
      const x = Math.round(rng.range(1, W - 1))
      const y = Math.round(rng.range(y0 + 3, y0 + depth))
      if (!inWater(x, y, 1)) continue
      k.dot(x, y, R('scum'))
      if (rng.chance(0.4)) k.dot(x + 1, y, R('scum'))
    }
    for (let i = 0; i < 4; i++) {
      const x = Math.round(rng.range(6, W - 6))
      const y = Math.round(rng.range(y0 + 4, y0 + depth - 2))
      if (!inWater(x, y, 2)) continue
      k.dot(x, y, R('scum'))
      k.dot(x + 1, y - 1, R('scum'))
      k.dot(x - 1, y - 2, R('scum'))
    }
    // lily pads, larger toward the viewer
    for (let i = 0; i < p.n('pads'); i++) {
      const x = rng.range(4, W - 4)
      const y = rng.range(y0 + 3, y0 + depth - 1)
      if (!inWater(x, y, 2)) continue
      const d = (y - y0) / Math.max(1, depth)
      const rx = 1.8 + d * 2.8
      const ry = 1 + d * 1.5
      k.ellipse(x, y, rx, ry, R('pad'), R('outline'))
      k.poly([[x, y], [x + rx, y - ry * 0.4], [x + rx, y + ry * 0.4]], R('murk'))
    }
    // stumps and cypress knees poking out of the water
    for (let i = 0; i < p.n('stumps'); i++) {
      const x = Math.round(rng.range(8, W - 8))
      const y = Math.round(rng.range(y0 + 4, y0 + depth - 2))
      if (!inWater(x, y, 2)) continue
      const d = (y - y0) / Math.max(1, depth)
      const sw = 1.5 + d * 2
      const sh = 4 + d * 8
      const top: LP[] = [[x - sw, y - sh], [x - sw * 0.3, y - sh + 1.5], [x + sw * 0.2, y - sh - 1], [x + sw, y - sh + 1]]
      k.poly([[x - sw - 1, y], ...top, [x + sw + 1, y]], R('stump'), O)
      k.hline(Math.round(x - sw - 2), Math.round(x + sw + 2), y + 1, R('ripple'))
      stumpWalls.push([[x - sw, y], [x + sw, y]])
    }
    // the crossing: an earth causeway or a plank boardwalk
    let cross: LP[] | null = null
    if (crossing !== 'none') {
      const ya = topAt(cX) - 3
      const yb = toBottom ? 167 : Math.min(167, botAt(cX) + 3)
      const L: LP[] = []
      const Rr: LP[] = []
      for (let y = ya; ; y = Math.min(yb, y + 3)) {
        const j = crossing === 'causeway' ? rng.range(-0.7, 0.7) : 0
        L.push([cX - chw(y) + j, y])
        Rr.push([cX + chw(y) - j, y])
        if (y >= yb) break
      }
      cross = [...L, ...Rr.slice().reverse()]
      if (crossing === 'causeway') {
        k.poly(cross, R('mud'))
        k.line(L.slice(1, -1), O)
        k.line(Rr.slice(1, -1), O)
        for (let i = 0; i < 10; i++) {
          const y = Math.round(rng.range(ya + 3, yb - 1))
          k.dot(Math.round(cX + rng.range(-chw(y) + 1, chw(y) - 1)), y, R('ripple'))
        }
      } else {
        k.poly(cross, R('plank'), O)
        for (let y = ya + 2; y < yb; y += Math.max(2, Math.round(chw(y) * 0.35))) k.hline(Math.round(cX - chw(y) + 1), Math.round(cX + chw(y) - 1), y, O)
        for (let y = ya + 4; y < yb - 2; y += 7) {
          for (const s of [-1, 1]) k.vline(Math.round(cX + s * chw(y)), y, y + 2, O)
        }
      }
    }
    // dead reeds and cattails along the banks
    if (banks) {
      const nr = 7 + Math.round(depth / 12)
      for (let i = 0; i < nr; i++) {
        const far = i % 3 !== 0 || toBottom
        const x = Math.round(rng.range(2, W - 2))
        const y = far ? topAt(x) + 1 : botAt(x) - 1
        if (onCross(x, y) || onCross(x - 3, y) || onCross(x + 3, y)) continue
        const h = far ? rng.int(4, 8) : rng.int(9, 15)
        const cnt = rng.int(2, 4)
        for (let j = 0; j < cnt; j++) {
          const rx = x + j * 2 - cnt
          const lean = rng.int(-1, 1)
          const th = h - rng.int(0, 3)
          k.line([[rx, y], [rx + lean, y - th]], R('reed'))
          if (rng.chance(0.5)) k.vline(rx + lean, y - th + 1, y - th + (far ? 2 : 4), R('mud'))
        }
      }
    }
    // control last: every visual pixel carries a depth tag that would hide it
    k.water(water)
    if (cross) k.clearControl(cross)
    for (const w of stumpWalls) k.wall(w)
  },
}

// ---------------------------------------------------------------- fog bank

const fog: ElementDef = {
  id: 'spooky-fog',
  name: 'Fog bank',
  themes: ['spooky'],
  category: 'backdrop',
  tags: ['fog', 'mist', 'haze', 'dither', 'graveyard'],
  span: 'full',
  roles: {
    fog: { label: 'Fog', color: 7 },
    thin: { label: 'Thin fog', color: 8 },
  },
  params: [
    { key: 'thickness', label: 'Thickness', type: 'int', min: 4, max: 60, default: 18 },
    {
      key: 'density', label: 'Density', type: 'select', default: 'light',
      options: [{ value: 'wisps', label: 'Wisps' }, { value: 'light', label: 'Light' }, { value: 'thick', label: 'Thick' }],
    },
    { key: 'roll', label: 'Rolling', type: 'int', min: 0, max: 10, default: 5 },
    { key: 'gaps', label: 'Gaps', type: 'int', min: 0, max: 10, default: 3 },
  ],
  defaultPriority: 'none',
  perspective: false,
  place: { x: 80, y: 120 },
  generate(k, p, rng) {
    const yc = k.ctx.y
    const th = p.n('thickness')
    const roll = p.n('roll')
    const density = p.s('density')
    const wt = wave(rng)
    const wb = wave(rng)
    const wg = wave(rng, 2)
    const half = th / 2
    // gaps thin the bank into separate drifting patches with tapered ends
    const g = p.n('gaps') / 10
    const f = (x: number) => clamp(1.15 - g * 1.9 * (wg(x * 1.6) + 0.55), 0, 1)
    const topAt = (x: number) => yc - half * f(x) - (wt(x) + 0.3) * roll * 0.9 * f(x)
    const botAt = (x: number) => yc + half * f(x) + wb(x) * roll * 0.35 * f(x)
    const gapAt = (x: number, _t: number) => f(x) < 0.08
    const y0 = Math.floor(yc - half - roll * 1.3)
    const y1 = Math.ceil(yc + half + roll * 0.4)
    for (let y = y0; y <= y1; y++) {
      if (y < 0 || y > 167) continue
      const edge = (y - y0) % 2 === 0
      let x = 0
      while (x <= W) {
        const top = topAt(x)
        const bot = botAt(x)
        const t = (y - top) / Math.max(1, bot - top)
        let on = t >= 0 && t <= 1 && !gapAt(x, t)
        let color = 'fog'
        if (on) {
          const edgeDist = Math.min(t, 1 - t) * (bot - top)
          if (density === 'thick') {
            if (edgeDist < 2) on = edge
            color = edgeDist < 2 ? 'thin' : 'fog'
          } else if (density === 'light') {
            on = edge
            if (edgeDist < 1.5) color = 'thin'
          } else {
            on = edge && (y - y0) % 4 === 0
            if (edgeDist < 2) color = 'thin'
          }
        }
        if (!on) {
          x++
          continue
        }
        let xe = x
        while (xe + 1 <= W) {
          const tn = (y - topAt(xe + 1)) / Math.max(1, botAt(xe + 1) - topAt(xe + 1))
          if (tn < 0 || tn > 1 || gapAt(xe + 1, tn)) break
          const ed = Math.min(tn, 1 - tn) * (botAt(xe + 1) - topAt(xe + 1))
          const c2 = density === 'thick' ? (ed < 2 ? 'thin' : 'fog') : ed < (density === 'light' ? 1.5 : 2) ? 'thin' : 'fog'
          if (c2 !== color) break
          if (density === 'thick' && ed < 2 && !edge) break
          xe++
        }
        k.hline(x, xe, y, R(color))
        x = xe + 1
      }
    }
  },
}

// ---------------------------------------------------------------- full moon

const moon: ElementDef = {
  id: 'spooky-moon',
  name: 'Full moon',
  themes: ['spooky'],
  category: 'sky',
  tags: ['moon', 'night', 'clouds', 'bats', 'halo'],
  roles: {
    moon: { label: 'Moon', color: 15 },
    crater: { label: 'Craters', color: 7 },
    halo: { label: 'Halo', color: 8 },
    cloud: { label: 'Clouds', color: 8 },
    rim: { label: 'Cloud edges', color: 7 },
    bat: { label: 'Bats', color: 0 },
  },
  params: [
    { key: 'size', label: 'Size', type: 'int', min: 5, max: 18, default: 10 },
    { key: 'clouds', label: 'Clouds', type: 'int', min: 0, max: 4, default: 2 },
    { key: 'halo', label: 'Halo', type: 'bool', default: true },
    { key: 'craters', label: 'Craters', type: 'bool', default: true },
    { key: 'bats', label: 'Bats', type: 'int', min: 0, max: 6, default: 2 },
  ],
  defaultPriority: 'rows',
  perspective: false,
  place: { x: 118, y: 44 },
  generate(k, p, rng) {
    const r = p.n('size')
    const ry = r * ASPECT
    const halo = p.b('halo')
    const hr = r + 3
    const hry = ry + 4
    const cy = -(halo ? hry : ry) - 1
    if (halo) {
      // alternating-line glow around the moon
      for (let y = Math.ceil(cy - hry); y <= Math.floor(cy + hry); y++) {
        if ((y & 1) === 0) continue
        const dy = (y - cy) / hry
        const hx = hr * Math.sqrt(Math.max(0, 1 - dy * dy))
        if (hx >= 1) k.hline(Math.round(-hx), Math.round(hx), y, R('halo'))
      }
    }
    k.ellipse(0, cy, r, ry, R('moon'))
    if (p.b('craters')) {
      const blots: [number, number, number][] = [[-0.35, -0.3, 0.26], [0.25, 0.1, 0.2], [-0.15, 0.4, 0.16], [0.4, -0.45, 0.12]]
      for (const [bx, by, br] of blots) {
        const jx = rng.range(-0.08, 0.08)
        k.blob((bx + jx) * r, cy + by * ry, Math.max(0.8, br * r), Math.max(1, br * ry), rng, R('crater'), undefined, 4, 0.3)
      }
    }
    // cloud bars drifting across, with rounded ends
    for (let i = 0; i < p.n('clouds'); i++) {
      const y = cy + (i % 2 === 0 ? 1 : -1) * ry * rng.range(0.1, 0.8)
      const x = rng.range(-r * 1.2, r * 1.2)
      const w = r * rng.range(1.5, 2.4)
      const hh = Math.max(2, Math.round(r * rng.range(0.2, 0.3)))
      const cap = Math.max(1.5, hh * 0.8)
      // flat bottom, a few puffs along the top
      const top: LP[] = [[x - w + cap, y - hh]]
      const nb = rng.int(2, 3)
      for (let b = 0; b < nb; b++) {
        const bx = x - w + cap + ((b + 0.5) / nb) * (2 * w - 2 * cap) + rng.range(-1, 1)
        const up = rng.int(1, 2)
        top.push([bx - 2, y - hh], [bx - 1, y - hh - up], [bx + 1, y - hh - up], [bx + 2, y - hh])
      }
      top.push([x + w - cap, y - hh])
      const pts: LP[] = [
        ...top,
        ...k.ellipsePts(x + w - cap, y, cap, hh, 6, -Math.PI / 2, Math.PI / 2).slice(1).map(([a, b]) => [a, b] as LP),
        [x - w + cap, y + hh],
        ...k.ellipsePts(x - w + cap, y, cap, hh, 6, Math.PI / 2, Math.PI * 1.5).slice(1, -1).map(([a, b]) => [a, b] as LP),
      ]
      k.poly(pts, R('cloud'))
      k.line(top, R('rim'))
    }
    const nb = p.n('bats')
    for (let i = 0; i < nb; i++) {
      const a = rng.range(0, Math.PI * 2)
      const d = rng.range(0.4, 1.4)
      bat(k, Math.round(Math.cos(a) * r * d * 1.4), Math.round(cy + Math.sin(a) * ry * d), R('bat'), rng.chance(0.5))
    }
  },
}

// ---------------------------------------------------------------- dead grass ground

const deadGround: ElementDef = {
  id: 'spooky-ground',
  name: 'Dead grass',
  themes: ['spooky'],
  category: 'ground',
  tags: ['ground', 'grass', 'dead', 'dry', 'graveyard', 'bones'],
  span: 'full',
  roles: {
    ground: { label: 'Ground', color: 6 },
    tuft: { label: 'Grass tufts', color: 8 },
    tuft2: { label: 'Dark tufts', color: 0 },
    bare: { label: 'Bare patches', color: 8 },
    path: { label: 'Path', color: 7 },
    pebble: { label: 'Pebbles', color: 8 },
    bone: { label: 'Bones', color: 15 },
  },
  params: [
    { key: 'tufts', label: 'Tufts', type: 'int', min: 0, max: 90, default: 45 },
    { key: 'patches', label: 'Bare patches', type: 'int', min: 0, max: 10, default: 4 },
    {
      key: 'path', label: 'Path', type: 'select', default: 'winding',
      options: [{ value: 'none', label: 'None' }, { value: 'straight', label: 'Straight' }, { value: 'winding', label: 'Winding' }],
    },
    { key: 'pathX', label: 'Path x', type: 'int', min: 20, max: 140, default: 80 },
    { key: 'bones', label: 'Bones', type: 'bool', default: false },
  ],
  defaultPriority: 'rows',
  perspective: false,
  place: { x: 80, y: 60 },
  generate(k, p, rng) {
    const y0 = k.ctx.y
    const span = Math.max(1, 167 - y0)
    const depth = (y: number) => clamp((y - y0) / span, 0, 1)
    k.rect(0, y0, W, 167, R('ground'))

    // bare patches, flatter near the horizon
    for (let i = 0; i < p.n('patches'); i++) {
      const y = rng.range(y0 + 3, 164)
      const d = depth(y)
      const x = rng.range(0, W)
      k.blob(x, y, 4 + d * 10, 1 + d * 3, rng, R('bare'), undefined, 6, 0.35)
    }

    // path from the bottom edge to the horizon
    const ps = p.s('path')
    if (ps !== 'none') {
      const px = p.n('pathX')
      const wv = wave(rng)
      const L: LP[] = []
      const Rr: LP[] = []
      for (let y = y0; y <= 167; y += 3) {
        const d = depth(y)
        const c = ps === 'winding' ? lerpN(80 + wv(y * 3) * 18, px + wv(y * 2 + 40) * 10, d) : lerpN(80, px, d)
        const hwid = 2 + d * 16
        L.push([c - hwid + rng.range(-0.8, 0.8), y])
        Rr.push([c + hwid + rng.range(-0.8, 0.8), y])
      }
      L.push([L[L.length - 1][0], 167])
      Rr.push([Rr[Rr.length - 1][0], 167])
      k.poly([...L, ...Rr.reverse()], R('path'))
      // ruts and pebbles
      for (let i = 0; i < 14; i++) {
        const j = rng.int(1, L.length - 2)
        const y = L[j][1]
        const x = rng.range(L[j][0] + 1, Rr[Rr.length - 1 - j][0] - 1)
        k.dot(x, y, R(rng.chance(0.6) ? 'pebble' : 'ground'))
      }
    }

    // tufts: wind-bent dead grass blades, taller toward the viewer
    const nt = p.n('tufts')
    const lean = rng.chance(0.5) ? 1 : -1
    for (let i = 0; i < nt; i++) {
      const y = Math.round(y0 + 2 + Math.pow(rng.next(), 0.8) * (span - 2))
      const x = Math.round(rng.range(0, W))
      const d = depth(y)
      const h = 1 + Math.round(d * 3)
      const c = rng.chance(0.4) ? R('tuft2') : R('tuft')
      const blades = d > 0.5 ? 3 : 2
      for (let j = 0; j < blades; j++) {
        const bx = x + j * 2 - blades + 1
        const bh = h - (j === 1 ? 0 : 1)
        k.line(bh > 1 ? [[bx, y], [bx, y - bh + 1], [bx + lean, y - bh]] : [[bx, y], [bx + lean, y - 1]], c)
      }
    }

    if (p.b('bones')) {
      for (let i = 0; i < 6; i++) {
        const y = Math.round(rng.range(y0 + span * 0.3, 164))
        const x = Math.round(rng.range(4, W - 4))
        const d = depth(y)
        if (i === 0 && d > 0.4) {
          // a skull
          k.poly([[x - 2, y], [x - 2, y - 2], [x - 1, y - 3], [x + 1, y - 3], [x + 2, y - 2], [x + 2, y], [x + 1, y + 1], [x - 1, y + 1]], R('bone'))
          k.dot(x - 1, y - 1, R('tuft2'))
          k.dot(x + 1, y - 1, R('tuft2'))
          continue
        }
        const len = 1 + Math.round(d * 2)
        k.hline(x - len, x + len, y, R('bone'))
        for (const e of [x - len - 1, x + len + 1]) {
          k.dot(e, y - 1, R('bone'))
          k.dot(e, y + 1, R('bone'))
        }
      }
    }
  },
}

function lerpN(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export const outdoor: ElementDef[] = [tree, gravestones, swamp, fog, moon, deadGround]
