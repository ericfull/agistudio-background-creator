import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { R, clamp, lerp, wave, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { B, W, grow } from './shapes'

/**
 * Horizontal wave dashes over open water between rows y0 and y1: short and
 * sparse at the horizon, longer and more frequent toward the viewer.
 */
function waveDashes(k: Kit, rng: Rng, y0: number, y1: number, density: number, color: ColorRef, crest: ColorRef | null, x0 = 0, x1 = W): void {
  if (density <= 0 || y1 - y0 < 2) return
  let y = y0 + 2
  while (y <= y1) {
    const t = (y - y0) / Math.max(1, y1 - y0)
    const len = 1 + Math.round(t * 7)
    const n = Math.round(density * (2 + t * 9) * ((x1 - x0) / W))
    for (let i = 0; i < n; i++) {
      const x = rng.range(x0 - 3, x1)
      if (crest && t > 0.55 && rng.chance(0.3)) k.line([[x, y], [x + len / 2, y - 1], [x + len, y]], crest)
      else k.hline(x, x + len, y, color)
    }
    y += 2 + Math.round(t * 3 + rng.range(0, 1))
  }
}

export const water: ElementDef[] = [
  {
    id: 'sea-horizon',
    name: 'Sea to the horizon',
    themes: ['nature'],
    category: 'backdrop',
    tags: ['sea', 'ocean', 'water', 'horizon', 'waves'],
    span: 'full',
    roles: {
      sea: { label: 'Sea', color: 1 },
      wave: { label: 'Waves', color: 9 },
      foam: { label: 'White caps', color: 15 },
      haze: { label: 'Horizon line', color: 9 },
    },
    params: [
      { key: 'waves', label: 'Waves', type: 'int', min: 0, max: 100, default: 45 },
      { key: 'foam', label: 'White caps', type: 'bool', default: false },
      { key: 'haze', label: 'Horizon line', type: 'bool', default: true },
      { key: 'depth', label: 'Depth', type: 'int', min: 4, max: 168, default: 168 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    hasControl: true,
    generate(k, p, rng) {
      // the sea runs from the anchor row down `depth` rows (to the bottom by default);
      // a shorter band leaves room for a shore or meadow drawn below it
      const y0 = Math.min(k.ctx.y, B - 1)
      const y1 = Math.min(B, y0 + p.n('depth') - 1)
      k.rect(0, y0, W, y1, R('sea'))
      if (p.b('haze')) k.hline(0, W, y0, R('haze'))
      waveDashes(k, rng, y0, y1, p.n('waves') / 100, R('wave'), p.b('foam') ? R('foam') : null)
      k.water([[0, y0], [W, y0], [W, y1], [0, y1]])
    },
  },
  {
    id: 'river',
    name: 'River',
    themes: ['nature', 'fantasy'],
    category: 'water',
    tags: ['river', 'stream', 'water'],
    span: 'full',
    roles: {
      water: { label: 'Water', color: 1 },
      ripple: { label: 'Ripples', color: 9 },
      bank: { label: 'Banks', color: 6 },
    },
    params: [
      {
        key: 'dir', label: 'Flows', type: 'select', default: 'ns',
        options: [{ value: 'ns', label: 'North–south' }, { value: 'ew', label: 'East–west' }],
      },
      { key: 'x', label: 'Center x (N–S)', type: 'int', min: 10, max: 150, default: 80 },
      { key: 'width', label: 'Width', type: 'int', min: 4, max: 60, default: 24 },
      { key: 'wobble', label: 'Meander', type: 'int', min: 0, max: 20, default: 6 },
      { key: 'ripples', label: 'Ripples', type: 'int', min: 0, max: 40, default: 14 },
      { key: 'banks', label: 'Banks', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const wob = p.n('wobble')
      const wv = wave(rng, 2)
      const jl = wave(rng)
      const jr = wave(rng)
      const banks = p.b('banks')
      if (p.s('dir') === 'ns') {
        const y0 = Math.min(k.ctx.y, B - 2)
        const span = B - y0
        const cx = p.n('x')
        // the river always crosses the bottom edge at x; it meanders above that
        const cAt = (y: number) => cx + wob * (wv(y) - wv(B)) * (0.5 + (0.5 * (y - y0)) / span)
        const hwAt = (y: number) => lerp(w * 0.4, w, (y - y0) / span) / 2
        const steps = clamp(Math.round(span / 4), 2, 40)
        const left: LP[] = []
        const right: LP[] = []
        for (let s = 0; s <= steps; s++) {
          const y = y0 + (span * s) / steps
          const j = s > 0 && s < steps ? 0.5 : 0
          left.push([cAt(y) - hwAt(y) + jl(y * 3) * j, y])
          right.push([cAt(y) + hwAt(y) + jr(y * 3) * j, y])
        }
        const poly = [...left, ...[...right].reverse()]
        if (banks) {
          const bl = left.map(([x, y]): LP => [x - 1 - (y - y0) / span, y])
          const br = right.map(([x, y]): LP => [x + 1 + (y - y0) / span, y])
          k.poly([...bl, ...br.reverse()], R('bank'))
        }
        k.poly(poly, R('water'))
        for (let i = 0; i < p.n('ripples'); i++) {
          const t = Math.sqrt(rng.next())
          const y = y0 + 2 + t * (span - 3)
          const hw = hwAt(y)
          const len = Math.max(1, hw * rng.range(0.3, 0.7))
          const x = cAt(y) + rng.range(-hw * 0.7, hw * 0.7 - len)
          k.hline(x, x + len, y, R('ripple'))
        }
        k.water(poly)
      } else {
        const y0 = k.ctx.y
        const th = Math.max(3, Math.round(w * 0.5))
        const cy = (x: number) => y0 + wob * 0.5 * wv(x * 1.2)
        const top: LP[] = []
        const bot: LP[] = []
        for (let x = -1; x <= W + 5; x += 5) {
          const xx = Math.min(x, W + 1)
          top.push([xx, cy(xx) - th / 2 + jl(xx * 3) * 0.7])
          bot.push([xx, cy(xx) + th / 2 + jr(xx * 3) * 0.9])
        }
        const poly = [...top, ...[...bot].reverse()]
        if (banks) {
          k.poly([...top.map(([x, y]): LP => [x, y - 1]), ...[...bot].reverse().map(([x, y]): LP => [x, y + 2])], R('bank'))
        }
        k.poly(poly, R('water'))
        for (let i = 0; i < p.n('ripples'); i++) {
          const x = rng.range(-2, W)
          const y = cy(x) + rng.range(-th * 0.3, th * 0.35)
          const len = rng.range(2, 3 + th * 0.4)
          k.hline(x, x + len, y, R('ripple'))
        }
        k.water(poly)
      }
    },
  },
  {
    id: 'pond',
    name: 'Pond',
    themes: ['nature', 'fantasy'],
    category: 'water',
    tags: ['pond', 'lake', 'pool', 'water'],
    roles: {
      water: { label: 'Water', color: 1 },
      shine: { label: 'Shine', color: 9 },
      bank: { label: 'Bank', color: 6 },
      lily: { label: 'Lily pads', color: 10 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 6, max: 60, default: 24 },
      { key: 'depth', label: 'Depth', type: 'int', min: 3, max: 30, default: 12 },
      { key: 'bank', label: 'Bank', type: 'bool', default: true },
      { key: 'shine', label: 'Shine', type: 'bool', default: true },
      { key: 'lilies', label: 'Lily pads', type: 'int', min: 0, max: 8, default: 2 },
    ],
    defaultPriority: 'rows',
    perspective: true,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const d = p.n('depth')
      const bank = p.b('bank')
      const cy = -d - (bank ? 1 : 0)
      const pts = k.blobPts(0, cy, w, d, rng, 12, 0.06)
      if (bank) k.poly(grow(pts, 0, cy, 2, 1.5), R('bank'))
      k.poly(pts, R('water'))
      for (let i = 0; i < p.n('lilies'); i++) {
        const a = rng.range(0, Math.PI * 2)
        const r = Math.sqrt(rng.next()) * 0.6
        const lx = Math.cos(a) * w * r
        const ly = cy + Math.sin(a) * d * r
        const s = rng.range(1.2, 2.2)
        k.poly(k.ellipsePts(lx, ly, s, s * 0.7, 8, 0.5, Math.PI * 2 - 0.1), R('lily'))
      }
      if (p.b('shine')) {
        const n = Math.max(1, Math.round(d / 4))
        for (let i = 0; i < n; i++) {
          const y = cy - d * 0.45 + (i * d * 0.9) / Math.max(1, n)
          const hw = w * Math.sqrt(Math.max(0, 1 - ((y - cy) / d) ** 2))
          const len = Math.max(1, hw * rng.range(0.25, 0.5))
          const x = -hw * 0.6 + rng.range(0, hw * 0.4)
          k.hline(x, x + len, y, R('shine'))
        }
      }
      k.water(pts)
    },
  },
  {
    id: 'beach',
    name: 'Beach and shore',
    themes: ['nature'],
    category: 'water',
    tags: ['beach', 'shore', 'sea', 'sand', 'coast', 'surf'],
    span: 'full',
    roles: {
      sea: { label: 'Sea', color: 1 },
      wave: { label: 'Waves', color: 9 },
      foam: { label: 'Foam', color: 15 },
      sand: { label: 'Sand', color: 14 },
      wet: { label: 'Wet sand', color: 6 },
    },
    params: [
      { key: 'seaY', label: 'Sea top row', type: 'int', min: 0, max: 150, default: 60 },
      { key: 'wobble', label: 'Shore wobble', type: 'int', min: 0, max: 10, default: 3 },
      { key: 'waves', label: 'Waves', type: 'int', min: 0, max: 100, default: 40 },
      { key: 'foam', label: 'Foam', type: 'bool', default: true },
      { key: 'wet', label: 'Wet sand', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 110 },
    hasControl: true,
    generate(k, p, rng) {
      const y0 = Math.min(k.ctx.y, B - 1)
      const seaTop = clamp(Math.min(p.n('seaY'), y0 - 2), 0, B)
      const wob = p.n('wobble')
      const wv = wave(rng)
      const sc = wave(rng)
      const ph = rng.range(0, Math.PI * 2)
      const shoreAt = (x: number) => clamp(y0 + wob * wv(x * 1.3) + Math.abs(Math.sin(x * 0.22 + ph)) * 1.4 * sc(x), seaTop + 1, B)
      const shore: LP[] = []
      for (let x = 0; x < W; x += 2) shore.push([x, shoreAt(x)])
      shore.push([W, shoreAt(W)])

      k.poly([...shore, [W, B], [0, B]], R('sand'))
      if (p.b('wet')) {
        const wd = wave(rng)
        k.poly([...shore, ...[...shore].reverse().map(([x, y]): LP => [x, Math.min(B, y + 2.5 + wd(x * 2) * 1.5)])], R('wet'))
      }
      const sea: LP[] = [[0, seaTop], [W, seaTop], ...[...shore].reverse()]
      k.poly(sea, R('sea'))
      if (seaTop > 0) k.hline(0, W, seaTop, R('wave'))
      waveDashes(k, rng, seaTop, Math.max(seaTop, Math.min(...shore.map(([, y]) => y)) - 3), p.n('waves') / 100, R('wave'), p.b('foam') ? R('foam') : null)
      if (p.b('foam')) {
        k.line(shore, R('foam'))
        // a broken line of surf just offshore
        const surf = wave(rng)
        let run: LP[] = []
        for (const [x, y] of shore) {
          const yy = y - 2 - Math.round(wob * 0.3)
          if (surf(x * 2) > -0.1 && yy > seaTop + 1) run.push([x, yy])
          else {
            if (run.length > 1) k.line(run, R('foam'))
            run = []
          }
        }
        if (run.length > 1) k.line(run, R('foam'))
      }
      k.water(sea)
    },
  },
  {
    id: 'waterfall',
    name: 'Waterfall',
    themes: ['nature', 'fantasy'],
    category: 'water',
    tags: ['waterfall', 'falls', 'cliff', 'pool', 'water'],
    roles: {
      fall: { label: 'Falling water', color: 9 },
      streak: { label: 'Streaks', color: 15 },
      pool: { label: 'Pool', color: 1 },
      foam: { label: 'Foam', color: 15 },
      rock: { label: 'Rock', color: 8 },
      rockLight: { label: 'Rock highlight', color: 7 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 12, max: 110, default: 50 },
      { key: 'width', label: 'Width', type: 'int', min: 3, max: 30, default: 8 },
      { key: 'pool', label: 'Pool', type: 'bool', default: true },
      { key: 'rocks', label: 'Rock walls', type: 'bool', default: true },
      { key: 'outline', label: 'Outlines', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 110 },
    hasControl: true,
    generate(k, p, rng) {
      const h = p.n('height')
      const hw = p.n('width') / 2
      const line = p.b('outline') ? R('line') : undefined
      const side = Math.max(6, hw * 1.6 + h * 0.12)
      const lipY = -h

      if (p.b('rocks')) {
        // a rock wall behind and around the falls
        const outer = hw + side
        const pts: LP[] = [[-outer, 0]]
        const sideSteps = Math.max(2, Math.round(h / 10))
        // the walls taper toward the top like a hillside
        const inset = side * 0.5
        for (let i = 1; i < sideSteps; i++) pts.push([-outer + (inset * i) / sideSteps + rng.range(-1, 1.5), -(h * i) / sideSteps])
        const topSteps = Math.max(3, Math.round((outer * 2 - inset * 2) / 4))
        for (let i = 0; i <= topSteps; i++) {
          const x = -outer + inset + ((outer * 2 - inset * 2) * i) / topSteps
          const nearFall = Math.abs(x) < hw + 2
          pts.push([x, lipY - (nearFall ? 1 : rng.range(2, 7))])
        }
        for (let i = sideSteps - 1; i >= 1; i--) pts.push([outer - (inset * i) / sideSteps - rng.range(-1, 1.5), -(h * i) / sideSteps])
        pts.push([outer, 0])
        k.poly(pts, R('rock'), line ?? R('rock'))
        // lit ledges and cracks
        const ledges = Math.max(2, Math.round(h / 12))
        for (let i = 0; i < ledges; i++) {
          const y = lipY + ((i + rng.range(0.2, 0.8)) * h) / ledges
          for (const s of [-1, 1]) {
            const room = outer - (inset * -y) / h - hw - 2
            const x0 = s * (hw + rng.range(1, Math.max(1.5, room * 0.35)))
            const x1 = s * (hw + Math.max(2, room * rng.range(0.55, 0.95)))
            k.poly([[x0, y], [x1, y], [x1 - s * 1.5, y + 2], [x0, y + 1.5]], R('rockLight'))
            if (line && rng.chance(0.6)) k.line([[x0 + s * 2, y + 3], [x0 + s * 2.5, y + 6], [x0 + s * 1.5, y + 9]], line)
          }
        }
      }

      // the stream above the lip, then the falling sheet widening slightly as it drops
      k.poly([[-hw - 0.5, lipY - 1], [-hw * 0.6, lipY - 3.5], [hw * 0.6, lipY - 3.5], [hw + 0.5, lipY - 1]], R('fall'))
      const sheet: LP[] = [[-hw - 0.5, lipY - 1], [hw + 0.5, lipY - 1], [hw + 1, -1], [-hw - 1, -1]]
      k.poly(sheet, R('fall'))
      const streaks = Math.max(1, Math.round(hw * 1.2))
      for (let i = 0; i < streaks; i++) {
        const x = -hw + ((i + 0.5) * hw * 2) / streaks + rng.range(-0.4, 0.4)
        let y = lipY + rng.range(0, 4)
        while (y < -3) {
          const len = rng.range(4, 12)
          k.vline(x, y, Math.min(-2, y + len), R('streak'))
          y += len + rng.range(2, 6)
        }
      }
      // lip where the water curls over the edge
      k.hline(-hw, hw, lipY - 1, R('streak'))

      if (p.b('pool')) {
        const rx = hw + side * 0.9 + 3
        const ry = Math.max(3, rx * 0.35)
        const cy = ry - 1
        k.withPriority('rows', () => {
          const pts = k.ellipsePts(0, cy, rx, ry)
          k.poly(grow(pts, 0, cy, 1, 1), R('rock'))
          k.poly(pts, R('pool'))
          const n = Math.max(1, Math.round(ry / 2.5))
          for (let i = 0; i < n; i++) {
            const y = cy + ((i + 0.5) * ry) / n
            const half = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)) * 0.7
            const len = Math.max(1, half * 0.5)
            const x = rng.range(-half, half - len)
            k.hline(x, x + len, y, R('fall'))
          }
          k.water(pts)
        })
      }
      // churning foam where the falls hit
      k.blob(0, -1, hw + 2.5, 2.2, rng, R('foam'), undefined, 6, 0.3)
      for (let i = 0; i < Math.round(hw) + 2; i++) k.dot(rng.range(-hw - 4, hw + 4), rng.range(-4, 2), R('foam'))
      if (p.b('rocks')) {
        const outer = hw + side
        k.wall([[-outer, 0], [-hw - 1, 0]])
        k.wall([[hw + 1, 0], [outer, 0]])
      }
    },
  },
]
