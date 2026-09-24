import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { R } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { crack, knob } from './util'

const O = R('outline')

// ---------------------------------------------------------------- manor

type Shutter = 'ok' | 'askew' | 'missing'
interface Win {
  x: number
  t: number
  b: number
  hw: number
  kind: 'window' | 'attic' | 'tower' | 'transom'
  lit: boolean
  boarded: boolean
  shutters: [Shutter, Shutter] | null
}

function manorWindow(k: Kit, w: Win): void {
  const { x, t, b, hw } = w
  const pane = w.lit ? R('glow') : R('pane')
  if (w.shutters) {
    const [l, r] = w.shutters
    const sw = 2
    if (l === 'ok') k.rect(x - hw - 1 - sw, t, x - hw - 1, b, R('shutter'), O)
    if (l === 'askew') k.poly([[x - hw - 1 - sw, t + 4], [x - hw - 1, t + 3], [x - hw - 2, b + 3], [x - hw - 2 - sw, b + 4]], R('shutter'), O)
    if (r === 'ok') k.rect(x + hw + 1, t, x + hw + 1 + sw, b, R('shutter'), O)
    if (r === 'askew') k.poly([[x + hw + 1, t + 3], [x + hw + 1 + sw, t + 4], [x + hw + 2 + sw, b + 4], [x + hw + 2, b + 3]], R('shutter'), O)
  }
  if (w.kind === 'attic' || w.kind === 'tower') {
    // pointed (gothic) window
    const arch = Math.min(4, hw + 2)
    k.poly([[x - hw, b], [x - hw, t + arch], [x, t], [x + hw, t + arch], [x + hw, b]], pane, R('trim'))
    if (hw >= 2) k.vline(x, t + 2, b - 1, w.lit ? O : R('wall'))
  } else {
    k.rect(x - hw, t, x + hw, b, pane, R('trim'))
    const mid = Math.round((t + b) / 2)
    const mull = w.lit ? O : R('wall')
    k.vline(x, t + 1, b - 1, mull)
    k.hline(x - hw + 1, x + hw - 1, mid, mull)
    // hood and sill
    k.line([[x - hw - 1, t - 1], [x, t - 3], [x + hw + 1, t - 1]], R('trim'))
    k.hline(x - hw - 1, x + hw + 1, b + 1, R('trim'))
    k.hline(x - hw - 1, x + hw + 1, b + 2, O)
  }
  if (w.boarded) {
    const h = b - t
    k.poly([[x - hw - 1, t + h * 0.2], [x + hw + 1, t + h * 0.55], [x + hw + 1, t + h * 0.55 + 2], [x - hw - 1, t + h * 0.2 + 2]], R('door'), O)
    k.poly([[x - hw - 1, t + h * 0.75], [x + hw + 1, t + h * 0.4], [x + hw + 1, t + h * 0.4 + 2], [x - hw - 1, t + h * 0.75 + 2]], R('door'), O)
  }
}

const manor: ElementDef = {
  id: 'spooky-manor',
  name: 'Haunted manor',
  themes: ['spooky'],
  category: 'structure',
  tags: ['house', 'mansion', 'haunted', 'victorian', 'building', 'door', 'tower'],
  roles: {
    wall: { label: 'Walls', color: 8 },
    trim: { label: 'Trim', color: 7 },
    roof: { label: 'Roof', color: 1 },
    outline: { label: 'Outline', color: 0 },
    pane: { label: 'Dark windows', color: 0 },
    glow: { label: 'Lit windows', color: 14 },
    shutter: { label: 'Shutters', color: 6 },
    door: { label: 'Door and boards', color: 6 },
    stone: { label: 'Stonework', color: 7 },
  },
  params: [
    { key: 'width', label: 'Width', type: 'int', min: 50, max: 120, default: 84 },
    { key: 'floors', label: 'Floors', type: 'int', min: 1, max: 3, default: 2 },
    { key: 'gables', label: 'Gables', type: 'int', min: 0, max: 3, default: 2 },
    {
      key: 'tower', label: 'Tower', type: 'select', default: 'left',
      options: [{ value: 'none', label: 'None' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }],
    },
    { key: 'lit', label: 'Lit windows', type: 'int', min: 0, max: 5, default: 2 },
    { key: 'decay', label: 'Decay', type: 'bool', default: true },
  ],
  defaultPriority: 'baseline',
  perspective: false,
  place: { x: 80, y: 128 },
  hasControl: true,
  generate(k, p, rng) {
    const W = p.n('width')
    const hw = Math.round(W / 2)
    const floors = p.n('floors')
    const decay = p.b('decay')
    const G0 = 50
    const GF = 32
    const H = G0 + (floors - 1) * GF
    const top = -H
    const roofH = 16
    const tower = p.s('tower')
    const tx = tower === 'left' ? -hw : tower === 'right' ? hw : 0
    const tr = 9
    const nearTower = (x: number, d: number) => tower !== 'none' && Math.abs(x - tx) < d

    // window columns, symmetric about the door
    const m = Math.max(1, Math.floor((hw - 8) / 19))
    const sp = (hw - 8) / m
    const cols: number[] = []
    for (let i = -m; i <= m; i++) cols.push(Math.round(i * sp))
    const wins: Win[] = []
    const shutters = (): [Shutter, Shutter] => {
      const one = (): Shutter => {
        if (!decay) return 'ok'
        const r = rng.next()
        return r < 0.22 ? 'askew' : r < 0.34 ? 'missing' : 'ok'
      }
      return [one(), one()]
    }
    for (let f = 0; f < floors; f++) {
      const base = f === 0 ? 0 : -G0 - (f - 1) * GF
      const b = f === 0 ? -14 : base - 7
      for (const x of cols) {
        if (f === 0 && Math.abs(x) < 14) continue
        if (nearTower(x, tr + 7)) continue
        wins.push({ x, t: b - 18, b, hw: 3, kind: 'window', lit: false, boarded: false, shutters: shutters() })
      }
    }

    // gables
    const maxG = W >= 70 ? 3 : 2
    const g = Math.min(p.n('gables'), maxG)
    const X = Math.min(cols[cols.length - 1], hw - 12)
    let gx: number[] = g === 1 ? [0] : g === 2 ? [-X, X] : g === 3 ? [-X, 0, X] : []
    gx = gx.filter((x) => !nearTower(x, 16))
    const gh = 24
    const ghw = g === 3 ? Math.min(12, Math.floor(X / 2) + 1) : 12
    for (const x of gx) wins.push({ x, t: top - 14, b: top - 4, hw: 2, kind: 'attic', lit: false, boarded: false, shutters: null })

    // tower
    const tTop = top - 8
    if (tower !== 'none') {
      for (let f = 0; f < floors; f++) {
        const base = f === 0 ? 0 : -G0 - (f - 1) * GF
        const b = f === 0 ? -14 : base - 7
        wins.push({ x: tx, t: b - 16, b, hw: 2, kind: 'tower', lit: false, boarded: false, shutters: null })
      }
      wins.push({ x: tx, t: tTop + 2, b: top - 2, hw: 2, kind: 'tower', lit: false, boarded: false, shutters: null })
    }
    const transom: Win = { x: 0, t: -45, b: -40, hw: 6, kind: 'transom', lit: false, boarded: false, shutters: null }

    // decay: boarded windows
    const plain = wins.filter((w) => w.kind === 'window')
    if (decay && plain.length >= 2) {
      const nb = plain.length >= 6 ? 2 : 1
      for (let i = 0; i < nb; i++) rng.pick(plain).boarded = true
    }
    // lit windows
    const pool = [...wins.filter((w) => !w.boarded), transom]
    for (let i = 0; i < p.n('lit') && pool.length; i++) {
      const j = rng.int(0, pool.length - 1)
      pool[j].lit = true
      pool.splice(j, 1)
    }

    // chimneys behind the roof
    const chim = [hw * 0.45 * (tower === 'right' ? -1 : 1)]
    if (W >= 76 && tower === 'none') chim.push(-hw * 0.55)
    for (const cxRaw of chim) {
      const cx = Math.round(cxRaw)
      const lean = decay ? rng.range(-0.08, 0.08) : 0
      const cTop = top - roofH - 9
      const sx = (y: number) => lean * (top - y)
      k.poly([[cx - 3 + sx(top), top], [cx - 3 + sx(cTop), cTop], [cx + 3 + sx(cTop), cTop], [cx + 3 + sx(top), top]], R('stone'), O)
      if (decay && rng.chance(0.5)) {
        k.poly([[cx - 4 + sx(cTop), cTop], [cx - 4 + sx(cTop), cTop - 2], [cx + sx(cTop), cTop - 2], [cx + 2 + sx(cTop), cTop - 1], [cx + 4 + sx(cTop), cTop - 1], [cx + 4 + sx(cTop), cTop]], R('stone'), O)
      } else {
        k.rect(cx - 4 + sx(cTop), cTop - 2, cx + 4 + sx(cTop), cTop, R('stone'), O)
      }
    }

    // main roof with iron cresting along the ridge
    const ridge = top - roofH
    k.poly([[-hw - 3, top + 1], [-hw + 8, ridge], [hw - 8, ridge], [hw + 3, top + 1]], R('roof'), O)
    k.hline(-hw + 3, hw - 3, top - 6, O)
    k.hline(-hw + 6, hw - 6, top - 11, O)
    for (let x = -hw + 9; x <= hw - 9; x += 3) {
      k.dot(x, ridge - 1, O)
      if (Math.round((x + hw) / 3) % 2 === 0) k.dot(x, ridge - 2, O)
    }
    if (decay) {
      // a hole in the roof with bare rafters
      const hx = Math.round(rng.range(-hw * 0.5, hw * 0.5))
      if (!gx.some((x) => Math.abs(x - hx) < ghw + 4)) {
        k.poly([[hx - 5, top - 3], [hx - 3, top - 8], [hx, top - 7], [hx + 2, top - 10], [hx + 5, top - 4], [hx + 1, top - 2]], R('pane'), O)
        k.line([[hx - 3, top - 3], [hx - 1, top - 8]], R('door'))
        k.line([[hx + 1, top - 3], [hx + 3, top - 8]], R('door'))
      }
    }

    // gables in front of the roof
    for (const x of gx) {
      k.poly([[x - ghw - 2, top + 1], [x, top - gh - 2], [x + ghw + 2, top + 1]], R('roof'), O)
      k.poly([[x - ghw, top], [x, top - gh + 1], [x + ghw, top]], R('wall'), O)
      k.vline(x, top - gh - 7, top - gh - 2, O)
      k.dot(x - 1, top - gh - 5, O)
      k.dot(x + 1, top - gh - 5, O)
    }

    // facade
    k.rect(-hw, top, hw, 0, R('wall'), O)
    k.rect(-hw - 2, top - 1, hw + 2, top + 2, R('trim'), O)
    for (let x = -hw; x <= hw; x += 3) k.dot(x, top + 3, O)
    for (let f = 1; f < floors; f++) {
      const y = -G0 - (f - 1) * GF
      k.hline(-hw, hw, y, R('trim'))
      k.hline(-hw, hw, y + 1, O)
    }
    k.vline(-hw + 1, top + 4, -5, R('trim'))
    k.vline(hw - 1, top + 4, -5, R('trim'))
    // stone foundation
    k.rect(-hw, -4, hw, 0, R('stone'), O)
    for (let x = -hw + 5; x < hw - 2; x += 7) k.vline(x, -3, -1, O)

    // attic windows sit in the gables
    for (const w of wins) manorWindow(k, w)

    // door with fanlight; the opening is 40 rows so any standing sprite fits
    k.rect(-12, -2, 12, 0, R('stone'), O)
    k.rect(-9, -47, 9, 0, R('trim'), O)
    k.poly(k.ellipsePts(0, -40, 7, 5, 12, Math.PI, Math.PI * 2), transom.lit ? R('glow') : R('pane'), O)
    k.vline(0, -45, -40, O)
    k.rect(-7, -40, 7, 0, R('door'), O)
    k.vline(0, -40, 0, O)
    for (const sx of [-1, 1]) {
      k.rect(sx * 2, -37, sx * 5, -25, R('door'), O)
      k.rect(sx * 2, -20, sx * 5, -4, R('door'), O)
    }
    k.dot(-1, -22, R('glow'))
    k.dot(1, -22, R('glow'))

    // tower in front of the corner
    if (tower !== 'none') {
      k.rect(tx - tr, tTop, tx + tr, 0, R('wall'), O)
      k.vline(tx + tr - 3, tTop + 3, -5, O)
      k.rect(tx - tr - 1, tTop - 1, tx + tr + 1, tTop + 2, R('trim'), O)
      for (let f = 1; f < floors; f++) {
        const y = -G0 - (f - 1) * GF
        k.hline(tx - tr, tx + tr, y, R('trim'))
        k.hline(tx - tr, tx + tr, y + 1, O)
      }
      k.rect(tx - tr, -4, tx + tr, 0, R('stone'), O)
      k.poly([[tx - tr - 3, tTop], [tx, tTop - 30], [tx + tr + 3, tTop]], R('roof'), O)
      k.line([[tx - 4, tTop - 1], [tx - 1, tTop - 21]], O)
      k.vline(tx, tTop - 36, tTop - 30, O)
      k.hline(tx - 2, tx + 2, tTop - 33, O)
      for (const w of wins) if (w.kind === 'tower') manorWindow(k, w)
    }

    if (decay) {
      // cracks running from window corners
      const plainWins = wins.filter((w) => w.kind === 'window' && !nearTower(w.x, tr + 8))
      const n = Math.min(plainWins.length, rng.int(2, 3))
      for (let i = 0; i < n; i++) {
        const w = rng.pick(plainWins)
        const s = rng.chance(0.5) ? -1 : 1
        const up = rng.chance(0.5)
        crack(k, rng, w.x + s * (w.hw + 1), up ? w.t - 1 : w.b + 3, rng.range(6, 11), up ? -Math.PI / 2 - s * 0.5 : Math.PI / 2 - s * 0.5, O)
      }
    }

    // control: solid footprint, trigger in the doorway
    const x0 = Math.min(-hw, tower === 'left' ? tx - tr : -hw)
    const x1 = Math.max(hw, tower === 'right' ? tx + tr : hw)
    k.wall([[x0, 0], [-8, 0]])
    k.wall([[8, 0], [x1, 0]])
    k.trigger([[-7, 0], [7, 0]])
  },
}

// ---------------------------------------------------------------- crypt

function statue(k: Kit, kind: string, y: number): void {
  const S = R('stone')
  if (kind === 'urn') {
    k.rect(-2, y - 2, 2, y, S, O)
    k.ellipse(0, y - 5, 2.5, 3.5, S, O)
    k.rect(-2, y - 10, 2, y - 8, S, O)
  } else if (kind === 'cross') {
    k.poly([[-1, y], [-1, y - 7], [-3, y - 7], [-3, y - 9], [-1, y - 9], [-1, y - 12], [1, y - 12], [1, y - 9], [3, y - 9], [3, y - 7], [1, y - 7], [1, y]], S, O)
  } else if (kind === 'angel') {
    for (const s of [-1, 1]) k.poly([[s, y - 9], [s * 3, y - 14], [s * 6, y - 16], [s * 6, y - 11], [s * 5, y - 6], [s * 3, y - 2], [s * 2, y - 6]], R('shade'), O)
    k.poly([[-3, y], [-1.5, y - 11], [1.5, y - 11], [3, y]], S, O)
    k.ellipse(0, y - 13, 1.3, 2.3, S, O)
  }
}

const crypt: ElementDef = {
  id: 'spooky-crypt',
  name: 'Crypt',
  themes: ['spooky'],
  category: 'structure',
  tags: ['mausoleum', 'tomb', 'graveyard', 'cemetery', 'door', 'columns'],
  roles: {
    stone: { label: 'Stone', color: 7 },
    shade: { label: 'Shadow', color: 8 },
    outline: { label: 'Outline', color: 0 },
    door: { label: 'Door', color: 8 },
    dark: { label: 'Darkness', color: 0 },
    moss: { label: 'Moss', color: 2 },
    glow: { label: 'Eyes', color: 12 },
  },
  params: [
    { key: 'width', label: 'Width', type: 'int', min: 30, max: 72, default: 46 },
    {
      key: 'columns', label: 'Columns', type: 'select', default: 'two',
      options: [{ value: 'none', label: 'None' }, { value: 'two', label: 'Two' }, { value: 'four', label: 'Four' }],
    },
    {
      key: 'door', label: 'Door', type: 'select', default: 'closed',
      options: [
        { value: 'closed', label: 'Closed' },
        { value: 'ajar', label: 'Ajar' },
        { value: 'open', label: 'Open' },
        { value: 'eyes', label: 'Open, eyes inside' },
      ],
    },
    { key: 'steps', label: 'Steps', type: 'int', min: 0, max: 3, default: 2 },
    {
      key: 'statue', label: 'Statue', type: 'select', default: 'angel',
      options: [{ value: 'none', label: 'None' }, { value: 'urn', label: 'Urn' }, { value: 'cross', label: 'Cross' }, { value: 'angel', label: 'Angel' }],
    },
    { key: 'moss', label: 'Moss', type: 'bool', default: true },
  ],
  defaultPriority: 'baseline',
  perspective: false,
  place: { x: 80, y: 124 },
  hasControl: true,
  generate(k, p, rng) {
    const W = p.n('width')
    const hw = Math.round(W / 2)
    const steps = p.n('steps')
    const ys = -2 * steps
    const bodyH = 44
    const bTop = ys - bodyH
    const eTop = bTop - 5
    const ph = Math.max(8, Math.round(W * 0.26))
    const cols = p.s('columns')
    const door = p.s('door')
    const S = R('stone')

    // steps
    const foot = hw + (steps ? 2 + steps * 2 : 0)
    for (let i = 0; i < steps; i++) {
      const h = hw + 2 + (steps - i) * 2
      k.rect(-h, -2 * i - 2, h, -2 * i, S, O)
    }
    // statue behind the pediment apex
    statue(k, p.s('statue'), eTop - ph + 2)
    // pediment
    k.poly([[-hw - 3, eTop], [0, eTop - ph], [hw + 3, eTop]], S, O)
    k.poly([[-hw + 1, eTop - 1], [0, eTop - ph + 3], [hw - 1, eTop - 1]], R('shade'), O)
    // body and entablature
    k.rect(-hw, bTop, hw, ys, S, O)
    k.rect(-hw - 2, eTop, hw + 2, bTop, S, O)
    k.hline(-hw - 1, hw + 1, eTop + 2, R('shade'))
    for (let x = -5; x <= 5; x += 2) k.dot(x, eTop + 3, O)

    if (cols !== 'none') {
      k.rect(-hw + 3, bTop + 1, hw - 3, ys - 1, R('shade'))
      const outer = hw - 3
      const xs = cols === 'two' ? [-outer, outer] : [-outer, -Math.max(11, Math.round(outer * 0.5)), Math.max(11, Math.round(outer * 0.5)), outer]
      for (const cx of xs) {
        k.rect(cx - 2, bTop + 3, cx + 2, ys - 2, S, O)
        k.vline(cx + 1, bTop + 4, ys - 3, R('shade'))
        k.rect(cx - 3, bTop, cx + 3, bTop + 2, S, O)
        k.rect(cx - 3, ys - 2, cx + 3, ys, S, O)
      }
    } else {
      k.vline(-hw + 3, bTop + 1, ys - 1, R('shade'))
      k.vline(hw - 3, bTop + 1, ys - 1, R('shade'))
    }

    // door
    // the opening is 37 rows so any standing sprite fits
    const dt = ys - 37
    k.rect(-8, dt - 2, 8, ys, S, O)
    if (door === 'closed' || door === 'ajar') {
      k.rect(-6, dt, 6, ys, R('door'), O)
      k.vline(0, dt, ys, O)
      for (const sx of [-1, 1]) {
        k.rect(sx * 2, dt + 3, sx * 5, dt + 15, R('door'), O)
        k.rect(sx * 2, dt + 20, sx * 5, ys - 3, R('door'), O)
      }
      k.dot(-1, dt + 17, S)
      k.dot(1, dt + 17, S)
      if (door === 'ajar') {
        k.rect(1, dt, 3, ys, R('dark'), R('dark'))
        k.poly([[3, dt], [6, dt + 2], [6, ys - 1], [3, ys]], R('door'), O)
      }
    } else {
      k.rect(-6, dt, 6, ys, R('dark'), O)
      // stairs going down into the dark
      for (let i = 0; i < 4; i++) k.hline(-3 + i * 0.7, 3 - i * 0.7, ys - 3 - i * 3, R('shade'))
      k.poly([[-6, dt], [-4, dt + 3], [-4, ys - 3], [-6, ys]], R('door'), O)
      k.poly([[6, dt], [4, dt + 3], [4, ys - 3], [6, ys]], R('door'), O)
      if (door === 'eyes') {
        k.dot(-2, dt + 13, R('glow'))
        k.dot(1, dt + 13, R('glow'))
      }
    }

    // weathering
    for (let i = 0; i < 2; i++) {
      const side = i % 2 ? 1 : -1
      const x = side * rng.range(10, Math.max(11, hw - 4))
      crack(k, rng, x, bTop + 1, rng.range(6, 12), Math.PI / 2 + rng.range(-0.4, 0.4), O)
    }
    if (p.b('moss')) {
      const n = rng.int(4, 8)
      for (let i = 0; i < n; i++) {
        const x = Math.round(rng.range(-hw - 1, hw + 1))
        if (Math.abs(x) < 9) continue
        k.vline(x, bTop + 1, bTop + rng.int(1, 6), R('moss'))
      }
      for (let i = 0; i < 3; i++) {
        const x = Math.round(rng.range(-foot + 2, foot - 2))
        if (Math.abs(x) < 9) continue
        k.hline(x - rng.int(1, 3), x + rng.int(1, 3), ys - 1, R('moss'))
      }
    }

    k.wall([[-foot, 0], [-7, 0]])
    k.wall([[7, 0], [foot, 0]])
    k.trigger([[-6, 0], [6, 0]])
  },
}

// ---------------------------------------------------------------- iron fence

function spear(k: Kit, x: number, top: number, bottom: number, c: ColorRef, bend = 0): void {
  if (bend) k.line([[x, bottom], [x, (top + bottom) / 2], [x + bend, top + 2]], c)
  else k.vline(x, top + 1, bottom, c)
  const tx = x + bend
  k.dot(tx, top, c)
  k.hline(tx - 1, tx + 1, top + 1, c)
}

function ironPost(k: Kit, x: number, top: number, c: ColorRef): void {
  k.rect(x - 1, top, x, 0, c)
  knob(k, x - 0.5, top, c, 1)
}

function stonePillar(k: Kit, x: number, top: number): void {
  k.rect(x - 3, top + 2, x + 3, 0, R('stone'), O)
  k.vline(x + 1, top + 3, -1, R('shade'))
  k.rect(x - 4, top, x + 4, top + 2, R('stone'), O)
  knob(k, x, top, R('stone'))
}

function fenceRun(k: Kit, rng: Rng, xa: number, xb: number, h: number, decay: boolean, posts: boolean): void {
  if (xb - xa < 1) return
  const c = R('iron')
  k.hline(xa, xb, -h + 4, c)
  k.hline(xa, xb, -3, c)
  let i = 0
  for (let x = Math.ceil(xa); x <= xb; x += 3, i++) {
    const r = decay ? rng.next() : 1
    if (r < 0.05) continue
    const bend = r < 0.12 ? (rng.chance(0.5) ? -1 : 1) : 0
    spear(k, x, -h, 0, c, bend)
    if (posts && i % 6 === 5 && x < xb - 3) ironPost(k, x, -h - 1, c)
  }
}

const fence: ElementDef = {
  id: 'spooky-fence',
  name: 'Iron fence and gate',
  themes: ['spooky'],
  category: 'structure',
  tags: ['fence', 'gate', 'wrought iron', 'graveyard', 'cemetery', 'railing'],
  roles: {
    iron: { label: 'Iron', color: 0 },
    stone: { label: 'Pillars', color: 7 },
    shade: { label: 'Pillar shade', color: 8 },
    outline: { label: 'Outline', color: 0 },
  },
  params: [
    { key: 'length', label: 'Length', type: 'int', min: 20, max: 158, default: 80 },
    { key: 'height', label: 'Height', type: 'int', min: 14, max: 40, default: 24 },
    {
      key: 'gate', label: 'Gate', type: 'select', default: 'closed',
      options: [{ value: 'none', label: 'None' }, { value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }],
    },
    { key: 'pillars', label: 'Stone pillars', type: 'bool', default: true },
    { key: 'decay', label: 'Bent bars', type: 'bool', default: true },
  ],
  defaultPriority: 'baseline',
  perspective: true,
  place: { x: 80, y: 140 },
  hasControl: true,
  generate(k, p, rng) {
    const L = p.n('length')
    const half = Math.round(L / 2)
    const h = p.n('height')
    const gate = p.s('gate')
    const pillars = p.b('pillars')
    const decay = p.b('decay')
    const c = R('iron')
    const gh = Math.min(9, Math.max(6, Math.floor(half / 2)))
    const hasGate = gate !== 'none'
    const inset = pillars ? 4 : 1
    if (!hasGate) {
      fenceRun(k, rng, -half + inset, half - inset, h, decay, !pillars)
    } else {
      fenceRun(k, rng, -half + inset, -gh - inset - 1, h, decay, !pillars)
      fenceRun(k, rng, gh + inset + 1, half - inset, h, decay, !pillars)
      const arch = Math.max(3, Math.round(h * 0.25))
      if (pillars) {
        stonePillar(k, -gh - 3, -h - arch - 1)
        stonePillar(k, gh + 3, -h - arch - 1)
      } else {
        ironPost(k, -gh - 1, -h - arch, c)
        ironPost(k, gh + 1, -h - arch, c)
      }
      if (gate === 'closed') {
        for (const s of [-1, 1]) {
          const x0 = s * gh
          k.hline(x0, 0, -h + 4, c)
          k.hline(x0, 0, -3, c)
          k.hline(x0, 0, -Math.round(h * 0.45), c)
          for (let i = 1; i < gh; i += 2) {
            const x = s * (gh - i)
            const t = Math.sin((Math.PI * (gh - i)) / (gh * 2))
            spear(k, x, -h - Math.round(arch * (1 - t * t) + 0.3), 0, c)
          }
        }
        k.vline(0, -h - arch + 2, 0, c)
        k.outline(k.ellipsePts(0, -Math.round(h * 0.62), 2, 3.4, 10), c)
      } else {
        // leaves swung open toward the viewer
        for (const s of [-1, 1]) {
          const x0 = s * (gh - 1)
          const x1 = s * (gh - 5)
          const drop = 5
          const topY = -h - Math.round(arch * 0.5)
          k.line([[x0, topY], [x1, topY + drop]], c)
          k.line([[x0, -h + 5], [x1, -h + 5 + drop]], c)
          k.line([[x0, -2], [x1, -2 + drop]], c)
          for (let i = 0; i <= 2; i++) {
            const t = i / 2
            const x = Math.round(x0 + (x1 - x0) * t)
            const dy = Math.round(drop * t)
            k.vline(x, topY + dy, dy, c)
          }
        }
      }
    }
    if (pillars) {
      stonePillar(k, -half, -h - 3)
      stonePillar(k, half, -h - 3)
    } else {
      ironPost(k, -half, -h - 1, c)
      ironPost(k, half + 1, -h - 1, c)
    }

    const e = pillars ? half + 4 : half + 1
    if (!hasGate) k.wall([[-e, 0], [e, 0]])
    else {
      const gi = pillars ? gh : gh - 1
      k.wall([[-e, 0], [-gi - 1, 0]])
      k.wall([[gi + 1, 0], [e, 0]])
      if (gate === 'closed') k.condWall([[-gi, 0], [gi, 0]])
      else k.trigger([[-gi, 0], [gi, 0]])
    }
  },
}

export const buildings: ElementDef[] = [manor, crypt, fence]
