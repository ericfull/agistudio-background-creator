import type { Rng } from '../../agi/rng'
import { R, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { discRows, eachRow, LIGHT_ROLES, lightColor, lightRow, tiltedEllipse } from './common'

const O = R('outline')

/** A screen with a random display: text lines, a wave or a radar sweep. */
function screen(k: Kit, rng: Rng, x0: number, y0: number, x1: number, y1: number): void {
  k.rect(x0, y0, x1, y1, R('screen'), O)
  const w = x1 - x0
  const h = y1 - y0
  if (w < 3 || h < 3) return
  const kind = rng.int(0, 2)
  if (kind === 0 || h < 5) {
    for (let y = y0 + 2; y < y1 - 0.5; y += 2) k.hline(x0 + 1.5, x0 + 1.5 + rng.range(w * 0.25, w * 0.8), y, R('screenLine'))
  } else if (kind === 1) {
    const pts: LP[] = []
    for (let x = x0 + 1; x <= x1 - 1; x += 2) pts.push([x, y0 + h / 2 + Math.sin(x * 0.9 + rng.range(0, 6)) * (h / 2 - 1.5)])
    k.line(pts, R('screenLine'))
  } else {
    const cx = (x0 + x1) / 2
    const cy = (y0 + y1) / 2
    const r = Math.min(w / 2 - 1, (h / 2 - 1) / 1.7)
    k.outline(k.ellipsePts(cx, cy, r, r * 1.7, 12), R('screenLine'))
    k.line([[cx, cy], [cx + r * 0.7, cy - r]], R('screenLine'))
    k.dot(cx - r * 0.4, cy + r * 0.5, R('light1'))
  }
}

function ventLines(k: Kit, x0: number, x1: number, y0: number, y1: number): void {
  for (let y = y0; y <= y1; y += 2) k.hline(x0, x1, y, O)
}

function reel(k: Kit, cx: number, cy: number, r: number): void {
  k.ellipse(cx, cy, r, r * 1.7, R('top'), O)
  k.ellipse(cx, cy, Math.max(0.6, r * 0.35), Math.max(1, r * 0.6), R('shade'))
}

export const machines: ElementDef[] = [
  {
    id: 'scifi-console',
    name: 'Computer console',
    themes: ['scifi'],
    category: 'furniture',
    tags: ['computer', 'console', 'terminal', 'mainframe', 'screen', 'controls'],
    roles: {
      body: { label: 'Body', color: 7 },
      shade: { label: 'Shade', color: 8 },
      top: { label: 'Top / reels', color: 15 },
      screen: { label: 'Screens', color: 3 },
      screenLine: { label: 'Screen lines', color: 11 },
      outline: { label: 'Outline', color: 0 },
      ...LIGHT_ROLES,
    },
    params: [
      {
        key: 'style', label: 'Style', type: 'select', default: 'desk',
        options: [{ value: 'desk', label: 'Desk terminal' }, { value: 'bank', label: 'Control bank' }, { value: 'tower', label: 'Mainframe' }],
      },
      { key: 'width', label: 'Width', type: 'int', min: 12, max: 60, default: 24 },
      { key: 'height', label: 'Height', type: 'int', min: 8, max: 24, default: 13 },
      { key: 'screens', label: 'Screens', type: 'int', min: 0, max: 4, default: 1 },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const hw = w / 2
      const dh = p.n('height')
      const style = p.s('style')
      const ns = p.n('screens')
      if (style === 'desk') {
        const sh = Math.max(7, dh * 0.8)
        const ty = -dh - 4
        // monitor housing on the back of the desk
        k.rect(-hw + 2, ty - sh, hw - 2, ty, R('body'), O)
        k.hline(-hw + 3, hw - 3, ty - sh + 1, R('shade'))
        if (ns > 0) {
          const sw = (w - 6) / ns
          for (let i = 0; i < ns; i++) screen(k, rng, -hw + 4 + i * sw, ty - sh + 3, -hw + 2 + (i + 1) * sw, ty - 2)
        } else {
          lightRow(k, rng, -hw + 4, hw - 4, ty - sh + 3, 2)
          lightRow(k, rng, -hw + 4, hw - 4, ty - sh + 5, 2)
        }
        // sloped keyboard top
        k.poly([[-hw - 1, -dh], [-hw + 1, ty], [hw - 1, ty], [hw + 1, -dh]], R('shade'), O)
        lightRow(k, rng, -hw + 2, hw - 2, ty + 1.5, 2, R('top'), 0.5)
        k.hline(-hw + 1, hw - 1, ty + 3, R('top'))
        // front face
        k.rect(-hw - 1, -dh, hw + 1, 0, R('body'), O)
        k.rect(-hw, -2, hw, 0, R('shade'))
        lightRow(k, rng, -hw + 2, -hw + 2 + Math.min(10, w * 0.4), -dh + 3, 2)
        k.rect(hw - Math.min(8, w * 0.3), -dh + 2, hw - 2, -dh + 5, R('shade'), O)
        if (dh > 9) ventLines(k, -hw + 2, hw - 2, -dh + 7, -4)
        k.wall([[-hw - 1, 0], [hw + 1, 0]])
      } else if (style === 'bank') {
        const t = -dh
        k.poly([[-hw, 0], [-hw, t * 0.55], [-hw + 2, t], [hw - 2, t], [hw, t * 0.55], [hw, 0]], R('body'), O)
        // sloped control surface
        k.poly([[-hw + 1, t * 0.55], [-hw + 2.5, t + 1], [hw - 2.5, t + 1], [hw - 1, t * 0.55]], R('shade'), O)
        const rows = Math.max(1, Math.floor((dh * 0.45 - 1) / 2))
        for (let r = 0; r < rows; r++) lightRow(k, rng, -hw + 3 + (r % 2), hw - 3, t + 2.5 + r * 2, 2, R('top'), 0.75)
        if (ns > 0) {
          const sw = Math.min(10, (w - 4) / ns - 2)
          for (let i = 0; i < ns; i++) {
            const cx = -hw + (w * (i + 0.5)) / ns
            screen(k, rng, cx - sw / 2, t * 0.5, cx + sw / 2, t * 0.12 - 1)
          }
        } else {
          lightRow(k, rng, -hw + 3, hw - 3, t * 0.35, 3)
        }
        k.hline(-hw + 1, hw - 1, -2, R('shade'))
        k.wall([[-hw, 0], [hw, 0]])
      } else {
        const n = Math.max(1, Math.round(w / 13))
        const cw = w / n
        const th = dh * 2 + 10
        for (let i = 0; i < n; i++) {
          const x0 = -hw + i * cw
          const x1 = x0 + cw
          k.rect(x0, -th, x1, 0, R('body'), O)
          k.rect(x0 + 1, -th + 1, x1 - 1, -th + 2, R('shade'))
          // tape window with two reels
          const wy0 = -th + 4
          const wy1 = -th + 4 + Math.max(8, th * 0.3)
          k.rect(x0 + 1.5, wy0, x1 - 1.5, wy1, R('shade'), O)
          const r = Math.max(1, Math.min((cw - 4) / 4.4, ((wy1 - wy0) / 2 - 1) / 1.7))
          reel(k, x0 + cw * 0.3, (wy0 + wy1) / 2, r)
          reel(k, x1 - cw * 0.3, (wy0 + wy1) / 2, r)
          // blinking lights and readouts
          const ly = wy1 + 3
          for (let y = ly; y < ly + Math.max(2, th * 0.2); y += 2) lightRow(k, rng, x0 + 2, x1 - 2, y, 2, O, 0.6)
          if (i < ns) screen(k, rng, x0 + 2, ly + th * 0.22, x1 - 2, ly + th * 0.22 + 4)
          ventLines(k, x0 + 2, x1 - 2, -6, -2)
        }
        k.wall([[-hw, 0], [hw, 0]])
      }
    },
  },
  {
    id: 'scifi-pipes',
    name: 'Pipes and conduits',
    themes: ['scifi'],
    category: 'prop',
    tags: ['pipes', 'conduit', 'plumbing', 'wall', 'engine room'],
    roles: {
      pipe: { label: 'Pipes', color: 8 },
      shine: { label: 'Highlight', color: 7 },
      collar: { label: 'Collars', color: 7 },
      valve: { label: 'Valves', color: 4 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'layout', label: 'Layout', type: 'select', default: 'horizontal',
        options: [{ value: 'horizontal', label: 'Horizontal runs' }, { value: 'vertical', label: 'Vertical runs' }, { value: 'elbow', label: 'Elbows' }],
      },
      { key: 'runs', label: 'Runs', type: 'int', min: 1, max: 5, default: 3 },
      { key: 'length', label: 'Length', type: 'int', min: 12, max: 150, default: 60 },
      { key: 'elev', label: 'Height above floor', type: 'int', min: 0, max: 60, default: 16 },
      { key: 'thick', label: 'Thickness', type: 'int', min: 1, max: 4, default: 2 },
      { key: 'valves', label: 'Valves', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 100 },
    generate(k, p, rng) {
      const layout = p.s('layout')
      const n = p.n('runs')
      const L = p.n('length')
      const elev = p.n('elev')
      const t = p.n('thick')
      // Horizontal pipe: outline, a highlight row and t rows of body. Vertical
      // pipes are about half as many pixels wide, since pixels are wide.
      const gap = t + 3
      const vw = Math.max(1, Math.round(t * 0.6))
      const hpipe = (x0: number, x1: number, y: number) => {
        k.rect(x0, y - t - 1, x1, y, R('pipe'), O)
        k.hline(x0 + 1, x1 - 1, y - t, R('shine'))
      }
      const vpipe = (x: number, y0: number, y1: number) => {
        k.rect(x, y0, x + vw + 1, y1, R('pipe'), O)
        if (vw >= 2) k.vline(x + 1, y0 + 1, y1 - 1, R('shine'))
      }
      const hcollar = (x: number, y: number) => k.rect(x, y - t - 2, x + 2, y + 1, R('collar'), O)
      const vcollar = (x: number, y: number) => k.rect(x - 1, y, x + vw + 2, y + 2, R('collar'), O)
      const valve = (x: number, y: number) => {
        k.vline(x, y, y + 2, O)
        k.rect(x - 2, y - 1, x + 2, y, R('valve'), O)
      }
      if (layout === 'horizontal') {
        for (let i = 0; i < n; i++) {
          const y = -elev - i * gap
          const inset = rng.int(0, 3)
          hpipe(-L / 2 + inset, L / 2 - inset, y)
          for (let x = -L / 2 + inset + rng.int(4, 10); x < L / 2 - inset - 4; x += rng.int(12, 20)) hcollar(x, y)
          if (p.b('valves') && i === n - 1 && L > 16) valve(rng.range(-L / 3, L / 3), y - t - 4)
        }
      } else if (layout === 'vertical') {
        const sp = vw + 4
        for (let i = 0; i < n; i++) {
          const x = -((n - 1) * sp) / 2 + i * sp - vw / 2
          const y1 = -elev
          vpipe(x, y1 - L, y1)
          for (let y = y1 - rng.int(4, 9); y > y1 - L + 4; y -= rng.int(10, 16)) vcollar(x, y)
        }
        if (p.b('valves')) {
          const x = -((n - 1) * sp) / 2 + rng.int(0, n - 1) * sp - vw / 2
          const y = -elev - rng.range(L * 0.3, L * 0.7)
          k.rect(x - 2, y - 1, x + vw + 3, y, R('valve'), O)
        }
      } else {
        // elbows: nested runs along the wall that turn up at the right
        const top = -elev - (n - 1) * gap - t - Math.max(8, L * 0.5)
        for (let i = 0; i < n; i++) {
          const y = -elev - i * gap
          const turnX = L / 2 - vw - 1 - i * (vw + 4)
          hpipe(-L / 2, turnX + vw + 1, y)
          vpipe(turnX, top, y - t - 1)
          k.rect(turnX - 1, y - t - 2, turnX + vw + 2, y + 1, R('collar'), O)
          hcollar(-L / 2 + 4 + i * 5, y)
          vcollar(turnX, top + 3)
        }
        if (p.b('valves')) valve(-L / 4, -elev - (n - 1) * gap - t - 4)
      }
    },
  },
  {
    id: 'scifi-viewport',
    name: 'Viewport window',
    themes: ['scifi'],
    category: 'structure',
    tags: ['window', 'viewport', 'porthole', 'space', 'stars', 'planet'],
    roles: {
      frame: { label: 'Frame', color: 8 },
      rim: { label: 'Inner rim', color: 7 },
      space: { label: 'Space', color: 0 },
      star: { label: 'Stars', color: 15 },
      star2: { label: 'Dim stars', color: 7 },
      planet: { label: 'Planet', color: 9 },
      planetShade: { label: 'Planet shade', color: 1 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'shape', label: 'Shape', type: 'select', default: 'rect',
        options: [{ value: 'rect', label: 'Panoramic' }, { value: 'oval', label: 'Oval' }, { value: 'portholes', label: 'Portholes' }],
      },
      {
        key: 'view', label: 'View', type: 'select', default: 'planet',
        options: [{ value: 'stars', label: 'Stars' }, { value: 'planet', label: 'Planet' }, { value: 'warp', label: 'Star streaks' }],
      },
      { key: 'width', label: 'Width', type: 'int', min: 12, max: 110, default: 44 },
      { key: 'height', label: 'Height', type: 'int', min: 8, max: 50, default: 20 },
      { key: 'bars', label: 'Frame bars / portholes', type: 'int', min: 0, max: 5, default: 2 },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 70 },
    generate(k, p, rng) {
      const shape = p.s('shape')
      const view = p.s('view')
      const w = p.n('width')
      const h = p.n('height')
      const hw = w / 2
      const bars = p.n('bars')
      const cy = -h / 2 - 3
      // interior spans per local row
      type Span = [number, number]
      let spans: (y: number) => Span[]
      if (shape === 'rect') {
        k.poly([[-hw - 3, -1], [-hw - 3, -h - 4], [-hw, -h - 6], [hw, -h - 6], [hw + 3, -h - 4], [hw + 3, -1], [hw, 1], [-hw, 1]], R('frame'), O)
        spans = (y) => (y > -h - 3 && y < -3 ? [[-hw + 0.5, hw - 0.5]] : [])
        k.rect(-hw, -h - 3, hw, -3, R('space'), R('rim'))
      } else if (shape === 'oval') {
        k.ellipse(0, cy, hw + 3, h / 2 + 3, R('frame'), O)
        k.ellipse(0, cy, hw, h / 2, R('space'), R('rim'))
        spans = (y) => {
          const t = (y - cy) / (h / 2 - 1)
          if (t <= -1 || t >= 1) return []
          const a = (hw - 1) * Math.sqrt(1 - t * t)
          return [[-a, a]]
        }
      } else {
        const n = Math.max(1, bars)
        const r = Math.min(h / 2 / 1.7, (w / n - 3) / 2)
        const ry = r * 1.7
        const step = w / n
        k.rect(-hw - 2, cy - ry - 3, hw + 2, cy + ry + 3, R('frame'), O)
        const cs: number[] = []
        for (let i = 0; i < n; i++) {
          const cx = -hw + step * (i + 0.5)
          cs.push(cx)
          k.ellipse(cx, cy, r + 1.5, ry + 1.5, R('rim'), O)
          k.ellipse(cx, cy, r, ry, R('space'))
        }
        for (let i = 0; i < n; i++) {
          k.dot(cs[i] - r - 1.5, cy - ry - 1.5, O)
          k.dot(cs[i] + r + 1.5, cy + ry + 1.5, O)
        }
        spans = (y) => {
          const t = (y - cy) / (ry - 0.8)
          if (t <= -1 || t >= 1) return []
          const a = (r - 0.6) * Math.sqrt(1 - t * t)
          return cs.map((c) => [c - a, c + a] as Span)
        }
      }
      const inside = (x: number, y: number) => spans(y).some(([a, b]) => x >= a && x <= b)
      const clipRow = (y: number, a: number, b: number, fn: (a: number, b: number) => void) => {
        for (const [s0, s1] of spans(y)) {
          const l = Math.max(a, s0)
          const r = Math.min(b, s1)
          if (r >= l) fn(l, r)
        }
      }
      // the view
      const y0 = -h - 6
      if (view === 'warp') {
        const vx = rng.range(-hw * 0.3, hw * 0.3)
        for (let i = 0; i < w * 0.9; i++) {
          const a = rng.range(0, Math.PI * 2)
          const d0 = rng.range(2, hw * 0.6)
          const d1 = d0 + rng.range(2, hw * 0.4)
          const x0 = vx + Math.cos(a) * d0
          const yy0 = cy + Math.sin(a) * d0 * 0.6
          const x1 = vx + Math.cos(a) * d1
          const yy1 = cy + Math.sin(a) * d1 * 0.6
          if (inside(x0, yy0) && inside(x1, yy1)) k.line([[x0, yy0], [x1, yy1]], R(rng.chance(0.4) ? 'star' : 'star2'))
        }
      } else {
        const n = Math.round((w * h) / 22)
        for (let i = 0; i < n; i++) {
          const x = rng.range(-hw, hw)
          const y = rng.range(y0, 0)
          if (inside(x, y)) k.dot(x, y, R(rng.chance(0.35) ? 'star' : 'star2'))
        }
        if (view === 'planet') {
          const pr = Math.max(4, Math.min(hw * 0.45, h * 0.5))
          const pcx = rng.range(-hw * 0.3, hw * 0.4)
          const pcy = cy + h * 0.45
          discRows(k, pcx, pcy, pr, pr * 1.7, (y, a, b) => {
            clipRow(y, a, b, (l, r) => k.hline(l, r, y, R('planet')))
            const split = a + (b - a) * 0.66
            clipRow(y, split, b, (l, r) => k.hline(l, r, y, R('planetShade')))
          })
        }
      }
      // mullions
      if (shape === 'rect' && bars > 0) {
        for (let i = 1; i <= bars; i++) {
          const x = -hw + (w * i) / (bars + 1)
          k.rect(x - 0.5, -h - 3, x + 0.5, -3, R('frame'), O)
        }
      } else if (shape === 'oval' && bars > 0) {
        for (let i = 1; i <= bars; i++) {
          const x = -hw + (w * i) / (bars + 1)
          const f = x / hw
          const hh = (h / 2) * Math.sqrt(Math.max(0, 1 - f * f))
          if (hh > 1) k.rect(x - 0.5, cy - hh, x + 0.5, cy + hh, R('frame'), O)
        }
      }
      if (shape === 'rect') eachRow(k, -h - 3, -h - 3, (y) => k.hline(-hw, hw, y, R('rim')))
    },
  },
  {
    id: 'scifi-antenna',
    name: 'Antenna / radar dish',
    themes: ['scifi'],
    category: 'structure',
    tags: ['antenna', 'radar', 'dish', 'mast', 'tower', 'transmitter'],
    roles: {
      mast: { label: 'Mast', color: 7 },
      strut: { label: 'Struts', color: 8 },
      dish: { label: 'Dish', color: 15 },
      dishShade: { label: 'Dish shade', color: 7 },
      base: { label: 'Base', color: 8 },
      tip: { label: 'Beacon', color: 12 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'dish',
        options: [{ value: 'dish', label: 'Radar dish' }, { value: 'mast', label: 'Lattice mast' }, { value: 'rods', label: 'Rod array' }],
      },
      { key: 'height', label: 'Height', type: 'int', min: 16, max: 100, default: 44 },
      { key: 'size', label: 'Dish / spread', type: 'int', min: 4, max: 24, default: 12 },
      { key: 'aim', label: 'Aim / lean', type: 'int', min: -60, max: 60, default: -25 },
      { key: 'base', label: 'Base block', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 120 },
    hasControl: true,
    generate(k, p, rng) {
      const kind = p.s('kind')
      const h = p.n('height')
      const s = p.n('size')
      const hasBase = p.b('base')
      const by = hasBase ? -4 : 0
      let foot = 3
      if (kind === 'dish') {
        const top = -h + s * 0.6
        // pedestal
        k.poly([[-3, by], [-1.5, top + 2], [1.5, top + 2], [3, by]], R('mast'), O)
        for (let y = by - 4; y > top + 4; y -= 6) k.hline(-1.5, 1.5, y, R('strut'))
        // dish, rotated so it faces up and to one side
        const ang = (p.n('aim') * Math.PI) / 180
        const cx = 0
        const cy = top
        const rim = tiltedEllipse(cx, cy, s, s * 0.45, ang, 18)
        k.poly(rim, R('dish'), O)
        const inner = tiltedEllipse(cx + Math.sin(ang) * 0.6, cy - Math.cos(ang) * 0.4, s * 0.75, s * 0.28, ang, 16)
        k.poly(inner, R('dishShade'))
        // feed horn on struts along the dish's axis
        const nx = Math.sin(ang)
        const ny = -Math.cos(ang) * 1.7
        const fx = cx + nx * s * 0.8
        const fy = cy + ny * s * 0.8
        const [ax, ay] = tiltedEllipse(cx, cy, s, s * 0.45, ang, 4)[0]
        const [bx, by2] = tiltedEllipse(cx, cy, s, s * 0.45, ang, 4)[2]
        k.line([[ax, ay], [fx, fy]], R('strut'))
        k.line([[bx, by2], [fx, fy]], R('strut'))
        k.line([[cx, cy], [fx, fy]], O)
        k.rect(fx - 0.5, fy - 1, fx + 0.5, fy + 1, R('tip'), O)
      } else if (kind === 'mast') {
        const bw = Math.max(3, s * 0.45)
        const tw = 1
        const top = -h
        const legL: LP[] = [[-bw, by], [-tw, top + 4]]
        const legR: LP[] = [[bw, by], [tw, top + 4]]
        // cross bracing
        const n = Math.max(2, Math.round(h / 9))
        let prev: [number, number] | null = null
        for (let i = 0; i <= n; i++) {
          const t = i / n
          const y = by + (top + 4 - by) * t
          const half = bw + (tw - bw) * t
          k.hline(-half, half, y, R('strut'))
          if (prev) {
            k.line([[-prev[0], prev[1]], [half, y]], R('strut'))
            k.line([[prev[0], prev[1]], [-half, y]], R('strut'))
          }
          prev = [half, y]
        }
        k.line(legL, R('mast'))
        k.line(legR, R('mast'))
        k.vline(0, top, top + 4, R('mast'))
        k.hline(-3, 3, top + 6, R('mast'))
        k.hline(-2, 2, top + 9, R('mast'))
        k.dot(0, top - 1, R('tip'))
        k.dot(-3, top + 6, R('tip'))
        k.dot(3, top + 6, R('tip'))
        // a small relay dish on the mast, turned by 'aim'
        const ang = (p.n('aim') * Math.PI) / 180
        const my = top + (by - top) * 0.3
        const mh = bw + (tw - bw) * 0.7 + 1
        const side = ang >= 0 ? 1 : -1
        const ds = Math.max(2.5, s * 0.3)
        const dcx = side * (mh + ds * 0.4)
        k.hline(side * mh, dcx, my, R('strut'))
        k.poly(tiltedEllipse(dcx, my, ds, ds * 0.4, ang + side * Math.PI / 2, 12), R('dish'), O)
        foot = bw + 1
      } else {
        const n = 3 + (s > 12 ? 1 : 0)
        const spread = s * 0.4
        // 'aim' leans the whole array
        const lean = Math.sin((p.n('aim') * Math.PI) / 180) * 0.25
        for (let i = 0; i < n; i++) {
          const x = -spread + (2 * spread * i) / Math.max(1, n - 1)
          const rh = h * (0.55 + 0.45 * (i === Math.floor(n / 2) ? 1 : rng.range(0.2, 0.8)))
          const tx = x + lean * (rh + by)
          k.line([[x, by], [tx, -rh]], R('mast'))
          k.line([[x + 1, by], [tx + 1, -rh + 2]], O)
          for (let y = -rh + 5; y < by - 3; y += 7) {
            const xx = x + (tx - x) * ((by - y) / (by + rh))
            k.hline(xx - 1, xx + 1, y, R('strut'))
          }
          k.ellipse(tx, -rh - 1.5, 1.2, 2, R('dish'), O)
          k.dot(tx, -rh - 2, R('tip'))
        }
        k.hline(-spread, spread, by - 2, R('strut'))
        foot = spread + 2
      }
      if (hasBase) {
        const bw = Math.max(5, foot + 2)
        k.rect(-bw, -4, bw, 0, R('base'), O)
        k.hline(-bw + 1, bw - 1, -3, R('mast'))
        foot = bw
      }
      k.wall([[-foot, 0], [foot, 0]])
    },
  },
  {
    id: 'scifi-robot',
    name: 'Robot',
    themes: ['scifi'],
    category: 'prop',
    tags: ['robot', 'android', 'droid', 'statue', 'machine'],
    roles: {
      body: { label: 'Body', color: 7 },
      shade: { label: 'Joints / shade', color: 8 },
      eye: { label: 'Eyes / visor', color: 12 },
      panel: { label: 'Chest panel', color: 1 },
      outline: { label: 'Outline', color: 0 },
      ...LIGHT_ROLES,
    },
    params: [
      {
        key: 'style', label: 'Style', type: 'select', default: 'boxy',
        options: [{ value: 'boxy', label: 'Boxy (treads)' }, { value: 'android', label: 'Android' }, { value: 'dome', label: 'Dome droid' }],
      },
      { key: 'height', label: 'Height', type: 'int', min: 16, max: 48, default: 30 },
      { key: 'width', label: 'Width', type: 'int', min: 6, max: 18, default: 10 },
      { key: 'antenna', label: 'Antenna', type: 'bool', default: true },
      { key: 'pedestal', label: 'Pedestal', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const style = p.s('style')
      const H = p.n('height')
      const hw = p.n('width') / 2
      const ped = p.b('pedestal')
      const b = ped ? -4 : 0
      const h = H + b
      let headTop = 0
      if (style === 'boxy') {
        // treads: a rounded track with road wheels
        const th = Math.max(4, h * 0.15)
        const tr = th / 2
        const trx = Math.max(1, tr / 1.7)
        k.poly([
          ...k.ellipsePts(-hw - 1 + trx, b - tr, trx, tr, 8, Math.PI * 0.5, Math.PI * 1.5),
          ...k.ellipsePts(hw + 1 - trx, b - tr, trx, tr, 8, -Math.PI * 0.5, Math.PI * 0.5),
        ], R('shade'), O)
        const nw = Math.max(2, Math.round((hw * 2) / 3))
        for (let i = 0; i < nw; i++) k.dot(-hw + 1 + (i * (hw * 2 - 2)) / Math.max(1, nw - 1), b - tr, R('body'))
        // torso
        const t0 = b - th
        const t1 = b - h * 0.62
        k.rect(-hw * 0.3, t0, hw * 0.3, t0 + 1, O)
        k.rect(-hw, t1, hw, t0 - 1, R('body'), O)
        k.rect(-hw * 0.6, t1 + 2, hw * 0.6, t1 + (t0 - t1) * 0.55, R('panel'), O)
        lightRow(k, rng, -hw * 0.6 + 1, hw * 0.6 - 1, t1 + 3.5, 2, R('panel'), 0.8)
        k.hline(-hw + 1, hw - 1, t0 - 3, R('shade'))
        // arms: segmented tubes with claws
        for (const sgn of [-1, 1]) {
          const ax = sgn * (hw + 1)
          k.rect(Math.min(ax, ax + sgn * 1.5), t1 + 1, Math.max(ax, ax + sgn * 1.5), t1 + 3, R('shade'), O)
          const ex = ax + sgn * 1
          k.line([[ex, t1 + 3], [ex, t1 + (t0 - t1) * 0.7]], R('shade'))
          k.line([[ex + sgn * 1, t1 + 3], [ex + sgn * 1, t1 + (t0 - t1) * 0.7]], O)
          const cy = t1 + (t0 - t1) * 0.7
          k.line([[ex - sgn * 0.5, cy + 2], [ex, cy], [ex + sgn * 1.5, cy + 2]], O)
        }
        // neck and head
        const n0 = t1 - 1
        k.rect(-1, n0 - 1, 1, n0 + 1, R('shade'), O)
        const hh = Math.max(5, h * 0.24)
        headTop = n0 - 1 - hh
        if (rng.chance(0.5)) {
          k.rect(-hw * 0.75, headTop, hw * 0.75, n0 - 1, R('body'), O)
        } else {
          // rounded dome-topped head
          k.poly([...k.ellipsePts(0, headTop + hh * 0.45, hw * 0.75, hh * 0.45, 10, Math.PI, Math.PI * 2), [hw * 0.75, n0 - 1], [-hw * 0.75, n0 - 1]], R('body'), O)
        }
        // dark visor band with two glowing eyes
        const vy = headTop + hh * 0.5
        k.rect(-hw * 0.6, vy - 0.5, hw * 0.6, vy + 0.5, O)
        k.dot(-hw * 0.3, vy, R('eye'))
        k.dot(hw * 0.3, vy, R('eye'))
        k.hline(-hw * 0.4, hw * 0.4, n0 - 2.5, R('shade'))
      } else if (style === 'android') {
        const legT = b - h * 0.45
        const hipW = hw * 0.7
        // legs
        k.rect(-hipW, legT, -1, b - 1, R('body'), O)
        k.rect(1, legT, hipW, b - 1, R('body'), O)
        k.hline(-hipW + 0.5, -1.5, b - h * 0.24, R('shade'))
        k.hline(1.5, hipW - 0.5, b - h * 0.24, R('shade'))
        k.rect(-hipW - 1, b - 2, -0.5, b, R('shade'), O)
        k.rect(0.5, b - 2, hipW + 1, b, R('shade'), O)
        // torso
        const t1 = b - h * 0.8
        k.poly([[-hipW, legT], [-hw, t1 + 2], [-hw + 1, t1], [hw - 1, t1], [hw, t1 + 2], [hipW, legT]], R('body'), O)
        k.rect(-hipW + 1, legT - 2, hipW - 1, legT, R('shade'))
        k.rect(-hw * 0.45, t1 + 2, hw * 0.45, t1 + 5, R('panel'), O)
        k.dot(0, t1 + 3.5, lightColor(rng))
        // arms at the sides
        for (const sgn of [-1, 1]) {
          const x = sgn * (hw + 0.5)
          k.rect(Math.min(x, x + sgn * 1.2), t1 + 1, Math.max(x, x + sgn * 1.2), legT + 2, R('body'), O)
          k.hline(Math.min(x, x + sgn * 1.2), Math.max(x, x + sgn * 1.2), (t1 + legT) / 2 + 1, R('shade'))
        }
        // head
        const hr = Math.max(2, hw * 0.55)
        const hy = t1 - hr * 1.7 * 0.8 - 1
        k.rect(-0.8, t1 - 2, 0.8, t1, R('shade'))
        k.ellipse(0, hy, hr, hr * 1.7 * 0.85, R('body'), O)
        k.rect(-hr + 0.5, hy - 0.5, hr - 0.5, hy + 1, R('eye'))
        headTop = hy - hr * 1.5
      } else {
        // dome droid: can body, dome head, stubby legs
        const bodyB = b - Math.max(3, h * 0.12)
        const bodyT = b - h * 0.72
        for (const sgn of [-1, 1]) {
          k.poly([[sgn * (hw - 1), bodyT + 4], [sgn * (hw + 2), b - 1], [sgn * (hw + 2), b], [sgn * (hw - 1.5), b], [sgn * (hw - 1.5), bodyB]], R('shade'), O)
        }
        k.rect(-hw * 0.4, bodyB, hw * 0.4, b, R('shade'), O)
        k.rect(-hw, bodyT, hw, bodyB, R('body'), O)
        k.rect(-hw * 0.55, bodyT + 3, hw * 0.55, bodyT + 3 + (bodyB - bodyT) * 0.4, R('panel'), O)
        lightRow(k, rng, -hw * 0.55 + 1, hw * 0.55 - 1, bodyT + 4.5, 2, R('panel'))
        for (let y = bodyB - 2; y > bodyT + 3 + (bodyB - bodyT) * 0.45; y -= 2) k.hline(-hw + 1, hw - 1, y, R('shade'))
        const dr = (h * 0.28)
        k.poly(k.ellipsePts(0, bodyT, hw, dr, 16, Math.PI, Math.PI * 2), R('body'), O)
        k.hline(-hw, hw, bodyT, O)
        k.ellipse(-hw * 0.3, bodyT - dr * 0.5, Math.max(1, hw * 0.18), Math.max(1.4, hw * 0.3), R('eye'), O)
        k.dot(hw * 0.35, bodyT - dr * 0.35, lightColor(rng))
        k.hline(-hw + 1, hw - 1, bodyT - dr * 0.15, R('shade'))
        headTop = bodyT - dr
      }
      if (p.b('antenna')) {
        const ah = Math.max(3, h * 0.12)
        k.vline(hw * 0.3, headTop - ah, headTop, O)
        k.dot(hw * 0.3, headTop - ah - 1, R('eye'))
      }
      if (ped) {
        k.rect(-hw - 3, -4, hw + 3, 0, R('shade'), O)
        k.hline(-hw - 2, hw + 2, -3, R('body'))
      }
      k.wall([[-hw - (ped ? 3 : 1), 0], [hw + (ped ? 3 : 1), 0]])
    },
  },
]
