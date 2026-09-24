import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { clamp, lerp, R, wave, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { discRows, rowRuns } from './common'

const W = 159
const O = R('outline')

/** Planet disc drawn row by row: bands, craters and a shaded night side. */
function planetDisc(k: Kit, rng: Rng, cx: number, cy: number, r: number, kind: string, lit: string): void {
  const ry = r * 1.7
  const bands = kind === 'banded' || kind === 'ringed'
  const phase = rng.range(0, 6)
  discRows(k, cx, cy, r, ry, (y, a, b, t) => {
    let c: ColorRef = R('body')
    if (bands) {
      const v = Math.sin(t * 7.5 + phase) + Math.sin(t * 13 + phase * 2) * 0.4
      if (v > 0.55) c = R('band')
    }
    k.hline(a, b, y, c)
    if (lit !== 'full') {
      // terminator: an ellipse edge, so the night side is a crescent
      const w = b - a
      const edge = lit === 'left' ? a + w * 0.62 : b - w * 0.62
      if (lit === 'left') k.hline(edge, b, y, R('shade'))
      else k.hline(a, edge, y, R('shade'))
    }
  })
  if (kind === 'cratered') {
    const n = Math.max(2, Math.round(r / 3))
    for (let i = 0; i < n; i++) {
      const ang = rng.range(0, Math.PI * 2)
      const d = rng.range(0, 0.7)
      const x = cx + Math.cos(ang) * r * d
      const y = cy + Math.sin(ang) * ry * d
      const cr = Math.max(0.8, r * rng.range(0.08, 0.18))
      k.ellipse(x, y, cr, cr * 1.4, R('band'))
      k.hline(x - cr * 0.6, x + cr * 0.6, y - cr * 1.1, R('shade'))
    }
  }
}

export const planet: ElementDef[] = [
  {
    id: 'scifi-starfield',
    name: 'Starfield',
    themes: ['scifi'],
    category: 'sky',
    tags: ['space', 'stars', 'nebula', 'galaxy', 'night', 'sky'],
    span: 'full',
    roles: {
      space: { label: 'Space', color: 0 },
      star: { label: 'Bright stars', color: 15 },
      star2: { label: 'Dim stars', color: 7 },
      star3: { label: 'Faint stars', color: 8 },
      neb1: { label: 'Nebula outer', color: 1 },
      neb2: { label: 'Nebula core', color: 5 },
      neb3: { label: 'Nebula glow', color: 13 },
    },
    params: [
      { key: 'density', label: 'Stars', type: 'int', min: 20, max: 400, default: 140 },
      { key: 'bright', label: 'Big stars', type: 'int', min: 0, max: 14, default: 5 },
      {
        key: 'nebula', label: 'Nebula', type: 'select', default: 'bands',
        options: [{ value: 'none', label: 'None' }, { value: 'bands', label: 'Band' }, { value: 'cloud', label: 'Cloud' }, { value: 'galaxy', label: 'Galaxy' }],
      },
      { key: 'nebY', label: 'Nebula height %', type: 'int', min: 0, max: 100, default: 40 },
      { key: 'nebX', label: 'Nebula x', type: 'int', min: 0, max: 159, default: 100 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 167 },
    generate(k, p, rng) {
      const bottom = clamp(Math.round(k.ctx.y), 1, 167)
      k.rect(0, 0, W, bottom, R('space'))
      const neb = p.s('nebula')
      const ny = (bottom * p.n('nebY')) / 100
      const nx = p.n('nebX')
      const run = (y: number, test: (x: number) => ColorRef | null) => rowRuns(k, y, 0, W, test)
      if (neb === 'bands') {
        // a drifting band that pinches off into patches
        const f = wave(rng, 3)
        const g = wave(rng, 3)
        const tilt = rng.range(-0.3, 0.3)
        const amp = Math.max(3, bottom * 0.1)
        const thick = Math.max(3, bottom * 0.11)
        for (let y = 0; y <= bottom; y++) {
          run(y, (x) => {
            const c = ny + f(x) * amp + (x - nx) * tilt
            const q = g(x * 1.6 + 40)
            const t = thick * (0.15 + 0.85 * clamp(q + 0.45, 0, 1))
            const d = Math.abs(y - c) / t
            if (d < 0.3 && q > 0.2) return R('neb3')
            if (d < 0.55) return R('neb2')
            if (d < 0.7) return y % 2 === 0 ? R('neb2') : R('neb1')
            if (d < 1) return R('neb1')
            if (d < 1.25) return y % 2 === 0 ? R('neb1') : null
            return null
          })
        }
      } else if (neb === 'cloud') {
        const f = wave(rng, 3)
        const rx = 32
        const ryy = Math.max(6, bottom * 0.22)
        for (let y = 0; y <= bottom; y++) {
          run(y, (x) => {
            const dx = (x - nx) / rx
            const dy = (y - ny) / ryy
            const d = Math.sqrt(dx * dx + dy * dy) * (1 + 0.35 * f(x * 1.7 + y * 2.3))
            if (d < 0.35) return R('neb3')
            if (d < 0.55) return R('neb2')
            if (d < 0.7) return y % 2 === 0 ? R('neb2') : R('neb1')
            if (d < 0.9) return R('neb1')
            if (d < 1.1) return y % 2 === 0 ? R('neb1') : null
            return null
          })
        }
      } else if (neb === 'galaxy') {
        const ang = rng.range(-0.5, 0.5)
        const rx = 22
        const ryy = 5
        for (let y = Math.max(0, Math.floor(ny - 16)); y <= Math.min(bottom, ny + 16); y++) {
          run(y, (x) => {
            const dx = x - nx
            const dy = (y - ny) * 1.3
            const u = (dx * Math.cos(ang) + dy * Math.sin(ang)) / rx
            const v = (-dx * Math.sin(ang) + dy * Math.cos(ang)) / ryy
            const d = Math.sqrt(u * u + v * v)
            if (d < 0.18) return R('star')
            if (d < 0.4) return R('neb3')
            if (d < 0.7) return R('neb2')
            if (d < 0.85) return R('neb1')
            if (d < 1.05) return y % 2 === 0 ? R('neb1') : null
            return null
          })
        }
      }
      // stars on top
      const n = p.n('density')
      for (let i = 0; i < n; i++) {
        const x = rng.int(0, W)
        const y = rng.int(0, Math.max(0, bottom))
        const r = rng.next()
        k.dot(x, y, R(r < 0.2 ? 'star' : r < 0.6 ? 'star2' : 'star3'))
      }
      for (let i = 0; i < p.n('bright'); i++) {
        const x = rng.int(2, W - 2)
        const y = rng.int(2, Math.max(2, bottom - 3))
        k.hline(x - 1, x + 1, y, R('star2'))
        k.vline(x, y - 2, y + 2, R('star2'))
        k.dot(x, y, R('star'))
      }
    },
  },
  {
    id: 'scifi-planet',
    name: 'Planet / moons',
    themes: ['scifi'],
    category: 'sky',
    tags: ['planet', 'moon', 'ringed', 'gas giant', 'space', 'sky'],
    roles: {
      body: { label: 'Planet', color: 12 },
      band: { label: 'Bands / craters', color: 6 },
      shade: { label: 'Night side', color: 4 },
      ring: { label: 'Rings', color: 7 },
      ring2: { label: 'Rings (inner)', color: 8 },
      moon: { label: 'Moons', color: 7 },
      moonShade: { label: 'Moon shade', color: 8 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'ringed',
        options: [{ value: 'plain', label: 'Plain' }, { value: 'banded', label: 'Banded' }, { value: 'ringed', label: 'Ringed' }, { value: 'cratered', label: 'Cratered' }],
      },
      { key: 'size', label: 'Size', type: 'int', min: 3, max: 40, default: 12 },
      { key: 'moons', label: 'Moons', type: 'int', min: 0, max: 4, default: 1 },
      {
        key: 'lit', label: 'Lit side', type: 'select', default: 'left',
        options: [{ value: 'full', label: 'Full' }, { value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }],
      },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 110, y: 50 },
    generate(k, p, rng) {
      const r = p.n('size')
      const kind = p.s('kind')
      const lit = p.s('lit')
      const ry = r * 1.7
      const cy = -ry - (kind === 'ringed' ? r * 0.3 : 0)
      const ringed = kind === 'ringed'
      const tilt = rng.range(-0.18, 0.18)
      const ringArc = (a0: number, a1: number) => {
        const layers: [number, string][] = [[2.15, 'ring'], [1.95, 'ring'], [1.75, 'ring2'], [1.55, 'ring']]
        for (const [f, role] of layers) {
          const pts: LP[] = []
          const n = 24
          for (let i = 0; i <= n; i++) {
            const a = a0 + ((a1 - a0) * i) / n
            const x = Math.cos(a) * r * f
            const y = Math.sin(a) * r * f * 0.32
            pts.push([x, cy + y + x * tilt])
          }
          k.line(pts, R(role))
        }
      }
      if (ringed) ringArc(Math.PI, Math.PI * 2)
      planetDisc(k, rng, 0, cy, r, kind, lit)
      if (ringed) ringArc(0, Math.PI)
      // moons
      for (let i = 0; i < p.n('moons'); i++) {
        const mr = Math.max(1.2, r * rng.range(0.14, 0.26))
        const side = i % 2 === 0 ? 1 : -1
        const mx = side * (r * (ringed ? 2.5 : 1.5) + mr + rng.range(1, 6) + i * 3)
        const my = cy + rng.range(-ry, ry * 0.5)
        discRows(k, mx, my, mr, mr * 1.7, (y, a, b) => {
          k.hline(a, b, y, R('moon'))
          if (lit === 'left') k.hline(a + (b - a) * 0.6, b, y, R('moonShade'))
          else if (lit === 'right') k.hline(a, b - (b - a) * 0.6, y, R('moonShade'))
        })
      }
    },
  },
  {
    id: 'scifi-desert',
    name: 'Alien desert',
    themes: ['scifi'],
    category: 'ground',
    tags: ['desert', 'dunes', 'sand', 'planet', 'kerona', 'ground'],
    span: 'full',
    roles: {
      sand: { label: 'Sand', color: 6 },
      shade: { label: 'Dune shadow', color: 4 },
      crest: { label: 'Dune crest', color: 14 },
      speck: { label: 'Rock specks', color: 8 },
      rock: { label: 'Rocks', color: 4 },
      light: { label: 'Rock highlight', color: 12 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'dunes', label: 'Dune rows', type: 'int', min: 1, max: 9, default: 5 },
      { key: 'height', label: 'Dune height', type: 'int', min: 1, max: 10, default: 5 },
      { key: 'specks', label: 'Specks', type: 'int', min: 0, max: 150, default: 12 },
      { key: 'rocks', label: 'Rocks', type: 'int', min: 0, max: 14, default: 5 },
      { key: 'dither', label: 'Dithered shadows', type: 'bool', default: false },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const top = clamp(Math.round(k.ctx.y), 0, 160)
      const H = 167 - top
      k.rect(0, top, W, 167, R('sand'))
      // far ridge line on the horizon
      const far = wave(rng, 3)
      const ridge: LP[] = []
      for (let x = 0; x <= W; x += 4) ridge.push([x, top + far(x) * 1.2])
      k.line(ridge, R('shade'))
      const n = p.n('dunes')
      const amp = p.n('height')
      const dither = p.b('dither')
      for (let i = 0; i < n; i++) {
        const t = (i + 0.7) / (n + 0.2)
        const base = top + H * Math.pow(t, 1.35)
        const f = wave(rng, 3)
        const a = amp * (0.4 + t)
        const crest = (x: number) => base + f(x) * a
        // slope in rows per column: > 0 falls to the right (lee side, shaded)
        const slope = (x: number) => (crest(x + 1.5) - crest(x - 1.5)) / 3
        const th = (x: number) => 0.6 + clamp(slope(x) * 4, 0, 1) * (1 + Math.min(a, 7) * 0.8)
        // shadow wedge below each crest
        const c0: number[] = []
        const c1: number[] = []
        let ya = 999
        let yb = 0
        for (let x = 0; x <= W; x++) {
          c0.push(crest(x))
          c1.push(crest(x) + th(x))
          ya = Math.min(ya, c0[x])
          yb = Math.max(yb, c1[x])
        }
        for (let y = Math.max(top, Math.ceil(ya)); y <= Math.min(167, yb); y++) {
          rowRuns(k, y, 0, W, (x) => {
            if (y < c0[x] || y > c1[x] || c1[x] <= c0[x] + 0.5) return null
            const solid = !dither || y < c1[x] - 1.5
            return solid || (x + y) % 2 === 0 ? R('shade') : null
          })
        }
        // sunlit crest highlights on the rising slopes only
        let seg: LP[] = []
        const flush = () => {
          if (seg.length > 1) k.line(seg, R('crest'))
          seg = []
        }
        let maxLen = rng.int(8, 22)
        for (let x = 0; x <= W; x += 2) {
          if (slope(x) < -0.03 && seg.length * 2 < maxLen) seg.push([x, crest(x) - 0.4])
          else if (seg.length) {
            flush()
            maxLen = rng.int(8, 22)
          }
        }
        flush()
      }
      // specks: single dots far away, short dashes nearer
      for (let i = 0; i < p.n('specks'); i++) {
        const y = top + 2 + Math.pow(rng.next(), 0.8) * (H - 2)
        const x = rng.range(0, W)
        const near = (y - top) / H
        if (near > 0.55 && rng.chance(0.5)) k.hline(x, x + 1, y, R('speck'))
        else k.dot(x, y, R(rng.chance(0.3) ? 'rock' : 'speck'))
      }
      // a few rocks with shadows, larger nearer the viewer
      for (let i = 0; i < p.n('rocks'); i++) {
        const y = top + H * (0.25 + 0.75 * rng.next())
        const x = rng.range(4, W - 4)
        const s = 0.6 + ((y - top) / H) * 2.4
        k.hline(x - s * 0.6, x + s * 2.2, y + 0.5, R('shade'))
        if (s < 1.4) {
          k.hline(x - 1, x, y, R('rock'))
        } else {
          k.blob(x, y - s * 0.6, s * 1.3, s * 0.9, rng, R('rock'), s > 2 ? O : R('rock'), 5, 0.3)
          if (s > 2) k.hline(x - s * 0.7, x - s * 0.1, y - s * 1.1, R('light'))
        }
      }
    },
  },
  {
    id: 'scifi-crater',
    name: 'Crater',
    themes: ['scifi'],
    category: 'ground',
    tags: ['crater', 'hole', 'impact', 'moon', 'planet', 'pit'],
    roles: {
      rim: { label: 'Rim', color: 14 },
      inside: { label: 'Bowl', color: 6 },
      shadow: { label: 'Shadow', color: 4 },
      debris: { label: 'Debris', color: 4 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 8, max: 90, default: 34 },
      { key: 'depth', label: 'Depth', type: 'int', min: 3, max: 18, default: 8 },
      { key: 'rim', label: 'Raised rim', type: 'bool', default: true },
      { key: 'debris', label: 'Debris', type: 'bool', default: true },
      { key: 'pit', label: 'Blocks walking', type: 'bool', default: false },
    ],
    defaultPriority: 'rows',
    perspective: true,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const rx = p.n('width') / 2
      const ry = p.n('depth') / 2 + rx * 0.1
      const cy = -ry
      const rimOn = p.b('rim')
      const rw = rimOn ? Math.max(2, rx * 0.14) : 1
      // rim ring with a dark outline
      k.ellipse(0, cy, rx + rw, ry + Math.max(1.5, rw * 0.7), R('rim'), O)
      // bowl: shadow on the far (upper) inner wall, lit floor below
      const sh = clamp(p.n('depth') / 18, 0.2, 0.9)
      discRows(k, 0, cy, rx, ry, (y, a, b, t) => {
        k.hline(a, b, y, R('inside'))
        if (t < -1 + sh * 1.2) k.hline(a, b, y, R('shadow'))
      })
      // dark far edge of the bowl, lit lip on the near edge
      k.line(k.ellipsePts(0, cy, rx, ry, 16, Math.PI, Math.PI * 2), O)
      k.line(k.ellipsePts(0, cy, rx, ry, 14, Math.PI * 0.15, Math.PI * 0.85), R('rim'))
      if (p.b('debris')) {
        // a few chunky rocks thrown out around the rim
        const n = Math.max(2, Math.round(rx * 0.18))
        for (let i = 0; i < n; i++) {
          const a = rng.range(0, Math.PI * 2)
          const d = rng.range(1.12, 1.3)
          const x = Math.cos(a) * (rx + rw + 1.5) * d
          const y = cy + Math.sin(a) * (ry + rw + 2) * d
          const w = rx > 12 ? 1 : 0.5
          k.hline(x - w, x + w, y, R('debris'))
          k.hline(x - w, x + w + 0.5, y + 1, O)
        }
      }
      if (p.b('pit')) k.wallArea(k.ellipsePts(0, cy, rx * 0.8, ry * 0.7, 14))
    },
  },
  {
    id: 'scifi-spires',
    name: 'Alien rock spires',
    themes: ['scifi'],
    category: 'rock',
    tags: ['spire', 'rock', 'pinnacle', 'hoodoo', 'arch', 'desert', 'kerona', 'mesa'],
    roles: {
      rock: { label: 'Rock', color: 4 },
      light: { label: 'Lit face', color: 12 },
      strata: { label: 'Strata', color: 0 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'shape', label: 'Shape', type: 'select', default: 'needle',
        options: [{ value: 'needle', label: 'Needles' }, { value: 'hoodoo', label: 'Hoodoos' }, { value: 'arch', label: 'Arch' }],
      },
      { key: 'count', label: 'Spires', type: 'int', min: 1, max: 6, default: 3 },
      { key: 'height', label: 'Height', type: 'int', min: 16, max: 120, default: 60 },
      { key: 'width', label: 'Base width', type: 'int', min: 3, max: 18, default: 7 },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 120 },
    hasControl: true,
    generate(k, p, rng) {
      const shape = p.s('shape')
      const n = p.n('count')
      const H = p.n('height')
      const bw = p.n('width')
      let foot = bw
      /** One tapering column with jagged edges, lit on the left. */
      const column = (cx: number, h: number, w0: number, w1: number, lean: number) => {
        const steps = Math.max(3, Math.round(h / 8))
        const left: LP[] = []
        const right: LP[] = []
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const y = -h * t
          const half = lerp(w0, w1, Math.pow(t, 0.9))
          const x = cx + lean * t * t
          const j = i === 0 || i === steps ? 0 : rng.range(-0.8, 0.8)
          left.push([x - half + j, y])
          right.push([x + half + j * 0.6, y])
        }
        const outline: LP[] = [...left, ...right.reverse()]
        k.poly(outline, R('rock'), O)
        // lit left face
        const lit: LP[] = []
        for (let i = 0; i <= steps; i++) {
          const t = i / steps
          const half = lerp(w0, w1, Math.pow(t, 0.9))
          const x = cx + lean * t * t
          lit.push([x - half * 0.55, -h * t])
        }
        k.poly([...left.slice().reverse(), ...lit], R('light'))
        k.line(left, O)
        // strata
        for (let y = -3 - rng.range(0, 3); y > -h + 3; y -= rng.range(4, 8)) {
          const t = -y / h
          const half = lerp(w0, w1, Math.pow(t, 0.9))
          const x = cx + lean * t * t
          const a = x - half * rng.range(0.1, 0.5)
          const b = x + half * rng.range(0.5, 0.9)
          if (b - a > 1) k.hline(a, b, y, R('strata'))
        }
      }
      if (shape === 'arch') {
        const span = bw * 4 + H * 0.3
        const leg = Math.max(2, bw * 0.7)
        const h = H
        // span as a thick curved band
        const outer = k.ellipsePts(0, -h * 0.55, span / 2 + leg, h * 0.45, 18, Math.PI, Math.PI * 2)
        const inner = k.ellipsePts(0, -h * 0.55, span / 2 - leg * 0.2, h * 0.28, 18, Math.PI, Math.PI * 2).reverse()
        column(-span / 2, h * 0.58, leg * 1.4, leg, 0)
        column(span / 2, h * 0.58, leg * 1.4, leg, 0)
        k.poly([...outer, ...inner], R('rock'), O)
        k.line(k.ellipsePts(0, -h * 0.55, span / 2 + leg - 1, h * 0.45 - 1, 12, Math.PI * 1.05, Math.PI * 1.5), R('light'))
        for (let i = 1; i <= 2; i++) k.line(k.ellipsePts(0, -h * 0.55, span / 2 + leg * (0.3 + i * 0.25), h * (0.3 + i * 0.05), 12, Math.PI * 1.1, Math.PI * 1.9), R('strata'))
        // extra needles beside the arch
        for (let i = 1; i < n; i++) {
          const sgn = i % 2 ? -1 : 1
          const x = sgn * (span / 2 + leg * 1.5 + Math.ceil(i / 2) * bw * 1.3)
          column(x, h * rng.range(0.3, 0.6), bw * 0.6, 0.6, rng.range(-1, 1))
        }
        const reach = span / 2 + leg * 1.5 + Math.ceil((n - 1) / 2) * bw * 1.3 + (n > 1 ? bw * 0.6 : 0)
        k.wall([[-reach, 0], [reach, 0]])
        return
      }
      // tallest in the middle, the rest behind to the sides then in front
      const order = Array.from({ length: n }, (_, i) => i)
      const xs = order.map((i) => (n === 1 ? 0 : (i - (n - 1) / 2) * bw * 1.7 + rng.range(-1.5, 1.5)))
      const hs = order.map((i) => (i === Math.floor((n - 1) / 2) ? H : H * rng.range(0.4, 0.85)))
      order.sort((a, b) => hs[b] - hs[a])
      for (const i of order) {
        const w0 = bw * (0.6 + 0.4 * (hs[i] / H))
        const lean = rng.range(-bw * 0.6, bw * 0.6)
        if (shape === 'hoodoo') {
          column(xs[i], hs[i] * 0.85, w0 * 0.9, w0 * 0.5, lean * 0.3)
          const capY = -hs[i] * 0.85
          k.blob(xs[i] + lean * 0.3, capY - 1, w0 * 1.1, Math.max(2, hs[i] * 0.08), rng, R('rock'), O, 6, 0.2)
          k.hline(xs[i] + lean * 0.3 - w0 * 0.8, xs[i] + lean * 0.3, capY - 1.5, R('light'))
        } else {
          column(xs[i], hs[i], w0, Math.max(0.6, w0 * 0.15), lean)
        }
      }
      // rubble at the foot
      for (let i = 0; i < n + 1; i++) {
        const x = rng.range(-(n * bw), n * bw)
        k.blob(x, -0.8, rng.range(1, 2.2), 1.2, rng, R('rock'), O, 4, 0.3)
      }
      foot = ((n - 1) / 2) * bw * 1.7 + bw
      k.wall([[-foot, 0], [foot, 0]])
    },
  },
  {
    id: 'scifi-plants',
    name: 'Alien plants',
    themes: ['scifi'],
    category: 'flora',
    tags: ['plant', 'alien', 'flora', 'tentacle', 'bulb', 'pod', 'jungle', 'weird'],
    roles: {
      stem: { label: 'Stems', color: 5 },
      bulb: { label: 'Bulbs / pods', color: 13 },
      spot: { label: 'Spots / glow', color: 14 },
      leaf: { label: 'Leaves', color: 2 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'bulb',
        options: [{ value: 'bulb', label: 'Bulb stalks' }, { value: 'tentacle', label: 'Tentacle fronds' }, { value: 'spiky', label: 'Spiky orb' }, { value: 'pod', label: 'Pitcher pod' }],
      },
      { key: 'height', label: 'Height', type: 'int', min: 8, max: 50, default: 22 },
      { key: 'stalks', label: 'Stalks', type: 'int', min: 1, max: 7, default: 3 },
      { key: 'spots', label: 'Spots', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const kind = p.s('kind')
      const H = p.n('height')
      const n = p.n('stalks')
      const spots = p.b('spots')
      let foot = 3
      if (kind === 'bulb') {
        const spread = Math.max(2, H * 0.35)
        const heads: [number, number, number][] = []
        for (let i = 0; i < n; i++) {
          const t = n === 1 ? 0.5 : i / (n - 1)
          const tx = (t - 0.5) * 2 * spread + rng.range(-1, 1)
          const h = H * (i === Math.floor(n / 2) ? 1 : rng.range(0.55, 0.9))
          const bx = (t - 0.5) * 2
          const pts: LP[] = [[bx, 0], [bx + tx * 0.2, -h * 0.4], [tx * 0.8, -h * 0.75], [tx, -h + 2]]
          k.line(pts, R('stem'))
          k.line(pts.map(([x, y]) => [x + 0.8, y] as LP), O)
          heads.push([tx, -h, Math.max(1.5, H * rng.range(0.08, 0.13))])
        }
        for (const [x, y, r] of heads) {
          k.ellipse(x, y, r, r * 1.5, R('bulb'), O)
          if (spots) {
            k.dot(x - r * 0.35, y - r * 0.5, R('spot'))
            if (r > 2) k.dot(x + r * 0.3, y + r * 0.3, R('spot'))
          }
        }
        k.blob(0, -1.2, Math.max(2.5, n * 1.2), 1.6, rng, R('leaf'), O, 5, 0.3)
        foot = Math.max(2.5, n * 1.2)
      } else if (kind === 'tentacle') {
        // tapered fronds that lean outward and curl at the tip like fiddleheads
        const ASP = 1.7
        const w0 = Math.max(2, H * 0.08)
        const edge = H >= 26 ? O : R('stem')
        const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2))
        for (const i of order) {
          const t = n === 1 ? 0.5 : i / (n - 1)
          const dir = (t - 0.5) * 2 + rng.range(-0.25, 0.25)
          const h = H * (Math.abs(dir) < 0.4 ? 1 : rng.range(0.6, 0.85))
          const curl = dir >= 0 ? 1 : -1
          const steps = Math.max(8, Math.round(h / 2))
          const seg = h / steps
          let x = dir * w0 * 0.8
          let y = 0
          let ang = -Math.PI / 2 + dir * 0.25
          const left: LP[] = []
          const right: LP[] = []
          const centre: LP[] = []
          for (let s2 = 0; s2 <= steps; s2++) {
            const u = s2 / steps
            const w = w0 * (1 - u * 0.85)
            const nx = (-Math.sin(ang) * w) / ASP
            const ny = Math.cos(ang) * w
            left.push([x + nx, y + ny])
            right.push([x - nx, y - ny])
            centre.push([x, y])
            ang += dir * 0.07 + (u > 0.5 ? curl * 0.32 : 0)
            x += (Math.cos(ang) * seg) / ASP
            y += Math.sin(ang) * seg
          }
          k.poly([...left, ...right.reverse()], R('stem'), edge)
          if (spots) {
            for (let s2 = 2; s2 < centre.length * 0.6; s2 += 3) k.dot(centre[s2][0], centre[s2][1], R('spot'))
          }
        }
        k.blob(0, -1, Math.max(3, n * 1.3), 1.8, rng, R('bulb'), O, 5, 0.3)
        foot = Math.max(3, n * 1.3)
      } else if (kind === 'spiky') {
        const r = Math.max(2.5, H * 0.18)
        const cy = -H * 0.42
        // spines
        const m = 6 + n * 2
        for (let i = 0; i < m; i++) {
          const a = (i / m) * Math.PI * 2 + rng.range(-0.2, 0.2)
          const l = r * rng.range(1.35, 1.7)
          k.line([[Math.cos(a) * r * 0.9, cy + Math.sin(a) * r * 1.5], [Math.cos(a) * l, cy + Math.sin(a) * l * 1.6]], R('stem'))
        }
        k.ellipse(0, cy, r, r * 1.7 * 0.9, R('leaf'), O)
        for (let i = -1; i <= 1; i++) k.line(k.ellipsePts(i * r * 0.45, cy, r * 0.3, r * 1.4, 6, Math.PI * 0.2, Math.PI * 0.8), O)
        // glowing orbs on stalks above
        for (let i = 0; i < Math.min(n, 3); i++) {
          const x = (i - (Math.min(n, 3) - 1) / 2) * r * 0.9
          const top = -H + rng.range(0, H * 0.12)
          k.line([[x * 0.5, cy - r * 1.4], [x, top + 1.5]], R('stem'))
          k.ellipse(x, top, Math.max(1, r * 0.3), Math.max(1.4, r * 0.45), R(spots ? 'spot' : 'bulb'), O)
        }
        k.rect(-r * 0.4, cy + r * 1.3, r * 0.4, 0, R('stem'), O)
        foot = r * 0.6
      } else {
        // pitcher pod: a squat vase with a lip and drooping leaves
        const r = Math.max(3, H * 0.28)
        const h = H * 0.8
        for (let i = 0; i < n; i++) {
          const sgn = i % 2 === 0 ? -1 : 1
          const lx = sgn * (r * 0.8 + i * 1.2)
          const ly = -h * rng.range(0.15, 0.45)
          const tip: LP = [lx + sgn * r * rng.range(0.8, 1.3), -rng.range(0, 1.5)]
          k.poly([[sgn * r * 0.4, ly - 1], [lx, ly - h * 0.12], tip, [lx - sgn * 0.5, ly + h * 0.06]], R('leaf'), O)
        }
        const body: LP[] = [
          [-r * 0.5, 0], [-r, -h * 0.25], [-r * 0.9, -h * 0.55], [-r * 0.45, -h * 0.8], [-r * 0.6, -h], [r * 0.6, -h], [r * 0.45, -h * 0.8], [r * 0.9, -h * 0.55], [r, -h * 0.25], [r * 0.5, 0],
        ]
        k.poly(body, R('bulb'), O)
        k.poly([[-r * 0.2, -h * 0.05], [-r * 0.75, -h * 0.28], [-r * 0.65, -h * 0.55], [-r * 0.3, -h * 0.75], [-r * 0.1, -h * 0.5]], R('stem'))
        k.ellipse(0, -h, r * 0.6, Math.max(1, r * 0.25), R('stem'), O)
        k.ellipse(0, -h + 0.2, r * 0.4, Math.max(0.6, r * 0.13), O)
        if (spots) {
          for (let i = 0; i < 4; i++) k.dot(rng.range(-r * 0.6, r * 0.6), -h * rng.range(0.2, 0.7), R('spot'))
        }
        foot = r * 0.8
      }
      k.wall([[-foot, 0], [foot, 0]])
    },
  },
]
