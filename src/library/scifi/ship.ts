import type { Rng } from '../../agi/rng'
import { R, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { discRows, LIGHT_ROLES, lightColor } from './common'

const O = R('outline')

/** Boarding ramp coming toward the viewer from a door bottom at y0 down to the ground (y = foot). */
function ramp(k: Kit, x0: number, x1: number, y0: number, foot: number): [number, number] {
  const spread = Math.max(1, (x1 - x0) * 0.2)
  k.poly([[x0, y0], [x1, y0], [x1 + spread, foot], [x0 - spread, foot]], R('ramp'), O)
  const n = Math.max(1, Math.floor((foot - y0) / 3))
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1)
    const y = y0 + (foot - y0) * t
    k.hline(x0 - spread * t + 1, x1 + spread * t - 1, y, R('shade'))
  }
  return [x0 - spread, x1 + spread]
}

function strut(k: Kit, x0: number, y0: number, x1: number): void {
  k.line([[x0, y0], [x1, -1]], R('shade'))
  k.line([[x0 + 0.8, y0], [x1 + 0.8, -1]], O)
  k.rect(x1 - 2, -1.5, x1 + 2, 0, R('shade'), O)
}

function porthole(k: Kit, x: number, y: number, r: number): void {
  k.ellipse(x, y, r, r * 1.7, R('window'), O)
  if (r >= 1.5) k.dot(x - r * 0.3, y - r * 0.6, R('glint'))
}

function saucer(k: Kit, rng: Rng, s: number, legs: boolean, rampDown: boolean, foot: number): number[] {
  const rx = s / 2
  const lift = legs ? Math.max(6, s * 0.34) : 1
  const rb = s * 0.09
  const yb = -lift - rb
  const rr = Math.max(2.5, s * 0.07)
  const yr = yb - rb * 0.8
  if (legs) {
    strut(k, -rx * 0.45, yb, -rx * 0.8)
    strut(k, rx * 0.45, yb, rx * 0.8)
  }
  // underside
  k.ellipse(0, yb, rx * 0.72, rb, R('shade'), O)
  // dome
  const dr = rx * 0.42
  const dh = Math.max(4, s * 0.22)
  k.poly(k.ellipsePts(0, yr - rr * 0.5, dr, dh, 18, Math.PI, Math.PI * 2), R('window'), O)
  k.hline(-dr * 0.9, dr * 0.9, yr - rr * 0.5 - 1, O)
  k.line(k.ellipsePts(0, yr - rr * 0.5, dr * 0.7, dh * 0.75, 8, Math.PI * 1.15, Math.PI * 1.4), R('glint'))
  // rim
  k.ellipse(0, yr, rx, rr, R('hull'), O)
  discRows(k, 0, yr, rx - 0.5, rr - 0.6, (y, a, b, t) => {
    if (t > 0.35) k.hline(a, b, y, R('trim'))
  })
  const n = Math.max(4, Math.round(s / 8))
  for (let i = 0; i < n; i++) k.dot(-rx * 0.85 + (rx * 1.7 * i) / (n - 1), yr - rr * 0.25, lightColor(rng))
  // center leg / hatch
  const hw = Math.max(3, s * 0.07)
  if (rampDown) {
    k.rect(-hw, yb - 1, hw, -lift, R('dark'), O)
    return [...ramp(k, -hw, hw, -lift, foot), foot]
  }
  if (legs) strut(k, 0, yb + rb, 0)
  return []
}

function rocket(k: Kit, rng: Rng, s: number, legs: boolean, rampDown: boolean, foot: number): number[] {
  const H = s * 1.15
  const bw = Math.max(4, s * 0.16)
  const base = legs ? -Math.max(3, H * 0.08) : -2
  // fins
  const finTop = base - H * 0.3
  for (const sgn of [-1, 1]) {
    const pts: LP[] = [[sgn * bw * 0.9, finTop], [sgn * bw * 2.5, base + H * 0.02], [sgn * bw * 2.6, legs ? 0 : base + 1], [sgn * bw * 2.1, legs ? 0 : base + 1], [sgn * bw * 0.9, base]]
    k.poly(pts, R('trim'), O)
  }
  // nozzle
  k.poly([[-bw * 0.6, base], [bw * 0.6, base], [bw * 0.8, base + 2.5], [-bw * 0.8, base + 2.5]], R('shade'), O)
  // body with an ogive nose
  const top = base - H
  const body: LP[] = [
    [-bw, base], [-bw, base - H * 0.55], [-bw * 0.93, base - H * 0.7], [-bw * 0.75, base - H * 0.82], [-bw * 0.45, base - H * 0.93], [0, top],
    [bw * 0.45, base - H * 0.93], [bw * 0.75, base - H * 0.82], [bw * 0.93, base - H * 0.7], [bw, base - H * 0.55], [bw, base],
  ]
  k.poly(body, R('hull'), O)
  // shade down the right side
  k.poly([[bw * 0.55, base - 0.5], [bw * 0.55, base - H * 0.62], [bw * 0.9, base - H * 0.68], [bw - 0.5, base - H * 0.55], [bw - 0.5, base - 0.5]], R('shade'))
  // stripes and nose cone
  k.hline(-bw + 0.5, bw - 0.5, base - H * 0.5, R('trim'))
  k.hline(-bw + 0.5, bw - 0.5, base - H * 0.5 + 1, R('trim'))
  k.poly([[-bw * 0.45, base - H * 0.93], [0, top], [bw * 0.45, base - H * 0.93]], R('trim'), O)
  const pr = Math.max(1, bw * 0.3)
  for (const f of [0.66, 0.78]) porthole(k, 0, base - H * f, pr)
  k.dot(0, top - 1, lightColor(rng))
  // door and ramp
  const dw = Math.max(2.5, bw * 0.55)
  const dy1 = base - 1
  const dy0 = dy1 - Math.max(8, H * 0.3)
  if (rampDown) {
    k.rect(-dw, dy0, dw, dy1, R('dark'), O)
    return [...ramp(k, -dw, dw, dy1, foot), foot]
  }
  k.rect(-dw, dy0, dw, dy1, R('hull'), O)
  k.hline(-dw + 1, dw - 1, (dy0 + dy1) / 2, R('shade'))
  return [-dw, dw, 0]
}

function shuttle(k: Kit, rng: Rng, s: number, legs: boolean, rampDown: boolean, foot: number): number[] {
  const L = s / 2
  const bh = Math.max(8, s * 0.3)
  const lift = legs ? Math.max(4, s * 0.14) : 1
  const yb = -lift
  const yt = yb - bh
  if (legs) {
    strut(k, -L * 0.45, yb, -L * 0.55)
    strut(k, L * 0.5, yb, L * 0.58)
  }
  // tail fin and wing (behind the hull)
  k.poly([[-L * 0.95, yt + 1], [-L * 1.08, yt - bh * 0.95], [-L * 0.82, yt - bh * 0.95], [-L * 0.45, yt + 1]], R('trim'), O)
  // engines
  for (const f of [0.28, 0.68]) {
    const cy = yt + bh * f
    k.rect(-L - 3, cy - bh * 0.14, -L + 2, cy + bh * 0.14, R('shade'), O)
    k.vline(-L - 3, cy - bh * 0.1, cy + bh * 0.1, R('dark'))
  }
  // hull profile, nose to the right
  const hull: LP[] = [
    [-L, yt], [L * 0.2, yt], [L * 0.55, yt + bh * 0.3], [L * 0.92, yt + bh * 0.58], [L, yt + bh * 0.75], [L * 0.9, yb], [-L * 0.92, yb], [-L, yb - bh * 0.25],
  ]
  k.poly(hull, R('hull'), O)
  // belly shade
  k.poly([[-L * 0.92, yb - 0.5], [L * 0.9, yb - 0.5], [L * 0.96, yb - bh * 0.18], [-L * 0.97, yb - bh * 0.18]], R('shade'))
  // stripe
  k.poly([[-L + 0.5, yt + bh * 0.42], [L * 0.62, yt + bh * 0.42], [L * 0.72, yt + bh * 0.52], [-L + 0.5, yt + bh * 0.52]], R('trim'))
  // cockpit glass along the nose slope
  k.poly([[L * 0.24, yt + 1], [L * 0.53, yt + bh * 0.3], [L * 0.62, yt + bh * 0.36], [L * 0.24, yt + bh * 0.3]], R('window'), O)
  k.line([[L * 0.3, yt + 2], [L * 0.4, yt + bh * 0.2]], R('glint'))
  // wing in side view
  k.poly([[-L * 0.55, yb - bh * 0.12], [L * 0.05, yb - bh * 0.12], [-L * 0.25, yb + 1.5], [-L * 0.7, yb + 1.5]], R('shade'), O)
  // portholes
  const pr = Math.max(1, bh * 0.08)
  for (let x = -L * 0.75; x < -L * 0.1; x += Math.max(4, pr * 4)) porthole(k, x, yt + bh * 0.25, pr)
  // lights
  k.dot(-L * 1.05, yt - bh * 0.95, R('light1'))
  k.dot(L, yt + bh * 0.72, lightColor(rng))
  // side door and ramp
  const dx0 = L * 0.05
  const dx1 = L * 0.25
  const dy0 = yt + bh * 0.15
  if (rampDown) {
    k.rect(dx0, dy0, dx1, yb, R('dark'), O)
    return [...ramp(k, dx0, dx1, yb, foot), foot]
  }
  k.rect(dx0, dy0, dx1, yb, R('hull'), O)
  k.hline(dx0 + 1, dx1 - 1, (dy0 + yb) / 2, R('shade'))
  return [dx0, dx1, 0]
}

export const ships: ElementDef[] = [
  {
    id: 'scifi-ship',
    name: 'Landed spaceship',
    themes: ['scifi'],
    category: 'structure',
    tags: ['spaceship', 'rocket', 'saucer', 'shuttle', 'ufo', 'landed', 'ramp', 'vehicle'],
    roles: {
      hull: { label: 'Hull', color: 7 },
      shade: { label: 'Shade / struts', color: 8 },
      trim: { label: 'Fins / stripe', color: 4 },
      window: { label: 'Windows', color: 3 },
      glint: { label: 'Glint', color: 11 },
      ramp: { label: 'Ramp', color: 7 },
      dark: { label: 'Open door', color: 0 },
      outline: { label: 'Outline', color: 0 },
      ...LIGHT_ROLES,
    },
    params: [
      {
        key: 'shape', label: 'Shape', type: 'select', default: 'saucer',
        options: [{ value: 'saucer', label: 'Saucer' }, { value: 'rocket', label: 'Rocket' }, { value: 'shuttle', label: 'Shuttle' }],
      },
      { key: 'size', label: 'Size', type: 'int', min: 40, max: 150, default: 96 },
      { key: 'ramp', label: 'Ramp lowered', type: 'bool', default: true },
      { key: 'legs', label: 'Landing struts', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    // enterable: never shrinks with depth (sprites don't scale)
    perspective: false,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const shape = p.s('shape')
      const s = p.n('size')
      const legs = p.b('legs')
      const rampDown = p.b('ramp')
      const foot = Math.max(3, s * 0.05)
      const draw = shape === 'rocket' ? rocket : shape === 'shuttle' ? shuttle : saucer
      const trig = draw(k, rng, s, legs, rampDown, foot)
      const half = shape === 'rocket' ? Math.max(4, s * 0.16) * 2.6 : shape === 'shuttle' ? s * 0.3 : s * 0.4 + 2
      if (!trig.length) {
        k.wall([[-half, 0], [half, 0]])
        return
      }
      // walls either side of the door or ramp, trigger across its threshold
      const [t0, t1, ty] = trig
      k.wall([[-half, 0], [t0 - 1, 0]])
      k.wall([[t1 + 1, 0], [half, 0]])
      if (ty > 0) {
        k.wall([[t0 - 1, 0], [t0 - 1, ty]])
        k.wall([[t1 + 1, 0], [t1 + 1, ty]])
      }
      k.trigger([[t0, ty], [t1, ty]])
    },
  },
]
