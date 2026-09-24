import type { Rng } from '../../agi/rng'
import { R } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { discRows, hazard, LIGHT_ROLES, lightColor } from './common'

const O = R('outline')

/** A box seen slightly from above and to the right: front, top and side faces. */
function crateBox(k: Kit, rng: Rng, x0: number, y1: number, w: number, h: number): void {
  const x1 = x0 + w
  const y0 = y1 - h
  const dx = Math.max(1.5, w * 0.16)
  const dy = Math.max(1.5, h * 0.2)
  k.poly([[x0, y0], [x0 + dx, y0 - dy], [x1 + dx, y0 - dy], [x1, y0]], R('top'), O)
  k.poly([[x1, y0], [x1 + dx, y0 - dy], [x1 + dx, y1 - dy], [x1, y1]], R('shade'), O)
  k.rect(x0, y0, x1, y1, R('crate'), O)
  if (w >= 7 && h >= 6) {
    k.outline([[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x1 - 1, y1 - 1], [x0 + 1, y1 - 1]], R('band'))
    const mode = rng.int(0, 2)
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    if (mode === 0) {
      // stencilled label plate
      k.rect(cx - w * 0.25, cy - 1, cx + w * 0.25, cy + 1, R('label'), O)
    } else if (mode === 1) {
      // cross bracing
      k.line([[x0 + 1, y0 + 1], [x1 - 1, y1 - 1]], R('band'))
      k.line([[x0 + 1, y1 - 1], [x1 - 1, y0 + 1]], R('band'))
      k.rect(cx - 1, cy - 1, cx + 1, cy + 1, R('label'), O)
    } else {
      // hazard strip
      hazard(k, x0 + 2, y1 - 3, x1 - 2, y1 - 2, 3, R('label'), O)
      k.hline(x0 + 2, x0 + 2 + w * 0.35, y0 + 3, O)
    }
  }
}

function canister(k: Kit, rng: Rng, x0: number, y1: number, w: number, h: number): void {
  const x1 = x0 + w
  const cx = (x0 + x1) / 2
  const r = w / 2
  const ry = Math.max(1, r * 0.35)
  const y0 = y1 - h + ry
  k.poly([...k.ellipsePts(cx, y1 - ry, r, ry, 12, 0, Math.PI), [x0, y0], [x1, y0]], R('crate'), O)
  k.ellipse(cx, y0, r, ry, R('top'), O)
  k.ellipse(cx, y0, r * 0.35, ry * 0.5, R('shade'))
  // shading down the right side and bands
  k.rect(x1 - Math.max(1, w * 0.18), y0 + ry, x1 - 0.5, y1 - ry * 1.5, R('shade'))
  const bands = h > 10 ? 2 : 1
  for (let i = 1; i <= bands; i++) k.hline(x0 + 0.5, x1 - 0.5, y0 + ((y1 - y0) * i) / (bands + 1), R('band'))
  if (w >= 6 && rng.chance(0.7)) {
    const ly = y0 + (y1 - y0) * 0.5 - 1
    k.poly([[cx - 1.5, ly + 2], [cx, ly - 1], [cx + 1.5, ly + 2]], R('label'), O)
  }
}

export const props: ElementDef[] = [
  {
    id: 'scifi-crate',
    name: 'Cargo crates',
    themes: ['scifi'],
    category: 'prop',
    tags: ['crate', 'box', 'cargo', 'canister', 'barrel', 'storage', 'stack'],
    roles: {
      crate: { label: 'Front', color: 7 },
      top: { label: 'Top', color: 15 },
      shade: { label: 'Side', color: 8 },
      band: { label: 'Bands', color: 8 },
      label: { label: 'Labels', color: 14 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'style', label: 'Style', type: 'select', default: 'crate',
        options: [{ value: 'crate', label: 'Crates' }, { value: 'canister', label: 'Canisters' }],
      },
      { key: 'width', label: 'Width', type: 'int', min: 6, max: 24, default: 12 },
      { key: 'height', label: 'Height', type: 'int', min: 5, max: 20, default: 10 },
      { key: 'count', label: 'Bottom row', type: 'int', min: 1, max: 5, default: 2 },
      { key: 'stack', label: 'Stack height', type: 'int', min: 1, max: 4, default: 2 },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const h = p.n('height')
      const count = p.n('count')
      const stack = p.n('stack')
      const can = p.s('style') === 'canister'
      // canisters: same sliders, barrel proportions
      const cw = can ? Math.max(4, Math.round(w * 0.7)) : w
      const ch = can ? h * 1.4 : h
      const gap = can ? 1 : 0
      const total = count * cw + (count - 1) * gap
      let y = 0
      for (let r = 0; r < stack; r++) {
        const n = Math.max(1, count - r)
        const rowW = n * cw + (n - 1) * gap
        let x = -total / 2 + (total - rowW) / 2 + (r > 0 ? rng.range(-1.5, 1.5) : 0)
        for (let i = 0; i < n; i++) {
          if (can) canister(k, rng, x, y, cw, ch)
          else crateBox(k, rng, x, y, cw, ch)
          x += cw + gap
        }
        y -= can ? ch - Math.max(1, cw * 0.17) : ch
      }
      const extra = can ? 0 : Math.max(1.5, cw * 0.16)
      k.wall([[-total / 2, 0], [total / 2 + extra, 0]])
    },
  },
  {
    id: 'scifi-grating',
    name: 'Floor grating',
    themes: ['scifi'],
    category: 'ground',
    tags: ['grating', 'grate', 'vent', 'floor', 'panel', 'hatch'],
    roles: {
      frame: { label: 'Frame', color: 8 },
      bar: { label: 'Bars', color: 7 },
      under: { label: 'Underneath', color: 0 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'style', label: 'Style', type: 'select', default: 'grid',
        options: [{ value: 'bars', label: 'Bars' }, { value: 'grid', label: 'Grid' }, { value: 'vent', label: 'Vent slots' }],
      },
      { key: 'width', label: 'Width', type: 'int', min: 8, max: 90, default: 30 },
      { key: 'depth', label: 'Depth', type: 'int', min: 4, max: 36, default: 10 },
      { key: 'taper', label: 'Perspective taper', type: 'int', min: 0, max: 12, default: 3 },
    ],
    defaultPriority: 'rows',
    perspective: true,
    place: { x: 80, y: 140 },
    generate(k, p) {
      const hw = p.n('width') / 2
      const d = p.n('depth')
      const t = Math.min(p.n('taper'), hw - 3)
      const style = p.s('style')
      k.poly([[-hw, 0], [hw, 0], [hw - t, -d], [-hw + t, -d]], R('frame'), O)
      const half = (y: number) => hw - 2 - (t * -y) / d
      const iy0 = -1
      const iy1 = -d + 1
      k.poly([[-half(iy0), iy0], [half(iy0), iy0], [half(iy1), iy1], [-half(iy1), iy1]], R('under'))
      if (style === 'vent') {
        for (let y = iy0 - 1; y > iy1; y -= 2) {
          const a = half(y)
          for (let x = -a + 1; x < a - 1; x += 4) k.hline(x, Math.min(a - 1, x + 2), y, R('bar'))
        }
      } else {
        for (let y = iy0 - 1; y > iy1; y -= 2) k.hline(-half(y), half(y), y, R('bar'))
        if (style === 'grid') {
          const n = Math.max(1, Math.floor((hw - 2) / 3))
          for (let i = -n; i <= n; i++) {
            const f = i / n
            k.line([[f * half(iy0) * 0.95, iy0], [f * half(iy1) * 0.95, iy1]], R('bar'))
          }
        }
      }
    },
  },
  {
    id: 'scifi-escape-pod',
    name: 'Escape pod',
    themes: ['scifi'],
    category: 'structure',
    tags: ['escape pod', 'capsule', 'lander', 'crash', 'vehicle', 'spaceship'],
    roles: {
      hull: { label: 'Hull', color: 7 },
      shade: { label: 'Belly / shade', color: 8 },
      trim: { label: 'Stripe / fins', color: 4 },
      window: { label: 'Canopy', color: 3 },
      glint: { label: 'Glint', color: 11 },
      dark: { label: 'Open hatch', color: 0 },
      scorch: { label: 'Scorch marks', color: 0 },
      outline: { label: 'Outline', color: 0 },
      ...LIGHT_ROLES,
    },
    params: [
      { key: 'size', label: 'Size', type: 'int', min: 24, max: 64, default: 52 },
      {
        key: 'state', label: 'Hatch', type: 'select', default: 'closed',
        options: [{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }],
      },
      { key: 'legs', label: 'Landing legs', type: 'bool', default: true },
      { key: 'scorch', label: 'Scorched ground', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    // enterable: never shrinks with depth (sprites don't scale)
    perspective: false,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const s = p.n('size')
      const legs = p.b('legs')
      const open = p.s('state') === 'open'
      const rx = s / 2
      const bh = s * 0.72
      const lift = legs ? Math.max(3, s * 0.14) : 0
      const cy = -lift - bh / 2
      const ry = bh / 2
      if (p.b('scorch')) {
        for (let i = 0; i < 5; i++) {
          k.plot(rng.range(-rx * 1.2, rx * 1.2), rng.range(-1.5, 1.5), rng.int(2, 4), R('scorch'), { splatter: true, texture: rng.int(0, 127) })
        }
      }
      // landing legs behind the hull
      if (legs) {
        for (const sgn of [-1, 1]) {
          const hx = sgn * rx * 0.45
          const fx = sgn * rx * 0.8
          k.line([[hx, cy + ry * 0.6], [fx, -1]], R('shade'))
          k.line([[hx + sgn, cy + ry * 0.6], [fx + sgn, -1]], O)
          k.rect(fx - 1.5, -1, fx + 1.5, 0, R('shade'), O)
        }
      }
      // tail fins at the rear (left)
      k.poly([[-rx * 0.45, cy - ry * 0.7], [-rx * 1.05, cy - ry * 1.25], [-rx * 1.1, cy - ry * 0.95], [-rx * 0.8, cy - ry * 0.35]], R('trim'), O)
      const fy = (v: number) => Math.min(-0.5, v)
      k.poly([[-rx * 0.45, fy(cy + ry * 0.7)], [-rx * 1.05, fy(cy + ry * 1.15)], [-rx * 1.1, fy(cy + ry * 0.9)], [-rx * 0.8, fy(cy + ry * 0.35)]], R('trim'), O)
      // engine bell
      k.poly([[-rx + 1, cy - ry * 0.3], [-rx - 2.5, cy - ry * 0.45], [-rx - 2.5, cy + ry * 0.45], [-rx + 1, cy + ry * 0.3]], R('shade'), O)
      // hull, belly shade and stripe
      k.ellipse(0, cy, rx, ry, R('hull'), O)
      discRows(k, 0, cy, rx - 0.6, ry - 0.8, (y, a, b, t) => {
        if (t > 0.45) k.hline(a, b, y, R('shade'))
        else if (t > 0.05 && t < 0.2) k.hline(a, b, y, R('trim'))
      })
      // canopy at the nose
      const wx = rx * 0.42
      const wy = cy - ry * 0.4
      k.ellipse(wx, wy, rx * 0.3, ry * 0.3, R('window'), O)
      k.hline(wx - rx * 0.12, wx + rx * 0.02, wy - ry * 0.12, R('glint'))
      // hatch: tall enough to walk through, with boarding steps when open
      const hx0 = -rx * 0.4
      const hx1 = rx * 0.02
      const hy0 = cy - ry * 0.8
      const hy1 = cy + ry * 0.75
      const foot = open ? 2 : 0
      k.poly([[hx0, hy1], [hx0, hy0 + 2], [hx0 + 1.5, hy0], [hx1 - 1.5, hy0], [hx1, hy0 + 2], [hx1, hy1]], open ? R('dark') : R('hull'), O)
      if (open) {
        k.poly([[hx0 + 1, hy1], [hx1 - 1, hy1], [hx1 + 0.5, foot], [hx0 - 0.5, foot]], R('shade'), O)
        for (let y = hy1 + 2; y < foot - 0.5; y += 2.5) k.hline(hx0 + 0.5, hx1 - 0.5, y, R('hull'))
      } else {
        const my = (hy0 + hy1) / 2
        k.hline(hx0 + 1, hx1 - 1, my, R('shade'))
        k.hline(hx0 + 1, hx1 - 1, hy0 + (hy1 - hy0) * 0.2, R('shade'))
        k.dot(hx1 - 1.5, my + 2, O)
      }
      // blinking nav lights
      k.dot(rx * 0.95, cy, lightColor(rng))
      k.dot(-rx * 0.2, cy - ry * 0.9, lightColor(rng))
      k.dot(-rx * 1.05, cy - ry * 1.1, R('light1'))
      // control: walls either side of the hatch, trigger across its threshold
      const half = legs ? rx * 0.8 + 1.5 : rx * 0.7
      const tx0 = hx0 - (open ? 0.5 : 0)
      const tx1 = hx1 + (open ? 0.5 : 0)
      k.wall([[-half, 0], [tx0 - 1, 0]])
      k.wall([[tx1 + 1, 0], [half, 0]])
      if (open) {
        k.wall([[tx0 - 1, 0], [tx0 - 1, foot]])
        k.wall([[tx1 + 1, 0], [tx1 + 1, foot]])
      }
      k.trigger([[tx0, foot], [tx1, foot]])
    },
  },
]
