import type { Rng } from '../../agi/rng'
import { lerp, R, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { ASPECT, crack } from './util'

const O = R('outline')

// ---------------------------------------------------------------- cracked room shell

/** Horizontal extent of a polygon at row y (for clipping details to a patch). */
function spanAt(poly: readonly (readonly [number, number])[], y: number): [number, number] | null {
  let lo = Infinity
  let hi = -Infinity
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i]
    const [bx, by] = poly[(i + 1) % poly.length]
    if ((ay <= y && by >= y) || (by <= y && ay >= y)) {
      const x = ay === by ? ax : ax + ((y - ay) * (bx - ax)) / (by - ay)
      lo = Math.min(lo, x)
      hi = Math.max(hi, x)
    }
  }
  return lo <= hi ? [lo, hi] : null
}

/** Fallen plaster: a rounded hole with a chipped light rim, brick courses inside. */
function brickPatch(k: Kit, rng: Rng, cx: number, cy: number, rx: number, ry: number): void {
  k.poly(k.blobPts(cx, cy, rx + 1.5, ry + 2, rng, 8, 0.18), R('trim'))
  const hole = k.blobPts(cx, cy, rx, ry, rng, 9, 0.1)
  k.poly(hole, R('brick'), O)
  const y0 = Math.ceil(cy - ry)
  const y1 = Math.floor(cy + ry)
  let row = 0
  for (let y = y0 + 2; y < y1; y += 2, row++) {
    const s = spanAt(hole, y)
    if (!s || s[1] - s[0] < 3) continue
    k.hline(Math.ceil(s[0] + 0.5), Math.floor(s[1] - 0.5), y, R('mortar'))
    const s2 = spanAt(hole, y + 1)
    if (!s2) continue
    for (let x = s2[0] + (row % 2 ? 1.5 : 3.5); x < s2[1] - 1; x += 4) k.dot(x, y + 1, R('mortar'))
  }
}

const room: ElementDef = {
  id: 'spooky-room',
  name: 'Cracked room',
  themes: ['spooky'],
  category: 'interior',
  tags: ['room', 'interior', 'haunted', 'perspective', 'walls', 'cracks', 'shell', 'door', 'window'],
  span: 'full',
  roles: {
    wall: { label: 'Back wall', color: 8 },
    side: { label: 'Side walls', color: 8 },
    floor: { label: 'Floor', color: 6 },
    ceiling: { label: 'Ceiling', color: 0 },
    beam: { label: 'Beams', color: 8 },
    outline: { label: 'Lines', color: 0 },
    trim: { label: 'Trim', color: 7 },
    brick: { label: 'Bare brick', color: 4 },
    mortar: { label: 'Mortar', color: 8 },
    pane: { label: 'Window', color: 1 },
    drape: { label: 'Drapes', color: 4 },
    board: { label: 'Boards', color: 6 },
    dark: { label: 'Doorway', color: 0 },
  },
  params: [
    { key: 'backW', label: 'Back wall width', type: 'int', min: 40, max: 120, default: 76 },
    { key: 'backH', label: 'Back wall height', type: 'int', min: 30, max: 90, default: 56 },
    {
      key: 'floor', label: 'Floor', type: 'select', default: 'boards',
      options: [{ value: 'boards', label: 'Boards' }, { value: 'stone', label: 'Flagstones' }, { value: 'dirt', label: 'Dirt' }],
    },
    { key: 'cracks', label: 'Cracks', type: 'int', min: 0, max: 10, default: 5 },
    {
      key: 'window', label: 'Window', type: 'select', default: 'arched',
      options: [{ value: 'none', label: 'None' }, { value: 'arched', label: 'Arched, drapes' }, { value: 'boarded', label: 'Boarded' }],
    },
    {
      key: 'door', label: 'Doorway', type: 'select', default: 'left',
      options: [{ value: 'none', label: 'None' }, { value: 'back', label: 'Back wall' }, { value: 'left', label: 'Left wall' }, { value: 'right', label: 'Right wall' }],
    },
  ],
  defaultPriority: 'rows',
  perspective: false,
  place: { x: 80, y: 100 },
  hasControl: true,
  generate(k, p, rng) {
    const by1 = Math.round(k.ctx.y)
    const bw = p.n('backW')
    const bh = p.n('backH')
    const bx0 = Math.round(80 - bw / 2)
    const bx1 = Math.round(80 + bw / 2)
    const by0 = by1 - bh
    const vpx = 80
    const vpy = by1 - Math.min(bh * 0.5, 26)
    const edge = ([cx, cy]: LP): LP => {
      const dx = cx - vpx
      const dy = cy - vpy
      const tx = dx < 0 ? -vpx / dx : dx > 0 ? (159 - vpx) / dx : Infinity
      const ty = dy < 0 ? -vpy / dy : dy > 0 ? (167 - vpy) / dy : Infinity
      const t = Math.min(tx, ty)
      return [vpx + dx * t, vpy + dy * t]
    }
    const BL: LP = [bx0, by1]
    const BR: LP = [bx1, by1]
    const TL: LP = [bx0, by0]
    const TR: LP = [bx1, by0]
    const eBL = edge(BL)
    const eBR = edge(BR)
    const eTL = edge(TL)
    const eTR = edge(TR)
    const onSide = (e: LP) => e[0] <= 0.01 || e[0] >= 158.99

    // big planes
    const ceil: LP[] = [TL, eTL]
    if (onSide(eTL)) ceil.push([0, 0])
    if (onSide(eTR)) ceil.push([159, 0])
    ceil.push(eTR, TR)
    k.poly(ceil, R('ceiling'), O)
    const left: LP[] = [TL, BL, eBL]
    if (!onSide(eBL)) left.push([0, 167])
    if (!onSide(eTL)) left.push([0, 0])
    left.push(eTL)
    k.poly(left, R('side'), O)
    const right: LP[] = [TR, BR, eBR]
    if (!onSide(eBR)) right.push([159, 167])
    if (!onSide(eTR)) right.push([159, 0])
    right.push(eTR)
    k.poly(right, R('side'), O)
    const fl: LP[] = [BL, BR, eBR]
    if (onSide(eBR)) fl.push([159, 167])
    if (onSide(eBL)) fl.push([0, 167])
    fl.push(eBL)
    k.poly(fl, R('floor'), O)
    k.rect(bx0, by0, bx1, by1, R('wall'), O)

    // ceiling beams converge on the vanishing point
    for (let x = bx0 + 8; x < bx1 - 5; x += 12) {
      k.poly([[x, by0], [x + 3, by0], edge([x + 3, by0]), edge([x, by0])], R('beam'), O)
    }

    // floor
    const floor = p.s('floor')
    const floorX = (y: number, side: number) => vpx + ((side < 0 ? bx0 : bx1) - vpx) * ((y - vpy) / (by1 - vpy))
    if (floor === 'boards') {
      for (let x = bx0 + 6; x < bx1 - 2; x += 6) k.line([[x, by1], edge([x, by1])], O)
      for (let i = 0; i < 14; i++) {
        const x = bx0 + 6 * rng.int(0, Math.floor(bw / 6) - 1)
        const y = rng.range(by1 + 3, 164)
        const f = (y - vpy) / (by1 - vpy)
        const xa = vpx + (x - vpx) * f
        const xb = vpx + (x + 6 - vpx) * f
        k.hline(Math.round(xa) + 1, Math.round(xb) - 1, Math.round(y), O)
      }
    } else if (floor === 'stone') {
      for (let x = bx0 + 9; x < bx1 - 3; x += 9) k.line([[x, by1], edge([x, by1])], O)
      for (let f = 1.22; ; f *= 1.28) {
        const y = Math.round(vpy + (by1 - vpy) * f)
        if (y > 166) break
        k.hline(Math.round(floorX(y, -1)), Math.round(floorX(y, 1)), y, O)
      }
    } else {
      for (let i = 0; i < 40; i++) {
        const y = Math.round(rng.range(by1 + 2, 166))
        const x = Math.round(rng.range(floorX(y, -1) + 2, floorX(y, 1) - 2))
        k.dot(x, y, rng.chance(0.5) ? O : R('beam'))
        if (y > by1 + 20 && rng.chance(0.4)) k.dot(x + 1, y, O)
      }
    }

    // dado rail round the walls
    const rail = Math.round(by1 - bh * 0.3)
    k.hline(bx0 + 1, bx1 - 1, rail, R('trim'))
    k.line([[bx0, rail], edge([bx0, rail])], R('trim'))
    k.line([[bx1, rail], edge([bx1, rail])], R('trim'))

    // openings (computed first so cracks and plaster keep clear of them)
    const door = p.s('door')
    let doorX0 = 0
    let doorX1 = 0
    let sideDoor: [LP, LP] | null = null
    if (door === 'back') {
      const dx = bw >= 70 ? Math.round(bw * 0.22) : 0
      doorX0 = 80 + dx - 7
      doorX1 = 80 + dx + 7
    }
    const win = p.s('window')
    const wcx = door === 'back' && bw >= 70 ? Math.round(80 - bw * 0.22) : 80
    const canWin = !(door === 'back' && bw < 70)
    // cracks and fallen plaster
    const nc = p.n('cracks')
    for (let i = 0; i < nc; i++) {
      const where = rng.int(0, 3)
      if (where <= 1) {
        const x = rng.range(bx0 + 3, bx1 - 3)
        const fromTop = rng.chance(0.6)
        crack(k, rng, x, fromTop ? by0 + 1 : by1 - 1, bh * rng.range(0.25, 0.5), fromTop ? Math.PI / 2 : -Math.PI / 2, O)
      } else {
        const s = where === 2 ? -1 : 1
        const x = s < 0 ? rng.range(4, bx0 - 4) : rng.range(bx1 + 4, 155)
        const f = (x - vpx) / ((s < 0 ? bx0 : bx1) - vpx)
        const yTop = vpy + (by0 - vpy) * f
        const yBot = vpy + (by1 - vpy) * f
        if (yBot - yTop < 12) continue
        crack(k, rng, x, yTop + 1, (yBot - yTop) * rng.range(0.25, 0.45), Math.PI / 2 + rng.range(-0.3, 0.3), O)
      }
    }
    const np = Math.floor(nc / 3)
    const patches: [number, number, number][] = []
    for (let i = 0; i < np; i++) {
      const rx = rng.range(4.5, 7)
      const ry = rx * ASPECT * rng.range(0.7, 0.9)
      let x = rng.range(bx0 + rx + 2, bx1 - rx - 2)
      if (win !== 'none' && canWin && Math.abs(x - wcx) < 16) x = x < wcx ? wcx - 16 - rx : wcx + 16 + rx
      if (x - rx < bx0 + 1 || x + rx > bx1 - 1) continue
      if (door === 'back' && x + rx > doorX0 - 3 && x - rx < doorX1 + 3) continue
      const y = rng.chance(0.5) ? by0 + ry + rng.range(2, 8) : rail - ry - rng.range(2, 6)
      if (y - ry < by0 + 1) continue
      if (patches.some(([px, py, pr]) => Math.abs(px - x) < pr + rx + 3 && Math.abs(py - y) < (pr + rx) * ASPECT + 3)) continue
      patches.push([x, y, rx])
      brickPatch(k, rng, x, y, rx, ry)
    }

    // door
    if (door === 'back') {
      const dh = Math.min(38, bh - 3)
      k.rect(doorX0 - 2, by1 - dh - 2, doorX1 + 2, by1, R('trim'), O)
      k.rect(doorX0, by1 - dh, doorX1, by1, R('dark'), O)
    } else if (door === 'left' || door === 'right') {
      const s = door === 'left' ? -1 : 1
      const B = s < 0 ? BL : BR
      const eB = s < 0 ? eBL : eBR
      const T = s < 0 ? TL : TR
      const eT = s < 0 ? eTL : eTR
      const at = (t: number): [LP, LP] => {
        const f: LP = [lerp(B[0], eB[0], t), lerp(B[1], eB[1], t)]
        const c: LP = [lerp(T[0], eT[0], t), lerp(T[1], eT[1], t)]
        return [f, c]
      }
      const [f0, c0] = at(0.2)
      const [f1] = at(0.45)
      const h0 = Math.min(38, (f0[1] - c0[1]) * 0.66)
      const h1 = h0 * ((f1[1] - vpy) / (f0[1] - vpy))
      const q0: LP = [f0[0], f0[1] - h0]
      const q1: LP = [f1[0], f1[1] - h1]
      k.poly([[f0[0] - s * 1.5, f0[1]], [q0[0] - s * 1.5, q0[1] - 2], [q1[0] + s * 3, q1[1] - 3], [f1[0] + s * 3, f1[1]]], R('trim'), O)
      k.poly([f0, q0, q1, f1], R('dark'), O)
      sideDoor = [f0, f1]
    }

    if (win !== 'none' && canWin) {
      const whw = 7
      const sill = Math.round(by1 - bh * 0.34)
      const wh = Math.min(26, Math.round(bh * 0.5))
      const wt = sill - wh
      const ary = Math.min(8, wh * 0.4)
      const arch = k.ellipsePts(wcx, wt + ary, whw, ary, 12, Math.PI, Math.PI * 2).map(([x, y]) => [x, y] as LP)
      const shape: LP[] = [[wcx - whw, sill], ...arch, [wcx + whw, sill]]
      k.poly(shape.map(([x, y]) => [x + (x < wcx ? -2 : x > wcx ? 2 : 0), y + (y < sill ? -2 : 0)] as LP), R('trim'), O)
      k.poly(shape, win === 'boarded' ? R('dark') : R('pane'), O)
      if (win === 'arched') {
        k.vline(wcx, wt + 1, sill - 1, O)
        k.hline(wcx - whw + 1, wcx + whw - 1, Math.round(sill - wh * 0.45), O)
        // tattered drapes
        for (const s of [-1, 1]) {
          const x0 = wcx + s * (whw + 3)
          const x1 = wcx + s * (whw - 2)
          const rag: LP[] = [[x0, wt - 3], [x1, wt - 3], [x1 + s * 2, sill - wh * 0.4]]
          for (let i = 0; i <= 3; i++) rag.push([lerp(x1 + s * 2, x0, i / 3), sill + 3 + (i % 2 ? -3 : 0) + rng.int(0, 2)])
          k.poly(rag, R('drape'), O)
          k.line([[lerp(x0, x1, 0.5), wt - 1], [lerp(x0, x1, 0.5) + s, sill]], O)
        }
        k.rect(wcx - whw - 5, wt - 5, wcx + whw + 5, wt - 3, R('drape'), O)
      } else {
        for (const [ya, yb] of [[0.2, 0.35], [0.55, 0.45], [0.8, 0.9]]) {
          const y0 = wt + wh * ya
          const y1 = wt + wh * yb
          k.poly([[wcx - whw - 2, y0], [wcx + whw + 2, y1], [wcx + whw + 2, y1 + 2], [wcx - whw - 2, y0 + 2]], R('board'), O)
        }
      }
    }

    // walls where the floor meets the walls
    const backWall = (): void => {
      if (door === 'back') {
        k.wall([[bx0, by1], [doorX0 - 1, by1]])
        k.wall([[doorX1 + 1, by1], [bx1, by1]])
        k.trigger([[doorX0, by1], [doorX1, by1]])
      } else k.wall([BL, BR])
    }
    backWall()
    for (const s of [-1, 1]) {
      const B = s < 0 ? BL : BR
      const eB = s < 0 ? eBL : eBR
      if (sideDoor && ((s < 0 && door === 'left') || (s > 0 && door === 'right'))) {
        const [f0, f1] = sideDoor
        k.wall([B, f0])
        k.wall([f1, eB])
        k.trigger([f0, f1])
      } else k.wall([B, eB])
    }
  },
}

// ---------------------------------------------------------------- coffin

/**
 * Coffin top face at the default length (22), in pixels: head, shoulder and
 * foot corners on clean 2:1 and 4:1 slopes so the outline stays straight.
 * y is measured up from the front edge of the lid.
 */
const LID: LP[] = [[-11, -3], [-5, 0], [11, -4], [11, -8], [-5, -12], [-11, -9]]
const LINING: LP[] = [[-9, -4], [-5, -2], [9, -5], [9, -7], [-5, -10], [-9, -8]]
/** Standing coffin outline (head up) at the default length. */
const UPRIGHT: LP[] = [[-3, 0], [-5, -26], [-3, -34], [3, -34], [5, -26], [3, 0]]

const coffin: ElementDef = {
  id: 'spooky-coffin',
  name: 'Coffin',
  themes: ['spooky'],
  category: 'furniture',
  tags: ['coffin', 'casket', 'vampire', 'crypt', 'skeleton', 'bones'],
  roles: {
    wood: { label: 'Wood', color: 6 },
    side: { label: 'Sides', color: 6 },
    outline: { label: 'Outline', color: 0 },
    lining: { label: 'Lining', color: 4 },
    brass: { label: 'Brass', color: 14 },
    bone: { label: 'Bones', color: 15 },
    slab: { label: 'Stone slab', color: 8 },
    slabTop: { label: 'Slab top', color: 7 },
  },
  params: [
    {
      key: 'pose', label: 'Pose', type: 'select', default: 'lying',
      options: [{ value: 'lying', label: 'Lying' }, { value: 'standing', label: 'Standing' }],
    },
    {
      key: 'lid', label: 'Lid', type: 'select', default: 'closed',
      options: [{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open, empty' }, { value: 'bones', label: 'Open, skeleton' }],
    },
    { key: 'length', label: 'Length', type: 'int', min: 16, max: 30, default: 22 },
    { key: 'slab', label: 'Stone slab', type: 'bool', default: true },
    { key: 'cross', label: 'Brass cross', type: 'bool', default: true },
  ],
  defaultPriority: 'baseline',
  perspective: false,
  place: { x: 80, y: 140 },
  hasControl: true,
  generate(k, p) {
    const f = p.n('length') / 22
    const lid = p.s('lid')
    const open = lid !== 'closed'
    const sc = (pts: LP[], dx = 0, dy = 0): LP[] => pts.map(([x, y]) => [Math.round(x * f) + dx, Math.round(y * f) + dy])

    if (p.s('pose') === 'standing') {
      const H = Math.round(34 * f)
      const out = sc(UPRIGHT)
      const hw = Math.round(5 * f)
      k.poly(out.map(([x, y]) => [x + 2, y] as LP), R('side'), O)
      if (open) {
        k.poly(out, R('wood'), O)
        k.poly(sc(UPRIGHT.map(([x, y]) => [x * 0.6, y * 0.92 - 1] as LP)), R('lining'), O)
        if (lid === 'bones') {
          const sy = -Math.round(H * 0.82)
          k.ellipse(0, sy, 1.6, 2.6, R('bone'))
          k.dot(-1, sy, O)
          k.dot(1, sy, O)
          k.vline(0, sy + 3, -Math.round(H * 0.38), R('bone'))
          for (let i = 0; i < 3; i++) k.hline(-1, 1, sy + 5 + i * 2, R('bone'))
          k.line([[-1, -Math.round(H * 0.38)], [-2, -3]], R('bone'))
          k.line([[1, -Math.round(H * 0.38)], [2, -3]], R('bone'))
        }
        // lid swung open to the left, seen edge-on
        const lidPts = out.map(([x, y]) => [-hw - 2 - Math.round((x + hw) * 0.4), y + (y < -H / 2 ? -1 : 1)] as LP)
        k.poly(lidPts, R('wood'), O)
        if (p.b('cross')) k.vline(-hw - 4, -Math.round(H * 0.8), -Math.round(H * 0.5), R('brass'))
      } else {
        k.poly(out, R('wood'), O)
        if (p.b('cross')) {
          k.vline(0, -Math.round(H * 0.82), -Math.round(H * 0.5), R('brass'))
          k.hline(-1, 1, -Math.round(H * 0.74), R('brass'))
        }
      }
      k.wall([[-hw, 0], [hw + 2, 0]])
      return
    }

    // lying coffin seen from the front and a little above
    const half = Math.round(11 * f)
    const sideH = Math.max(3, Math.round(4 * f))
    const slab = p.b('slab')
    const base = slab ? -6 : 0
    if (slab) {
      k.rect(-half - 3, -8, half + 3, -5, R('slabTop'), O)
      k.rect(-half - 3, -5, half + 3, 0, R('slab'), O)
    }
    const top = base - sideH
    const lidPts = sc(LID, 0, top)
    const frontFaces = (pts: LP[], h: number) => {
      for (let i = 0; i < 2; i++) {
        const [ax, ay] = pts[i]
        const [bx, by] = pts[i + 1]
        k.poly([[ax, ay], [bx, by], [bx, by + h], [ax, ay + h]], R('side'), O)
      }
    }
    frontFaces(lidPts, sideH)
    k.dot(-1, base - 2, R('brass'))
    k.dot(Math.round(6 * f), base - 3, R('brass'))
    k.poly(lidPts, R('wood'), O)
    const midY = top - Math.round(6 * f)
    if (!open) {
      if (p.b('cross')) {
        k.hline(-Math.round(6 * f), Math.round(4 * f), midY, R('brass'))
        k.vline(-Math.round(3 * f), midY - 1, midY + 1, R('brass'))
      }
    } else {
      k.poly(sc(LINING, 0, top), R('lining'), O)
      const hx = -Math.round(7.5 * f)
      k.ellipse(hx, midY, 1.3, 1.6, R('bone'))
      if (lid === 'bones') {
        k.ellipse(hx + 1.5, midY, 1.5, 2, R('bone'))
        k.dot(hx + 1.5, midY, O)
        k.hline(hx + 3, Math.round(4 * f), midY, R('bone'))
        for (let i = 0; i < 3; i++) k.vline(hx + 4 + i * 1.5, midY - 2, midY + 2, R('bone'))
      }
      // lid slid off over the foot end
      const dx = Math.round(9 * f)
      const slid = sc(LID, dx, top - 3)
      frontFaces(slid, 2)
      k.poly(slid, R('wood'), O)
      if (p.b('cross')) {
        k.hline(dx - Math.round(6 * f), dx + Math.round(4 * f), midY - 3, R('brass'))
        k.vline(dx - Math.round(3 * f), midY - 4, midY - 2, R('brass'))
      }
    }
    const ext = slab ? 3 : 0
    k.wall([[-half - ext, 0], [half + ext, 0]])
  },
}

// ---------------------------------------------------------------- candelabra

function candle(k: Kit, x: number, y: number, h: number, lit: boolean, drip: boolean): void {
  k.vline(x, y - h + 1, y, R('wax'))
  if (drip) k.dot(x + 1, y - 1, R('wax'))
  if (lit) {
    k.dot(x, y - h, O)
    k.vline(x, y - h - 2, y - h - 1, R('flame'))
    k.dot(x, y - h - 3, R('tip'))
  }
}

const candelabra: ElementDef = {
  id: 'spooky-candelabra',
  name: 'Candelabra',
  themes: ['spooky'],
  category: 'furniture',
  tags: ['candle', 'candelabra', 'light', 'flame', 'wax'],
  roles: {
    metal: { label: 'Metal', color: 6 },
    shine: { label: 'Highlight', color: 14 },
    wax: { label: 'Wax', color: 15 },
    flame: { label: 'Flame', color: 14 },
    tip: { label: 'Flame tip', color: 12 },
    outline: { label: 'Outline', color: 0 },
  },
  params: [
    { key: 'arms', label: 'Candles', type: 'int', min: 1, max: 7, default: 5 },
    { key: 'height', label: 'Height', type: 'int', min: 8, max: 40, default: 28 },
    { key: 'lit', label: 'Lit', type: 'bool', default: true },
    { key: 'drips', label: 'Melted', type: 'bool', default: true },
  ],
  defaultPriority: 'baseline',
  perspective: true,
  place: { x: 56, y: 140 },
  hasControl: true,
  generate(k, p, rng) {
    const n = p.n('arms')
    const H = p.n('height')
    const lit = p.b('lit')
    const drips = p.b('drips')
    const M = R('metal')
    const bw = H >= 18 ? 4 : 3
    // foot
    k.poly([[-bw, 0], [-bw + 1, -2], [-1, -3], [1, -3], [bw - 1, -2], [bw, 0]], M, O)
    // stem with knobs
    const cupY = -H
    const joint = n > 1 ? Math.round(cupY + Math.max(4, H * 0.28)) : cupY
    k.vline(0, joint, -3, M)
    if (H >= 14) {
      for (const t of [0.3, 0.6]) {
        const y = Math.round(lerp(-3, joint, t))
        k.hline(-1, 1, y, M)
      }
    }
    // arms: U-shaped curves out to the cups
    const spread = n > 1 ? Math.min(3, 2 + Math.floor(H / 20)) : 0
    const xs = Array.from({ length: n }, (_, i) => Math.round((i - (n - 1) / 2) * spread))
    for (const x of xs) {
      if (x === 0) {
        k.vline(0, cupY, joint, M)
        continue
      }
      const dip = Math.min(4, Math.round(Math.abs(x) / 2) + 1)
      const armCup = cupY + Math.round(Math.abs(x) * 0.3)
      k.line([[0, joint], [x * 0.5, joint + dip], [x, joint + dip - 1], [x, armCup]], M)
    }
    // cups and candles
    for (const x of xs) {
      const armCup = x === 0 ? cupY : cupY + Math.round(Math.abs(x) * 0.3)
      k.hline(x - 1, x + 1, armCup, M)
      if (H >= 20) k.dot(x - 1, armCup, R('shine'))
      const ch = drips ? rng.int(2, 6) : 5
      candle(k, x, armCup - 1, ch, lit, drips && rng.chance(0.5))
    }
    k.wall([[-bw, 0], [bw, 0]])
  },
}

// ---------------------------------------------------------------- cobwebs

const cobweb: ElementDef = {
  id: 'spooky-cobweb',
  name: 'Cobweb',
  themes: ['spooky'],
  category: 'prop',
  tags: ['web', 'cobweb', 'spider', 'corner', 'dusty'],
  roles: {
    web: { label: 'Web', color: 7 },
    spider: { label: 'Spider', color: 0 },
  },
  params: [
    {
      key: 'corner', label: 'Corner', type: 'select', default: 'tl',
      options: [{ value: 'tl', label: 'Top left' }, { value: 'tr', label: 'Top right' }, { value: 'bl', label: 'Bottom left' }, { value: 'br', label: 'Bottom right' }],
    },
    { key: 'size', label: 'Size', type: 'int', min: 6, max: 40, default: 24 },
    { key: 'rings', label: 'Rings', type: 'int', min: 2, max: 7, default: 4 },
    { key: 'torn', label: 'Torn', type: 'bool', default: true },
    { key: 'spider', label: 'Spider', type: 'bool', default: true },
  ],
  defaultPriority: 'baseline',
  perspective: false,
  place: { x: 0, y: 0 },
  generate(k, p, rng) {
    const c = p.s('corner')
    const sx = c === 'tl' || c === 'bl' ? 1 : -1
    const sy = c === 'tl' || c === 'tr' ? 1 : -1
    // Left at a picture edge that its corner faces away from (e.g. the default
    // top-left spot with 'top right' chosen), the web jumps to that corner.
    const { x: ax, y: ay, flip } = k.ctx
    const s0 = k.sc || 1
    const faceLeft = (sx < 0) !== flip
    const ox = faceLeft && ax < 2 ? ((159 - ax) / s0) * (flip ? -1 : 1) : !faceLeft && ax > 157 ? (-ax / s0) * (flip ? -1 : 1) : 0
    const oy = sy < 0 && ay < 2 ? (167 - ay) / s0 : sy > 0 && ay > 165 ? -ay / s0 : 0
    const size = p.n('size')
    const rings = Math.min(p.n('rings'), Math.max(2, Math.floor(size / 5)))
    const torn = p.b('torn')
    const W = R('web')
    const spokes = Math.max(3, Math.min(7, Math.round(size / 8) + 2))
    const ang = Array.from({ length: spokes }, (_, i) => (i / (spokes - 1)) * (Math.PI / 2))
    const at = (a: number, r: number): LP => [ox + sx * Math.cos(a) * r * size, oy + sy * Math.sin(a) * r * size * ASPECT * 0.8]
    for (let i = 0; i < spokes; i++) {
      const a = ang[i] + (i > 0 && i < spokes - 1 ? rng.range(-0.08, 0.08) : 0)
      ang[i] = a
      k.line([[ox, oy], at(a, i === 0 || i === spokes - 1 ? 1.05 : 1)], W)
    }
    let tearRing = torn ? rng.int(1, rings - 1) : -1
    let dangle: LP | null = null
    for (let j = 1; j <= rings; j++) {
      const r = j / rings
      for (let i = 0; i < spokes - 1; i++) {
        if (j === tearRing && i === Math.floor((spokes - 1) / 2)) {
          dangle = at((ang[i] + ang[i + 1]) / 2, r * 0.95)
          continue
        }
        const a = at(ang[i], r)
        const b = at(ang[i + 1], r)
        const mid = at((ang[i] + ang[i + 1]) / 2, r * (0.9 + rng.range(-0.03, 0.03)))
        k.line([a, mid, b], W)
      }
    }
    if (dangle) {
      const len = size * 0.35
      k.line([dangle, [dangle[0] + sx * 1, dangle[1] + sy * len * 0.4], [dangle[0], dangle[1] + len]], W)
      tearRing = -1
    }
    if (p.b('spider')) {
      const a = ang[Math.max(1, spokes - 2)]
      const [x, y] = at(a, 0.62)
      const drop = sy > 0 ? size * rng.range(0.2, 0.45) : 0
      const px = Math.round(x)
      const py = Math.round(y + drop)
      if (drop) k.vline(px, Math.round(y), py - 1, W)
      const S = R('spider')
      k.hline(px - 1, px + 1, py, S)
      k.vline(px, py - 1, py + 1, S)
      k.dot(px - 2, py - 1, S)
      k.dot(px + 2, py - 1, S)
      k.dot(px - 2, py + 1, S)
      k.dot(px + 2, py + 1, S)
    }
  },
}

export const interior: ElementDef[] = [room, coffin, candelabra, cobweb]
