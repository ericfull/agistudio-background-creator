import { R } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { Rng } from '../../agi/rng'
import type { ElementDef } from '../types'

const W = 159

/** Horizontal bands with optional AGI-style line dithering at the seams. */
function bandFill(k: Kit, y0: number, y1: number, colors: string[], dither: boolean): void {
  const n = colors.length
  const h = (y1 - y0 + 1) / n
  for (let i = 0; i < n; i++) {
    const a = Math.round(y0 + i * h)
    const b = Math.round(y0 + (i + 1) * h) - 1
    if (b >= a) k.rect(0, a, W, b, R(colors[i]))
  }
  if (!dither) return
  for (let i = 1; i < n; i++) {
    const seam = Math.round(y0 + i * h)
    // alternate rows of the two colors across the seam
    for (let d = -3; d <= 2; d++) {
      const y = seam + d
      if (y < y0 || y > y1) continue
      const upper = (d + 3) % 2 === 1
      if (d < 0 && upper) k.hline(0, W, y, R(colors[i]))
      if (d >= 0 && !upper) k.hline(0, W, y, R(colors[i - 1]))
    }
  }
}

function moon(k: Kit, x: number, y: number, r: number, kind: string): void {
  k.ellipse(x, y, r, r * 1.7, R('moon'))
  if (kind === 'crescent') k.ellipse(x + r * 0.55, y - r * 0.3, r * 0.9, r * 1.6, R('sky'))
}

function stars(k: Kit, rng: Rng, n: number, y1: number): void {
  for (let i = 0; i < n; i++) {
    const x = rng.int(0, W)
    const y = rng.int(0, Math.max(0, y1 - 3))
    const bright = rng.chance(0.35)
    k.dot(x, y, R(bright ? 'star' : 'star2'))
    if (bright && rng.chance(0.25)) {
      k.dot(x, y - 1, R('star2'))
      k.dot(x, y + 1, R('star2'))
    }
  }
}

export const skies: ElementDef[] = [
  {
    id: 'sky-clear',
    name: 'Clear sky',
    themes: ['nature'],
    category: 'sky',
    tags: ['day', 'blue', 'sun'],
    span: 'full',
    roles: { sky: { label: 'Sky', color: 9 }, sun: { label: 'Sun', color: 14 } },
    params: [
      { key: 'sun', label: 'Sun', type: 'bool', default: false },
      { key: 'sunX', label: 'Sun x', type: 'int', min: 8, max: 150, default: 128 },
      { key: 'sunY', label: 'Sun height', type: 'int', min: 8, max: 60, default: 14 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p) {
      k.rect(0, 0, W, k.ctx.y, R('sky'))
      if (p.b('sun')) k.ellipse(p.n('sunX'), Math.min(p.n('sunY'), k.ctx.y - 6), 5, 8, R('sun'))
    },
  },
  {
    id: 'sky-banded',
    name: 'Sunset sky',
    themes: ['nature'],
    category: 'sky',
    tags: ['dusk', 'dawn', 'sunset', 'bands'],
    span: 'full',
    roles: {
      c1: { label: 'Top', color: 1 },
      c2: { label: 'Band 2', color: 5 },
      c3: { label: 'Band 3', color: 13 },
      c4: { label: 'Band 4', color: 12 },
      c5: { label: 'Bottom', color: 14 },
      sun: { label: 'Sun', color: 14 },
    },
    params: [
      { key: 'bands', label: 'Bands', type: 'int', min: 2, max: 5, default: 5 },
      { key: 'dither', label: 'Line dither', type: 'bool', default: true },
      { key: 'sun', label: 'Setting sun', type: 'bool', default: true },
      { key: 'sunX', label: 'Sun x', type: 'int', min: 8, max: 150, default: 110 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p) {
      const n = p.n('bands')
      const cols = ['c1', 'c2', 'c3', 'c4', 'c5'].slice(5 - n)
      bandFill(k, 0, k.ctx.y, cols, p.b('dither'))
      if (p.b('sun')) {
        const r = 7
        const cy = k.ctx.y
        k.poly(k.ellipsePts(p.n('sunX'), cy, r, r * 1.7, 16, Math.PI, Math.PI * 2), R('sun'))
      }
    },
  },
  {
    id: 'sky-night',
    name: 'Night sky',
    themes: ['nature', 'spooky', 'scifi'],
    category: 'sky',
    tags: ['night', 'stars', 'moon'],
    span: 'full',
    roles: {
      sky: { label: 'Sky', color: 0 },
      star: { label: 'Bright stars', color: 15 },
      star2: { label: 'Dim stars', color: 7 },
      moon: { label: 'Moon', color: 15 },
    },
    params: [
      { key: 'stars', label: 'Stars', type: 'int', min: 0, max: 120, default: 45 },
      {
        key: 'moon', label: 'Moon', type: 'select', default: 'crescent',
        options: [{ value: 'none', label: 'None' }, { value: 'full', label: 'Full' }, { value: 'crescent', label: 'Crescent' }],
      },
      { key: 'moonX', label: 'Moon x', type: 'int', min: 8, max: 150, default: 30 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      k.rect(0, 0, W, k.ctx.y, R('sky'))
      stars(k, rng, p.n('stars'), k.ctx.y)
      if (p.s('moon') !== 'none') moon(k, p.n('moonX'), Math.min(16, k.ctx.y - 10), 5, p.s('moon'))
    },
  },
  {
    id: 'sky-storm',
    name: 'Storm sky',
    themes: ['nature', 'spooky'],
    category: 'sky',
    tags: ['storm', 'rain', 'lightning', 'clouds'],
    span: 'full',
    roles: {
      sky: { label: 'Sky', color: 8 },
      cloud: { label: 'Clouds', color: 7 },
      bolt: { label: 'Lightning', color: 14 },
    },
    params: [
      { key: 'clouds', label: 'Cloud banks', type: 'int', min: 0, max: 8, default: 5 },
      { key: 'bolt', label: 'Lightning', type: 'bool', default: true },
      { key: 'boltX', label: 'Bolt x', type: 'int', min: 10, max: 150, default: 60 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const bottom = k.ctx.y
      k.rect(0, 0, W, bottom, R('sky'))
      for (let i = 0; i < p.n('clouds'); i++) {
        const cy = rng.int(2, Math.max(4, Math.round(bottom * 0.6)))
        const cx = rng.int(-10, W + 10)
        k.poly(k.blobPts(cx, cy, rng.int(14, 30), rng.int(3, 7), rng, 7, 0.3), R('cloud'))
      }
      if (p.b('bolt')) {
        let x = p.n('boltX')
        let y = 0
        const pts: [number, number][] = [[x, y]]
        while (y < bottom - 4) {
          y += rng.int(4, 9)
          x += rng.int(-4, 4)
          pts.push([x, Math.min(y, bottom - 4)])
        }
        k.line(pts, R('bolt'))
      }
    },
  },
  {
    id: 'clouds',
    name: 'Cloud',
    themes: ['nature'],
    category: 'sky',
    tags: ['cloud', 'puffy'],
    roles: { cloud: { label: 'Cloud', color: 15 }, shade: { label: 'Shade', color: 7 } },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 8, max: 45, default: 22 },
      { key: 'puffs', label: 'Puffs', type: 'int', min: 2, max: 6, default: 4 },
      { key: 'shade', label: 'Shaded base', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 60, y: 22 },
    generate(k, p, rng) {
      const w = p.n('width')
      const n = p.n('puffs')
      const h = Math.max(4, w * 0.45)
      if (p.b('shade')) k.rect(-w, -2, w, 0, R('shade'))
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : i / (n - 1)
        const cx = -w + (w * 2) * t * 0.8 + w * 0.1 + rng.range(-2, 2)
        const rx = w / n + rng.range(1, 4)
        const ry = h * (0.55 + Math.sin(t * Math.PI) * 0.5)
        k.ellipse(cx, -ry + 1, rx, ry, R('cloud'))
      }
    },
  },
  {
    id: 'sun-moon',
    name: 'Sun or moon',
    themes: ['nature'],
    category: 'sky',
    tags: ['sun', 'moon'],
    roles: { body: { label: 'Body', color: 14 }, ray: { label: 'Rays', color: 14 }, sky: { label: 'Crescent sky', color: 9 } },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'sun',
        options: [{ value: 'sun', label: 'Sun' }, { value: 'rays', label: 'Sun with rays' }, { value: 'moon', label: 'Moon' }, { value: 'crescent', label: 'Crescent' }],
      },
      { key: 'size', label: 'Size', type: 'int', min: 3, max: 14, default: 6 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 130, y: 20 },
    generate(k, p) {
      const r = p.n('size')
      const cy = -r * 1.7
      k.ellipse(0, cy, r, r * 1.7, R('body'))
      const kind = p.s('kind')
      if (kind === 'crescent') k.ellipse(r * 0.55, cy - r * 0.4, r * 0.9, r * 1.6, R('sky'))
      if (kind === 'rays') {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          const c = Math.cos(a)
          const s = Math.sin(a)
          k.line([[c * (r + 2), cy + s * (r + 2) * 1.7], [c * (r + 5), cy + s * (r + 5) * 1.7]], R('ray'))
        }
      }
    },
  },
]
