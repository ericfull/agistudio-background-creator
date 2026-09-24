import type { Rng } from '../../agi/rng'
import { R, clamp, lerp, wave, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { B, W, ridgeLine, ridgePoly, xAt, type Pt } from './shapes'

// ------------------------------------------------------------------ helpers

/** One side of a mountain peak, from the apex down to the base. */
function slope(rng: Rng, cx: number, top: number, base: number, w: number, dir: -1 | 1): LP[] {
  const h = base - top
  const m = clamp(Math.round(h / 7), 2, 6)
  const pts: LP[] = [[cx, top]]
  for (let j = 1; j < m; j++) {
    const t = j / m
    pts.push([cx + dir * (w * t + rng.range(-0.12, 0.12) * w), top + h * t + rng.range(-0.06, 0.06) * h])
  }
  pts.push([cx + dir * w, base])
  return pts
}

/** Merged half-ellipse humps across the width (rolling hills). */
function humpRidge(rng: Rng, base: number, hh: number, count: number, floor: number): (x: number) => number {
  const humps = Array.from({ length: count + 1 }, (_, i) => ({
    cx: ((i + rng.range(-0.25, 0.25)) * 160) / count,
    rx: (160 / count) * rng.range(0.6, 0.95),
    ry: hh * rng.range(0.55, 1),
  }))
  // make sure at least one hump reaches the full height
  humps[rng.int(0, count)].ry = hh
  return (x) => {
    let top = floor
    for (const q of humps) {
      const d = (x - q.cx) / q.rx
      if (Math.abs(d) < 1) top = Math.max(top, q.ry * Math.sqrt(1 - d * d))
    }
    return base - top
  }
}

/** A tuft of grass: a dash far away, a V in the middle distance, three blades up close. */
function tuft(k: Kit, x: number, y: number, t: number, color: ReturnType<typeof R>): void {
  if (t < 0.3) k.hline(x, x + 1, y, color)
  else if (t < 0.65) k.line([[x - 1, y - 1], [x, y], [x + 1, y - 1]], color)
  else k.line([[x - 2, y - 2], [x - 1, y], [x, y - 3], [x + 1, y], [x + 2, y - 2]], color)
}

/** Random depth 0..1 weighted toward the viewer (things get denser near the bottom). */
const near = (rng: Rng) => Math.sqrt(rng.next())

// ------------------------------------------------------------------ elements

export const terrain: ElementDef[] = [
  {
    id: 'mountains',
    name: 'Mountains',
    themes: ['nature'],
    category: 'backdrop',
    tags: ['peaks', 'snow', 'range', 'horizon'],
    span: 'full',
    roles: {
      rock: { label: 'Rock', color: 7 },
      shade: { label: 'Shadow side', color: 8 },
      line: { label: 'Ridge lines', color: 8 },
      snow: { label: 'Snow', color: 15 },
      snowShade: { label: 'Snow shadow', color: 7 },
      far: { label: 'Far range', color: 3 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 10, max: 90, default: 40 },
      { key: 'peaks', label: 'Peaks', type: 'int', min: 1, max: 8, default: 4 },
      { key: 'snow', label: 'Snow caps', type: 'bool', default: true },
      { key: 'shade', label: 'Ridge shading', type: 'bool', default: true },
      { key: 'far', label: 'Far range', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const base = k.ctx.y
      // peaks always stay at least 2 rows below the top of the picture
      const hMax = Math.max(1, Math.min(p.n('height'), base - 2))
      const n = p.n('peaks')
      const line = R('line')

      if (p.b('far')) {
        const far = Array.from({ length: n + 2 }, (_, i) => {
          const h = hMax * rng.range(0.6, 0.9)
          return { cx: ((i + rng.range(0.1, 0.9)) * 180) / (n + 2) - 10, h, w: h * rng.range(0.9, 1.4) }
        })
        const ridge = (x: number) => base - Math.max(hMax * 0.2, ...far.map((f) => f.h - (Math.abs(x - f.cx) * f.h) / f.w))
        k.poly(ridgePoly(ridge, base, 3), R('far'))
      }

      // low foothills tie the peaks together so no sky shows between them
      const wv = wave(rng)
      const foot = (x: number) => base - hMax * (0.16 + 0.07 * wv(x * 2))
      k.poly(ridgePoly(foot, base, 4), R('rock'))
      k.line(ridgeLine(foot, base, 4), line)

      const peaks = Array.from({ length: n }, (_, i) => ({
        cx: n === 1 ? rng.range(50, 110) : ((i + 0.5 + rng.range(-0.3, 0.3)) * 160) / n,
        h: n === 1 ? hMax : hMax * rng.range(0.55, 1),
      }))
      peaks[rng.int(0, n - 1)].h = hMax
      peaks.sort((a, b) => b.h - a.h)

      const snowY = base - hMax * 0.6
      for (const pk of peaks) {
        const top = base - pk.h
        const left = slope(rng, pk.cx, top, base, pk.h * rng.range(0.55, 0.85), -1)
        const right = slope(rng, pk.cx, top, base, pk.h * rng.range(0.55, 0.85), 1)
        const outline = [...left].reverse().concat(right.slice(1))
        k.poly(outline, R('rock'), line)

        const wr = right[right.length - 1][0] - pk.cx
        const inner: LP[] = [[pk.cx + wr * 0.35, base]]
        const m = right.length - 1
        for (let j = m - 1; j >= 1; j--) {
          const t = j / m
          inner.push([pk.cx + wr * (0.28 * t + rng.range(-0.06, 0.06)), top + pk.h * t])
        }
        if (p.b('shade')) k.poly([...right, ...inner], R('shade'))

        if (p.b('snow') && top < snowY - 3) {
          const ys = snowY + rng.range(-2, 2)
          const xl = xAt(left, ys)
          const xr = xAt(right, ys)
          const capL = left.filter(([, y]) => y < ys).reverse()
          const capR = right.filter(([, y]) => y < ys).slice(1)
          const teeth = Math.max(2, Math.round((xr - xl) / 3))
          const zig: LP[] = []
          for (let i = 1; i < teeth; i++) zig.push([xr - ((xr - xl) * i) / teeth, ys + (i % 2 ? rng.range(2, 5) : rng.range(-1, 1))])
          k.poly([[xl, ys], ...capL, ...capR, [xr, ys], ...zig], R('snow'))
          if (p.b('shade')) {
            const innerAll: LP[] = [...inner, [pk.cx, top]]
            const xi = xAt(innerAll, ys)
            const above = inner.filter(([, y]) => y < ys)
            k.poly([[pk.cx, top], ...capR, [xr, ys], [(xr + xi) / 2, ys + 2], [xi, ys], ...above], R('snowShade'))
          }
        }
        k.line(outline, line)
      }
    },
  },
  {
    id: 'hills',
    name: 'Rolling hills',
    themes: ['nature'],
    category: 'backdrop',
    tags: ['hills', 'green', 'horizon', 'countryside'],
    span: 'full',
    roles: {
      hill: { label: 'Near hills', color: 2 },
      far: { label: 'Far hills', color: 3 },
      line: { label: 'Ridge line', color: 0 },
      tree: { label: 'Distant trees', color: 2 },
    },
    params: [
      { key: 'ranges', label: 'Ranges', type: 'int', min: 1, max: 2, default: 2 },
      { key: 'height', label: 'Height', type: 'int', min: 6, max: 60, default: 28 },
      { key: 'humps', label: 'Humps', type: 'int', min: 1, max: 6, default: 3 },
      { key: 'trees', label: 'Distant trees', type: 'int', min: 0, max: 30, default: 6 },
      { key: 'outline', label: 'Ridge line', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const base = k.ctx.y
      const h = p.n('height')
      const humps = p.n('humps')
      const two = p.n('ranges') > 1
      const trees = p.n('trees')
      const backTrees = two ? Math.round(trees * 0.4) : 0
      // small dark trees standing on a ridge line, sometimes in little groves
      const grove = (ridge: (x: number) => number, count: number, size: number) => {
        let placed = 0
        while (placed < count) {
          let x = rng.range(3, W - 3)
          const n = Math.min(count - placed, rng.chance(0.4) ? rng.int(2, 3) : 1)
          for (let j = 0; j < n; j++) {
            const r = size * rng.range(0.8, 1.2)
            const ry = r * 1.7 * rng.range(0.9, 1.3)
            const y = ridge(x) - 0.5
            k.poly(k.ellipsePts(x, y, r, ry, 10, Math.PI, Math.PI * 2), R('tree'))
            x += r * rng.range(1.3, 1.9)
          }
          placed += n
        }
      }
      if (two) {
        const back = humpRidge(rng, base, h, humps, h * 0.3)
        k.poly(ridgePoly(back, base, 2), R('far'))
        if (p.b('outline')) k.line(ridgeLine(back, base, 2), R('line'))
        grove(back, backTrees, 1.3)
      }
      const fh = two ? Math.max(3, h * 0.55) : h
      const front = humpRidge(rng, base, fh, humps + (two ? 1 : 0), fh * 0.2)
      k.poly(ridgePoly(front, base, 2), R('hill'))
      if (p.b('outline')) k.line(ridgeLine(front, base, 2), R('line'))
      grove(front, trees - backTrees, 1.8)
    },
  },
  {
    id: 'treeline',
    name: 'Distant forest',
    themes: ['nature', 'fantasy', 'spooky'],
    category: 'backdrop',
    tags: ['forest', 'trees', 'woods', 'horizon'],
    span: 'full',
    roles: {
      leaf: { label: 'Near trees', color: 2 },
      far: { label: 'Far trees', color: 3 },
      line: { label: 'Outline', color: 0 },
      light: { label: 'Highlights', color: 10 },
      shadow: { label: 'Undergrowth', color: 0 },
      trunk: { label: 'Trunks', color: 6 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 4, max: 50, default: 28 },
      { key: 'size', label: 'Tree size', type: 'int', min: 2, max: 12, default: 7 },
      {
        key: 'kind', label: 'Trees', type: 'select', default: 'round',
        options: [{ value: 'round', label: 'Leafy' }, { value: 'pine', label: 'Pines' }, { value: 'mixed', label: 'Mixed' }],
      },
      { key: 'rows', label: 'Rows', type: 'int', min: 1, max: 2, default: 1 },
      { key: 'trunks', label: 'Trunks below', type: 'bool', default: true },
      { key: 'outline', label: 'Outline', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const base = k.ctx.y
      const h = p.n('height')
      const size = p.n('size')
      const kind = p.s('kind')
      const line = p.b('outline') ? R('line') : undefined

      const row = (hh: number, sz: number, color: string, front: boolean) => {
        type Bump = { cx: number; rx: number; top: number; ry: number; pine: boolean }
        const bumps: Bump[] = []
        let x = -sz - rng.range(0, sz)
        while (x < W + sz) {
          const pine = kind === 'pine' || (kind === 'mixed' && rng.chance(0.4))
          const rx = sz * rng.range(0.8, 1.25) * (pine ? 0.8 : 1)
          const top = base - hh * rng.range(0.7, 1)
          const ry = pine ? rx * 3.4 : rx * 1.7
          bumps.push({ cx: x, rx, top, ry, pine })
          x += rx * rng.range(1.1, 1.6)
        }
        const solid = base - hh * 0.35
        const ridge = (px: number) => {
          let y = solid
          for (const b of bumps) {
            const d = (px - b.cx) / b.rx
            if (Math.abs(d) >= 1) continue
            const yy = b.pine ? b.top + Math.abs(d) * b.ry : b.top + b.ry * (1 - Math.sqrt(1 - d * d))
            if (yy < y) y = yy
          }
          return y
        }
        k.poly(ridgePoly(ridge, base, 1), R(color))
        if (line) k.line(ridgeLine(ridge, base, 1), line)
        if (front && p.b('trunks') && hh >= 6) {
          // dark undergrowth below the crowns, with trunks under each crown
          const bandTop = base - Math.max(2, hh * 0.3)
          const d = Math.max(1, hh * 0.12)
          const centers = bumps.filter((b) => !b.pine || kind !== 'pine').map((b) => b.cx)
          if (centers.length < 2) centers.push(...bumps.map((b) => b.cx))
          const under = (px: number) => {
            let i = 0
            while (i < centers.length - 2 && centers[i + 1] < px) i++
            const a = centers[i]
            const b = centers[i + 1]
            const half = Math.max(1, (b - a) / 2)
            const u = Math.min(1, Math.min(Math.abs(px - a), Math.abs(b - px)) / half)
            return bandTop + d * Math.sqrt(Math.max(0, 1 - u * u))
          }
          k.poly(ridgePoly(under, base, 1), R('shadow'))
          const tw = sz >= 7 ? 1 : 0
          for (const cx of centers) {
            if (cx < -1 || cx > W + 1) continue
            const x = Math.round(cx + rng.range(-1, 1))
            k.rect(x - tw / 2, under(cx), x + tw / 2, base, R('trunk'))
          }
        }
        if (front && sz >= 3) {
          for (const b of bumps) {
            if (b.pine || b.rx < 2.5 || b.ry < 5 || hh < 8 || !rng.chance(0.6)) continue
            const pts = k.ellipsePts(b.cx, b.top + b.ry, b.rx - 1.2, b.ry - 1.5, 5, Math.PI * 1.12, Math.PI * 1.45)
            k.line(pts, R('light'))
          }
        }
      }

      if (p.n('rows') > 1) row(h, size * 1.1, 'far', false)
      row(p.n('rows') > 1 ? Math.max(3, h * 0.65) : h, size, 'leaf', size >= 3)
    },
  },
  {
    id: 'grass-field',
    name: 'Grass field',
    themes: ['nature', 'fantasy'],
    category: 'ground',
    tags: ['grass', 'ground', 'meadow', 'lawn'],
    span: 'full',
    roles: {
      grass: { label: 'Grass', color: 10 },
      tuft: { label: 'Tufts', color: 2 },
      patch: { label: 'Patches', color: 2 },
      flower: { label: 'Flowers', color: 15 },
    },
    params: [
      { key: 'tufts', label: 'Tufts', type: 'int', min: 0, max: 150, default: 50 },
      { key: 'patches', label: 'Patches', type: 'int', min: 0, max: 8, default: 0 },
      { key: 'flowers', label: 'Flowers', type: 'int', min: 0, max: 40, default: 0 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const y0 = k.ctx.y
      const span = Math.max(1, B - y0)
      k.rect(0, y0, W, B, R('grass'))
      for (let i = 0; i < p.n('patches'); i++) {
        const t = near(rng)
        const cy = y0 + 2 + t * (span - 2)
        const rx = 6 + t * 16
        const ry = 1 + t * 3.5
        k.poly(k.blobPts(rng.range(0, W), cy, rx, ry, rng, 6, 0.3).map(([x, y]) => [x, Math.max(y0 + 1, y)] as LP), R('patch'))
      }
      for (let i = 0; i < p.n('tufts'); i++) {
        const t = near(rng)
        const y = Math.round(y0 + 1 + t * (span - 1))
        if (y - (t < 0.3 ? 0 : t < 0.65 ? 1 : 3) <= y0) continue
        tuft(k, rng.int(1, W - 1), y, t, R('tuft'))
      }
      for (let i = 0; i < p.n('flowers'); i++) {
        const t = near(rng)
        const y = Math.round(y0 + 2 + t * (span - 2))
        const x = rng.int(0, W)
        k.dot(x, y, R('flower'))
        if (t > 0.6) k.dot(x, y - 1, R('flower'))
      }
    },
  },
  {
    id: 'snow-field',
    name: 'Snow field',
    themes: ['nature'],
    category: 'ground',
    tags: ['snow', 'winter', 'ground', 'ice'],
    span: 'full',
    roles: {
      snow: { label: 'Snow', color: 15 },
      shade: { label: 'Drift shadows', color: 7 },
      sparkle: { label: 'Sparkle', color: 11 },
      rock: { label: 'Rocks', color: 8 },
    },
    params: [
      { key: 'drifts', label: 'Drifts', type: 'int', min: 0, max: 12, default: 5 },
      { key: 'sparkle', label: 'Glints', type: 'int', min: 0, max: 40, default: 8 },
      { key: 'rocks', label: 'Rocks', type: 'int', min: 0, max: 8, default: 2 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const y0 = k.ctx.y
      const span = Math.max(1, B - y0)
      k.rect(0, y0, W, B, R('snow'))
      const drifts = Array.from({ length: p.n('drifts') }, () => near(rng)).sort((a, b) => a - b)
      for (const t of drifts) {
        const cy = y0 + 3 + t * (span - 4)
        const len = 16 + t * 44
        const th = 1.5 + t * 3.5
        const x0 = rng.range(-len * 0.4, W - len * 0.6)
        const top: LP[] = []
        const bot: LP[] = []
        const S = 8
        for (let s = 0; s <= S; s++) {
          const u = s / S
          const hump = Math.sin(Math.PI * u) * (1 + 0.25 * Math.sin(Math.PI * u * 2))
          top.push([x0 + len * u, cy - th * hump])
          bot.push([x0 + len * u, cy - th * 0.35 * hump])
        }
        k.poly([...top, ...bot.reverse()], R('shade'))
      }
      for (let i = 0; i < p.n('rocks'); i++) {
        const t = near(rng)
        const cy = y0 + 3 + t * (span - 4)
        const rx = 1.5 + t * 4
        const x = rng.range(4, W - 4)
        const ry = rx * 1.6
        k.poly(k.ellipsePts(x, cy, rx, ry, 10, Math.PI, Math.PI * 2), R('rock'))
        k.poly([...k.ellipsePts(x - rx * 0.1, cy - ry * 0.55, rx * 0.8, ry * 0.45, 8, Math.PI, Math.PI * 2), [x + rx * 0.3, cy - ry * 0.4], [x - rx * 0.3, cy - ry * 0.6]], R('snow'))
      }
      // short horizontal glints (single pixels just read as noise)
      for (let i = 0; i < p.n('sparkle'); i++) {
        const t = near(rng)
        const x = rng.int(1, W - 1)
        k.hline(x - 1, x + 1, Math.round(y0 + 2 + t * (span - 2)), R('sparkle'))
      }
    },
  },
  {
    id: 'sand-dunes',
    name: 'Sand dunes',
    themes: ['nature', 'scifi'],
    category: 'ground',
    tags: ['desert', 'sand', 'dunes', 'ground'],
    span: 'full',
    roles: {
      sand: { label: 'Sand', color: 14 },
      shade: { label: 'Dune shadow', color: 6 },
      ripple: { label: 'Ripples', color: 6 },
    },
    params: [
      { key: 'dunes', label: 'Dunes', type: 'int', min: 0, max: 8, default: 4 },
      { key: 'height', label: 'Dune height', type: 'int', min: 2, max: 36, default: 16 },
      { key: 'ripples', label: 'Ripples', type: 'int', min: 0, max: 24, default: 7 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const y0 = k.ctx.y
      const span = Math.max(1, B - y0)
      k.rect(0, y0, W, B, R('sand'))
      const n = p.n('dunes')
      const hMax = p.n('height')
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0.5 : (i + rng.range(0.2, 0.8)) / n
        const yb = y0 + 2 + t * (span - 3)
        const hh = Math.min(Math.max(2, hMax * (0.4 + 0.6 * t)), yb - y0 - 1)
        if (hh < 1.5) continue
        const ww = 9 + t * 24
        const cx = rng.range(-8, W + 8)
        // windward slope rises gently to a sharp crest; the slip face drops steeply into shadow
        const crest: LP = [cx + ww * rng.range(0.05, 0.35), yb - hh]
        const left: LP[] = []
        const S = 8
        for (let s = 0; s <= S; s++) {
          const u = s / S
          const e = u * u * (3 - 2 * u)
          left.push([lerp(cx - ww, crest[0], u), yb - hh * (0.35 * u + 0.65 * e)])
        }
        const foot: LP = [crest[0] + ww * rng.range(0.45, 0.65), yb]
        const slip: LP[] = [crest, [lerp(crest[0], foot[0], 0.35), yb - hh * 0.45], foot]
        k.poly([...left, ...slip.slice(1)], R('sand'))
        const back: LP = [lerp(crest[0], foot[0], 0.18), yb]
        k.poly([...slip, back, [lerp(crest[0], back[0], 0.4), yb - hh * 0.5]], R('shade'))
        k.line(left, R('ripple'))
      }
      // wind ripples: long flat strokes, sometimes a parallel pair
      for (let i = 0; i < p.n('ripples'); i++) {
        const t = near(rng)
        const y = Math.round(y0 + 3 + t * (span - 5))
        const len = 4 + t * 10 + rng.range(0, 3)
        const x = rng.range(-2, W - len * 0.5)
        k.hline(x, x + len, y, R('ripple'))
        if (t > 0.4 && rng.chance(0.5)) k.hline(x + len * 0.25, x + len * 1.1, y + 2, R('ripple'))
      }
    },
  },
  {
    id: 'clearing',
    name: 'Clearing',
    themes: ['nature', 'fantasy'],
    category: 'ground',
    tags: ['dirt', 'clearing', 'patch', 'bare'],
    roles: {
      dirt: { label: 'Dirt', color: 6 },
      rim: { label: 'Grass edge', color: 2 },
      stone: { label: 'Stones', color: 7 },
      mark: { label: 'Worn marks', color: 8 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 8, max: 70, default: 34 },
      { key: 'depth', label: 'Depth', type: 'int', min: 3, max: 30, default: 12 },
      { key: 'rim', label: 'Grass edge', type: 'bool', default: true },
      { key: 'stones', label: 'Stones', type: 'int', min: 0, max: 12, default: 4 },
    ],
    defaultPriority: 'rows',
    perspective: true,
    place: { x: 80, y: 130 },
    generate(k, p, rng) {
      const w = p.n('width')
      const d = p.n('depth')
      const cy = -d
      const pts = k.blobPts(0, cy, w, d, rng, 9, 0.14)
      k.poly(pts, R('dirt'))
      // worn marks: a few flat strokes in the dirt
      const marks = Math.round(w / 12)
      for (let i = 0; i < marks; i++) {
        const y = cy + rng.range(-d * 0.5, d * 0.6)
        const hw = w * Math.sqrt(Math.max(0, 1 - ((y - cy) / d) ** 2)) * 0.7
        const x = rng.range(-hw, hw * 0.5)
        k.hline(x, x + rng.range(2, Math.max(3, hw * 0.5)), y, R('mark'))
      }
      for (let i = 0; i < p.n('stones'); i++) {
        const a = rng.range(0, Math.PI * 2)
        const r = Math.sqrt(rng.next()) * 0.75
        const sx = Math.cos(a) * w * r
        const sy = cy + Math.sin(a) * d * r
        const s = rng.range(0.8, 1.6)
        k.ellipse(sx, sy, s, s * 0.8, R('stone'))
      }
      if (p.b('rim')) {
        for (let i = 0; i < pts.length; i++) {
          if (rng.chance(0.3)) continue
          const [x, y] = pts[i]
          const front = y > cy
          k.line(front ? [[x - 1, y + 1], [x, y - 1], [x + 1, y + 1]] : [[x - 1, y - 1], [x, y + 1], [x + 1, y - 1]], R('rim'))
        }
      }
    },
  },
  {
    id: 'path',
    name: 'Path (north–south)',
    themes: ['nature', 'fantasy'],
    category: 'ground',
    tags: ['path', 'road', 'trail', 'dirt', 'exit'],
    span: 'full',
    roles: {
      dirt: { label: 'Dirt', color: 6 },
      edge: { label: 'Edges', color: 6 },
      pebble: { label: 'Pebbles', color: 8 },
    },
    params: [
      { key: 'topX', label: 'Top x', type: 'int', min: 0, max: 159, default: 80 },
      { key: 'bottomX', label: 'Bottom x', type: 'int', min: 0, max: 159, default: 80 },
      { key: 'topW', label: 'Top width', type: 'int', min: 2, max: 40, default: 8 },
      { key: 'bottomW', label: 'Bottom width', type: 'int', min: 4, max: 100, default: 36 },
      { key: 'bend', label: 'Bend', type: 'int', min: -40, max: 40, default: 0 },
      { key: 'pebbles', label: 'Pebbles', type: 'int', min: 0, max: 40, default: 10 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 60 },
    generate(k, p, rng) {
      const y0 = Math.min(k.ctx.y, B - 2)
      const span = B - y0
      const tx = p.n('topX')
      const bx = p.n('bottomX')
      const tw = p.n('topW')
      const bw = Math.max(p.n('bottomW'), tw)
      const mid = (tx + bx) / 2 + p.n('bend')
      const cAt = (t: number) => (1 - t) * (1 - t) * tx + 2 * t * (1 - t) * mid + t * t * bx
      const wAt = (t: number) => lerp(tw, bw, t) / 2
      const wl = wave(rng)
      const wr = wave(rng)
      const steps = clamp(Math.round(span / 5), 2, 30)
      const left: LP[] = []
      const right: LP[] = []
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const y = y0 + span * t
        const edge = s > 0 && s < steps ? 1 : 0
        const hw = wAt(t)
        const j = Math.min(1.2, hw * 0.25) * edge
        left.push([cAt(t) - hw + wl(y * 3) * j, y])
        right.push([cAt(t) + hw + wr(y * 3) * j, y])
      }
      k.poly([...left, ...[...right].reverse()], R('dirt'))
      k.line(left, R('edge'))
      k.line(right, R('edge'))
      for (let i = 0; i < p.n('pebbles'); i++) {
        const t = Math.max(0.05, near(rng))
        const y = y0 + t * span
        const hw = wAt(t) * 0.8
        const x = cAt(t) + rng.range(-hw, hw)
        if (t > 0.7 && rng.chance(0.5)) k.hline(x, x + 1, y, R('pebble'))
        else k.dot(x, y, R('pebble'))
      }
    },
  },
  {
    id: 'path-ew',
    name: 'Path (east–west)',
    themes: ['nature', 'fantasy'],
    category: 'ground',
    tags: ['path', 'road', 'trail', 'dirt', 'exit'],
    span: 'full',
    roles: {
      dirt: { label: 'Dirt', color: 6 },
      edge: { label: 'Edges', color: 6 },
      pebble: { label: 'Pebbles', color: 8 },
    },
    params: [
      { key: 'west', label: 'Reach west edge', type: 'bool', default: true },
      { key: 'east', label: 'Reach east edge', type: 'bool', default: true },
      { key: 'joinX', label: 'Open end x', type: 'int', min: 10, max: 150, default: 80 },
      { key: 'width', label: 'Width', type: 'int', min: 3, max: 30, default: 12 },
      { key: 'wobble', label: 'Wobble', type: 'int', min: 0, max: 12, default: 3 },
      { key: 'pebbles', label: 'Pebbles', type: 'int', min: 0, max: 40, default: 8 },
      { key: 'ford', label: 'Ford (walk across water)', type: 'bool', default: false },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 110 },
    hasControl: true,
    generate(k, p, rng) {
      const y0 = k.ctx.y
      const w = p.n('width')
      const wob = p.n('wobble')
      const join = p.n('joinX')
      const west = p.b('west')
      const east = p.b('east')
      let xa = west ? -1 : join
      let xb = east ? W + 1 : join
      if (!west && !east) {
        xa = join - w * 1.2
        xb = join + w * 1.2
      }
      const wv = wave(rng)
      const jt = wave(rng)
      const jb = wave(rng)
      const cy = (x: number) => y0 + wob * wv(x * 0.8)
      const top: LP[] = []
      const bot: LP[] = []
      const steps = clamp(Math.round((xb - xa) / 5), 2, 40)
      for (let s = 0; s <= steps; s++) {
        const x = xa + ((xb - xa) * s) / steps
        top.push([x, cy(x) - w / 2 + jt(x * 3) * 0.8])
        bot.push([x, cy(x) + w / 2 + jb(x * 3) * 0.8])
      }
      // round caps where the path stops short of an edge
      const cap = (x: number, yTop: number, yBot: number, a0: number, a1: number): Pt[] => {
        const my = (yTop + yBot) / 2
        const ry = (yBot - yTop) / 2
        return k.ellipsePts(x, my, Math.max(1.5, ry * 0.6), ry, 8, a0, a1).slice(1, -1)
      }
      const pts: Pt[] = [...top]
      if (!east) pts.push(...cap(xb, top[top.length - 1][1], bot[bot.length - 1][1], -Math.PI / 2, Math.PI / 2))
      pts.push(...[...bot].reverse())
      if (!west) pts.push(...cap(xa, top[0][1], bot[0][1], Math.PI / 2, Math.PI * 1.5))
      k.poly(pts, R('dirt'))
      k.line(top, R('edge'))
      k.line(bot, R('edge'))
      // where the path crosses a river or pond drawn below it, let people wade across
      if (p.b('ford')) k.clearControl(pts)
      for (let i = 0; i < p.n('pebbles'); i++) {
        const x = rng.range(xa + 1, xb - 1)
        const y = cy(x) + rng.range(-w * 0.35, w * 0.35)
        k.dot(x, y, R('pebble'))
      }
    },
  },
]
