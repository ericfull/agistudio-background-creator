import type { Rng } from '../../agi/rng'
import { R, clamp, lerp, type LP } from '../../kit/helpers'
import type { ElementDef } from '../types'
import { outlineSolid, segQuad, silhouette, type Pt } from './shapes'

/** Bell-ish random in [-1, 1] (two dice averaged), for clustering around a center. */
const bell = (rng: Rng) => rng.range(-1, 1) * 0.5 + rng.range(-1, 1) * 0.5

const plants: ElementDef[] = [
  {
    id: 'pine',
    name: 'Pine tree',
    themes: ['nature', 'fantasy'],
    category: 'flora',
    tags: ['tree', 'pine', 'fir', 'conifer', 'forest', 'evergreen'],
    roles: {
      leaf: { label: 'Needles', color: 2 },
      leafLight: { label: 'Highlight', color: 10 },
      line: { label: 'Outline', color: 0 },
      trunk: { label: 'Trunk', color: 6 },
      snow: { label: 'Snow', color: 15 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 16, max: 120, default: 64 },
      { key: 'width', label: 'Width', type: 'int', min: 5, max: 30, default: 13 },
      { key: 'tiers', label: 'Tiers', type: 'int', min: 2, max: 7, default: 4 },
      { key: 'outline', label: 'Outlines', type: 'bool', default: true },
      { key: 'highlights', label: 'Highlights', type: 'bool', default: true },
      { key: 'snow', label: 'Snow', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 40, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const h = p.n('height')
      // a short tree can't be wider than a stubby cone
      const w = Math.min(p.n('width'), Math.max(3, h * 0.45))
      // each seed gets its own tier count (±1), spacing, widths and a slight lean
      const n = clamp(p.n('tiers') + (rng.chance(0.5) ? rng.pick([-1, 1]) : 0), 2, 7)
      const line = p.b('outline') ? R('line') : undefined
      const trunkH = Math.max(3, h * rng.range(0.11, 0.16))
      const tw = Math.max(1, w * 0.16)
      k.rect(-tw, -trunkH - 3, tw, 0, R('trunk'), line ?? R('trunk'))
      const lean = rng.range(-0.25, 0.25)
      // uneven tier spacing, normalised so the top tier still ends at the full height
      const gaps = Array.from({ length: n }, () => rng.range(0.8, 1.2))
      const unit = (h - trunkH) / (gaps.slice(0, n - 1).reduce((a, b) => a + b, 0) + 1.8)
      let yb = -trunkH
      for (let i = 0; i < n; i++) {
        const s = unit * gaps[i]
        const ya = i === n - 1 ? -h : yb - s * rng.range(1.6, 2)
        const wi = Math.max(1.5, w * (1 - i / (n + 0.3)) * rng.range(0.85, 1.1))
        const ax = lean * i + rng.range(-0.6, 0.6)
        const sy = ya + (yb - ya) * rng.range(0.5, 0.65)
        const sx = wi * rng.range(0.35, 0.5)
        const teeth = Math.max(2, Math.round(wi / rng.range(2.2, 3.2)))
        const droop = rng.range(0.9, 2.4)
        const pts: LP[] = [[ax, ya], [ax * 0.5 + sx, sy], [ax * 0.3 + wi, yb]]
        for (let t = 1; t < teeth * 2; t++) {
          const x = ax * 0.3 + wi - (2 * wi * t) / (teeth * 2)
          pts.push([x, yb + (t % 2 ? -droop : rng.range(0, 0.8))])
        }
        pts.push([ax * 0.3 - wi, yb], [ax * 0.5 - sx, sy])
        k.poly(pts, R('leaf'), line ?? R('leaf'))
        if (p.b('highlights') && wi * k.sc >= 3) {
          k.poly([[ax - 0.4, ya + 2], [ax * 0.5 - sx + 0.5, sy], [ax * 0.3 - wi + 1.6, yb - 0.8], [ax * 0.3 - wi * 0.62, yb - 1.4], [ax * 0.4 - wi * 0.3, sy - (sy - ya) * 0.2]], R('leafLight'))
        }
        if (p.b('snow')) {
          const cy = ya + (yb - ya) * 0.45
          const cw = sx * 0.75
          k.poly([[ax, ya], [ax + cw, cy], [ax + cw * 0.35, cy - 1], [ax, cy + 0.5], [ax - cw * 0.45, cy - 1], [ax - cw, cy]], R('snow'))
          // snow along the drooping bough tips
          for (let t = 0; t <= teeth * 2; t += 2) {
            const x = ax * 0.3 + wi - (2 * wi * t) / (teeth * 2)
            k.hline(x - 0.5, x + 0.5, yb - 1, R('snow'))
          }
        }
        if (line) outlineSolid(k, pts, line, R('leaf'))
        yb -= s
      }
      k.wall([[-tw - 1, 0], [tw + 1, 0]])
    },
  },
  {
    id: 'palm',
    name: 'Palm tree',
    themes: ['nature'],
    category: 'flora',
    tags: ['tree', 'palm', 'tropical', 'beach', 'island'],
    roles: {
      leaf: { label: 'Fronds', color: 2 },
      leafLight: { label: 'Frond ribs', color: 10 },
      line: { label: 'Outline', color: 0 },
      trunk: { label: 'Trunk', color: 6 },
      nut: { label: 'Coconuts', color: 6 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 20, max: 110, default: 62 },
      { key: 'lean', label: 'Lean', type: 'int', min: -24, max: 24, default: 8 },
      { key: 'fronds', label: 'Fronds', type: 'int', min: 3, max: 9, default: 7 },
      { key: 'coconuts', label: 'Coconuts', type: 'bool', default: true },
      { key: 'outline', label: 'Outlines', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 40, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const h = p.n('height')
      const lean = p.n('lean')
      const n = p.n('fronds')
      const line = p.b('outline') ? R('line') : undefined
      const tw0 = Math.max(1.5, h * 0.038)
      const tw1 = Math.max(1, tw0 * 0.65)
      const segs = clamp(Math.round(h / 6), 3, 16)
      // leans out at the base and turns upright near the crown
      const at = (t: number): LP => [lean * (0.6 * t + 0.4 * (1 - (1 - t) ** 2)), -h * t]
      for (let j = 0; j < segs; j++) {
        const t0 = j / segs
        const t1 = (j + 1) / segs
        const q = segQuad(at(t0), at(t1), lerp(tw0, tw1, t0) * 0.88, lerp(tw0, tw1, t1) * 1.1)
        k.poly(q, R('trunk'), line ?? R('trunk'))
      }
      const [cx, cy] = at(1)
      const fronds = Array.from({ length: n }, (_, i) => {
        const u = n === 1 ? 0.5 : i / (n - 1)
        return lerp(-Math.PI + 0.2, -0.2, u) + rng.range(-0.12, 0.12)
      }).sort((a, b) => Math.abs(Math.cos(a)) - Math.abs(Math.cos(b)))
      for (const a of fronds) {
        const L = h * rng.range(0.42, 0.56)
        const droop = (0.3 + 0.45 * Math.abs(Math.cos(a))) * rng.range(0.85, 1.15)
        const S = 8
        // centerline in display space (x doubled)
        const cl: LP[] = []
        for (let s = 0; s <= S; s++) {
          const t = s / S
          cl.push([Math.cos(a) * L * t, Math.sin(a) * L * t + droop * L * t * t])
        }
        const up: LP[] = []
        const dn: LP[] = []
        for (let s = 0; s <= S; s++) {
          const t = s / S
          const [X, Y] = cl[s]
          const [px, py] = cl[Math.max(0, s - 1)]
          const [nx0, ny0] = cl[Math.min(S, s + 1)]
          const dx = nx0 - px
          const dy = ny0 - py
          const len = Math.hypot(dx, dy) || 1
          let nx = -dy / len
          let ny = dx / len
          if (ny < 0) {
            nx = -nx
            ny = -ny
          }
          const th = L * 0.27 * Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.95))
          const tooth = s % 2 ? 1 : 0.55
          up.push([cx + (X - nx * th * 0.35) / 2, cy + Y - ny * th * 0.35])
          dn.push([cx + (X + nx * th * tooth) / 2, cy + Y + ny * th * tooth])
        }
        k.poly([...up, ...dn.reverse()], R('leaf'), line ?? R('leaf'))
        k.line(cl.slice(1, S).map(([X, Y]): LP => [cx + X / 2, cy + Y]), R('leafLight'))
      }
      // leafy knot at the crown hides the top of the trunk
      k.blob(cx, cy + 0.5, tw1 * 1.6 + 1, Math.max(2, h * 0.04), rng, R('leaf'), line ?? R('leaf'), 5, 0.25)
      if (p.b('coconuts')) {
        // hanging in a bunch just under the crown, either side of the trunk
        const r = Math.max(0.8, h * 0.02)
        const nuts: LP[] = [[cx - tw1 - r * 0.5, cy + r * 2.6], [cx + tw1 + r * 0.5, cy + r * 2.9]]
        if (h > 40) nuts.push([cx + rng.range(-0.5, 0.5), cy + r * 3.8])
        for (const [x, y] of nuts) k.ellipse(x, y, r, r * 1.7, R('nut'), line ?? R('nut'))
      }
      k.wall([[-tw0 - 1, 0], [tw0 + 1, 0]])
    },
  },
  {
    id: 'dead-tree',
    name: 'Dead tree',
    themes: ['nature', 'spooky', 'fantasy'],
    category: 'flora',
    tags: ['tree', 'dead', 'bare', 'winter', 'branches', 'spooky'],
    roles: {
      wood: { label: 'Wood', color: 6 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 20, max: 110, default: 64 },
      { key: 'branches', label: 'Branching', type: 'int', min: 1, max: 4, default: 3 },
      { key: 'spread', label: 'Spread', type: 'int', min: 15, max: 75, default: 40 },
      { key: 'trunk', label: 'Trunk width', type: 'int', min: 1, max: 6, default: 2 },
      { key: 'outline', label: 'Outlines', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 40, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const h = p.n('height')
      const depth = p.n('branches')
      const spread = (p.n('spread') * Math.PI) / 180
      const tw = p.n('trunk')
      const line = p.b('outline') ? R('line') : undefined
      const segs: { a: LP; b: LP; w0: number; w1: number }[] = []
      const twigs: LP[][] = []
      const minW = 0.7 / k.sc
      const F = 0.72
      // trunk length chosen so the whole crown ends near the requested height
      let sum = 1
      for (let i = 1; i <= depth; i++) sum += F ** i * 0.85
      const len0 = h / sum
      const w0 = Math.min(tw, 1 + h * 0.045)
      const branch = (a: LP, ang: number, len: number, w: number, d: number, lvl: number): void => {
        const m: LP = [a[0] + (Math.sin(ang) * len * 0.5) / 2, a[1] - Math.cos(ang) * len * 0.5]
        const a2 = ang + rng.range(-0.22, 0.22)
        const e: LP = [m[0] + (Math.sin(a2) * len * 0.5) / 2, m[1] - Math.cos(a2) * len * 0.5]
        const we = lvl === 0 ? w * 0.7 : w * 0.6
        if (w < minW) twigs.push([a, m, e])
        else segs.push({ a, b: m, w0: w, w1: (w + we) / 2 }, { a: m, b: e, w0: (w + we) / 2, w1: we })
        if (d <= 0) return
        const kids = d > 1 && rng.chance(0.35) ? 3 : 2
        const sp = lvl === 0 ? spread : spread * 0.75
        for (let c = 0; c < kids; c++) {
          const off = kids === 2 ? (c === 0 ? -1 : 1) * rng.range(0.55, 1) : (c - 1) * rng.range(0.8, 1.1)
          const ka = a2 * 0.6 + off * sp + rng.range(-0.12, 0.12)
          branch(e, ka, len * rng.range(F - 0.08, F + 0.08), we * (kids === 3 ? 0.75 : 0.85), d - 1, lvl + 1)
        }
      }
      const lean = rng.range(-0.1, 0.1)
      branch([0, 0], lean, len0, w0, depth, 0)
      // an odd side limb partway up the trunk
      if (depth >= 2 && rng.chance(0.6)) {
        const side = rng.chance(0.5) ? -1 : 1
        const y = -len0 * rng.range(0.4, 0.6)
        branch([Math.sin(lean) * -y * 0.5, y], lean + side * spread * 1.3, len0 * 0.5, w0 * 0.35, Math.max(0, depth - 2), 1)
      }
      const roots: LP[] = [[-w0 - 2.5, 0], [-w0 * 0.9, -3], [w0 * 0.9, -3], [w0 + 2.5, 0]]
      if (line) {
        const e = 1 / k.sc
        k.poly([[-w0 - 2.5 - e, 0], [-w0 * 0.9 - e, -3 - e], [w0 * 0.9 + e, -3 - e], [w0 + 2.5 + e, 0]], line)
        for (const s of segs) k.poly(segQuad(s.a, s.b, s.w0 + e, s.w1 + e), line)
      }
      k.poly(roots, R('wood'))
      for (const s of segs) k.poly(segQuad(s.a, s.b, s.w0, s.w1), R('wood'))
      for (const t of twigs) k.line(t, line ?? R('wood'))
      k.wall([[-w0 - 1, 0], [w0 + 1, 0]])
    },
  },
  {
    id: 'bush',
    name: 'Bush',
    themes: ['nature', 'fantasy'],
    category: 'flora',
    tags: ['bush', 'shrub', 'hedge', 'green'],
    roles: {
      leaf: { label: 'Leaves', color: 2 },
      leafLight: { label: 'Highlight', color: 10 },
      line: { label: 'Outline', color: 0 },
      berry: { label: 'Berries', color: 12 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 3, max: 36, default: 8 },
      { key: 'height', label: 'Height', type: 'int', min: 4, max: 44, default: 21 },
      { key: 'clumps', label: 'Clumps', type: 'int', min: 1, max: 5, default: 3 },
      { key: 'berries', label: 'Berries', type: 'bool', default: false },
      { key: 'outline', label: 'Outlines', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 110, y: 135 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const h = p.n('height')
      const line = p.b('outline') ? R('line') : undefined
      // wide, low bushes get extra clumps so each clump stays roundish
      const want = Math.ceil(((2 * w) / Math.max(1, h * 0.4) - 2) / 1.1 + 1)
      const n = clamp(Math.max(p.n('clumps'), want), 1, 12)
      const rx = (2 * w) / (2 + 1.1 * (n - 1))
      type Clump = { cx: number; cy: number; rx: number; ry: number; pts: readonly Pt[] }
      const make = (cx: number, cy: number, r: number, ry: number): Clump => ({ cx, cy, rx: r, ry, pts: k.blobPts(cx, cy, r, ry, rng, 7, 0.2) })
      // a mound: a row of clumps on the ground with a row of clumps piled on top
      const lower: Clump[] = []
      const upper: Clump[] = []
      if (n === 1) lower.push(make(0, -h / 2, w, h / 2))
      else {
        const ryb = h * 0.33
        for (let i = 0; i < n; i++) {
          const cx = -w + rx + (i * (2 * w - 2 * rx)) / (n - 1)
          lower.push(make(cx, -ryb * 0.95, rx * rng.range(0.9, 1.1), ryb * rng.range(0.9, 1.1)))
        }
        for (let i = 0; i < n - 1; i++) {
          const cx = (lower[i].cx + lower[i + 1].cx) / 2 + rng.range(-1, 1)
          const ryu = h * 0.32 * rng.range(0.9, 1.05)
          const edge = n > 2 && (i === 0 || i === n - 2) ? rng.range(0.8, 0.92) : 1
          upper.push(make(cx, -h * edge + ryu, rx * rng.range(0.95, 1.15), ryu))
        }
      }
      const clumps = [...lower, ...upper]
      silhouette(k, clumps, R('leaf'), line)
      for (const c of upper.length ? upper : lower) {
        if (c.rx * k.sc < 2.5 || !rng.chance(0.75)) continue
        k.blob(c.cx - c.rx * rng.range(0.15, 0.4), c.cy - c.ry * rng.range(0.3, 0.45), c.rx * 0.4, c.ry * 0.28, rng, R('leafLight'), undefined, 5, 0.3)
      }
      if (p.b('berries')) {
        const count = Math.max(3, Math.round((w * h) / 18))
        for (let i = 0; i < count; i++) {
          const c = clumps[rng.int(0, clumps.length - 1)]
          const a = rng.range(0, Math.PI * 2)
          const r = Math.sqrt(rng.next()) * 0.75
          k.dot(c.cx + Math.cos(a) * c.rx * r, c.cy + Math.sin(a) * c.ry * r, R('berry'))
        }
      }
      k.wall([[-w * 0.75, 0], [w * 0.75, 0]])
    },
  },
  {
    id: 'flowers',
    name: 'Flower patch',
    themes: ['nature', 'fantasy'],
    category: 'flora',
    tags: ['flowers', 'meadow', 'garden', 'color'],
    roles: {
      f1: { label: 'Flowers 1', color: 12 },
      f2: { label: 'Flowers 2', color: 14 },
      f3: { label: 'Flowers 3', color: 13 },
      stem: { label: 'Stems', color: 2 },
      bed: { label: 'Leaf bed', color: 2 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 3, max: 50, default: 16 },
      { key: 'depth', label: 'Depth', type: 'int', min: 2, max: 24, default: 6 },
      { key: 'count', label: 'Flowers', type: 'int', min: 3, max: 40, default: 10 },
      { key: 'colors', label: 'Colors', type: 'int', min: 1, max: 3, default: 2 },
      { key: 'bed', label: 'Leaf bed', type: 'bool', default: false },
    ],
    defaultPriority: 'rows',
    perspective: true,
    place: { x: 120, y: 140 },
    generate(k, p, rng) {
      const w = p.n('width')
      const d = p.n('depth')
      const cy = -d
      if (p.b('bed')) k.blob(0, cy, w + 1.5, d + 1, rng, R('bed'), undefined, 12, 0.16)
      const cols = ['f1', 'f2', 'f3'].slice(0, p.n('colors'))
      const count = p.n('count')
      // flowers sit on a staggered grid (tightened if the patch is too small for the count)
      const e = 1 / k.sc
      let cells: LP[] = []
      for (let f = 1; f >= 0.55; f -= 0.15) {
        cells = []
        const dx = 5 * f * e
        const dy = 3 * f * e
        let row = 0
        for (let y = cy - d + dy * 0.5; y <= cy + d - 1 * e; y += dy, row++) {
          for (let x = -w + (row % 2 ? dx / 2 : 0); x <= w - 1 * e; x += dx) {
            if ((x / w) ** 2 + ((y - cy) / d) ** 2 <= 0.9) cells.push([x, y])
          }
        }
        if (cells.length >= count) break
      }
      if (!cells.length) cells.push([0, cy])
      for (let i = cells.length - 1; i > 0; i--) {
        const j = rng.int(0, i)
        ;[cells[i], cells[j]] = [cells[j], cells[i]]
      }
      const pick = cells.slice(0, count).sort((a, b) => a[1] - b[1])
      for (const [cx0, y] of pick) {
        const x = cx0 + rng.range(-0.4, 0.4) * e
        // a 2x1 head on a short stem, now and then with a leaf
        k.vline(x, y + e, y + 2 * e, R('stem'))
        if (rng.chance(0.35)) k.dot(x + (rng.chance(0.5) ? -e : e), y + 2 * e, R('stem'))
        k.hline(x, x + e, y, R(rng.pick(cols)))
      }
    },
  },
  {
    id: 'reeds',
    name: 'Reeds and cattails',
    themes: ['nature', 'spooky'],
    category: 'flora',
    tags: ['reeds', 'cattails', 'rushes', 'marsh', 'pond', 'swamp'],
    roles: {
      leaf: { label: 'Reeds', color: 2 },
      leafLight: { label: 'Dry reeds', color: 6 },
      head: { label: 'Cattail heads', color: 6 },
    },
    params: [
      { key: 'count', label: 'Stems', type: 'int', min: 3, max: 30, default: 14 },
      { key: 'height', label: 'Height', type: 'int', min: 6, max: 50, default: 26 },
      { key: 'spread', label: 'Spread', type: 'int', min: 2, max: 40, default: 9 },
      { key: 'cattails', label: 'Cattails', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 60, y: 135 },
    generate(k, p, rng) {
      const h = p.n('height')
      const spread = p.n('spread')
      const stems = Array.from({ length: p.n('count') }, () => ({
        x: bell(rng) * spread,
        y: rng.range(-2, 0.5),
        h: h * rng.range(0.55, 1),
        lean: rng.range(-1, 1) * h * 0.06,
        blade: rng.chance(0.45),
        light: rng.chance(0.15),
      })).sort((a, b) => a.y - b.y)
      let heads = 0
      for (const s of stems) {
        const c = R(s.light ? 'leafLight' : 'leaf')
        if (s.blade) {
          const dir = s.x < 0 ? -1 : 1
          k.line([[s.x, s.y], [s.x + s.lean * 0.3 + dir * 0.5, s.y - s.h * 0.5], [s.x + s.lean + dir * 2.5, s.y - s.h * 0.75]], c)
          continue
        }
        const top: LP = [s.x + s.lean, s.y - s.h]
        k.line([[s.x, s.y], [s.x + s.lean * 0.3, s.y - s.h * 0.5], top], c)
        if (p.b('cattails') && (rng.chance(0.6) || heads === 0)) {
          heads++
          const hx = s.x + s.lean * 0.85
          const y0 = s.y - s.h * 0.92
          const y1 = s.y - s.h * 0.72
          k.vline(hx, y0, y1, R('head'))
          if (k.sc * h > 16) k.vline(hx + 1 / k.sc, y0 + 0.5, y1 - 0.5, R('head'))
        }
      }
    },
  },
  {
    id: 'stump-log',
    name: 'Stump or log',
    themes: ['nature', 'fantasy'],
    category: 'flora',
    tags: ['stump', 'log', 'wood', 'forest', 'fallen'],
    roles: {
      bark: { label: 'Bark', color: 6 },
      line: { label: 'Outline', color: 0 },
      cut: { label: 'Cut wood', color: 14 },
      ring: { label: 'Rings', color: 6 },
      moss: { label: 'Moss', color: 2 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'stump',
        options: [{ value: 'stump', label: 'Stump' }, { value: 'log', label: 'Fallen log' }],
      },
      { key: 'size', label: 'Thickness', type: 'int', min: 2, max: 16, default: 7 },
      { key: 'length', label: 'Log length', type: 'int', min: 10, max: 70, default: 30 },
      { key: 'moss', label: 'Moss', type: 'bool', default: false },
      { key: 'outline', label: 'Outlines', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 100, y: 135 },
    hasControl: true,
    generate(k, p, rng) {
      const r = p.n('size')
      const line = p.b('outline') ? R('line') : undefined
      const grain = line ?? R('ring')
      if (p.s('kind') === 'stump') {
        const hS = Math.max(3, r * 1.6)
        const ry = Math.max(1.5, r * 0.55)
        k.poly([[-r - 2, 0], [-r - 0.5, -1.5], [-r, -hS], [r, -hS], [r + 0.5, -1.5], [r + 2, 0], [r * 0.3, 0.5], [-r * 0.4, 0.5]], R('bark'), line ?? R('bark'))
        const lines = Math.max(1, Math.round(r / 2.5))
        for (let i = 0; i < lines; i++) {
          const x = -r + ((i + 0.5) * 2 * r) / lines + rng.range(-0.5, 0.5)
          k.line([[x, -hS + ry + 1], [x + rng.range(-0.6, 0.6), -1]], grain)
        }
        k.ellipse(0, -hS, r, ry, R('cut'), line ?? R('cut'))
        if (r * k.sc >= 3) k.outline(k.ellipsePts(0.3, -hS, r * 0.55, ry * 0.55, 10), R('ring'))
        k.dot(0.3, -hS, R('ring'))
        if (r * k.sc >= 4) k.line([[0.3, -hS], [r * 0.8, -hS + ry * 0.4]], R('ring'))
        if (p.b('moss')) k.blob(-r * 0.6, -1.5, r * 0.55, 1.8, rng, R('moss'), undefined, 5, 0.3)
        k.wall([[-r - 1, 0], [r + 1, 0]])
      } else {
        const rr = r
        const L = p.n('length') / 2
        const ex = Math.max(1, rr * 0.3)
        const body: Pt[] = [[L, -2 * rr], [-L, -2 * rr], ...k.ellipsePts(-L, -rr, ex, rr, 8, -Math.PI / 2, -Math.PI * 1.5).slice(1, -1), [-L, 0], [L, 0]]
        k.poly(body, R('bark'), line ?? R('bark'))
        const lines = Math.max(1, Math.round(rr / 2))
        for (let j = 0; j < lines; j++) {
          const y = (-2 * rr * (j + 1)) / (lines + 1)
          let x = -L + rng.range(0, 3)
          while (x < L - 3) {
            const len = rng.range(3, 9)
            k.hline(x, Math.min(L - 2, x + len), y + rng.range(-0.3, 0.3), grain)
            x += len + rng.range(2, 5)
          }
        }
        if (rr >= 3) {
          const sx = rng.range(-L * 0.5, L * 0.3)
          const sh = Math.max(2, rr * 0.6)
          k.poly([[sx, -2 * rr], [sx + 0.5, -2 * rr - sh], [sx + 2, -2 * rr - sh], [sx + 2.5, -2 * rr]], R('bark'), line ?? R('bark'))
        }
        k.ellipse(L, -rr, ex, rr, R('cut'), line ?? R('cut'))
        if (rr >= 3) k.outline(k.ellipsePts(L, -rr, ex * 0.5, rr * 0.55, 10), R('ring'))
        k.dot(L, -rr, R('ring'))
        if (p.b('moss')) k.blob(-L * 0.3, -2 * rr, L * 0.35, Math.max(1, rr * 0.35), rng, R('moss'), undefined, 6, 0.3)
        k.wall([[-L, 0], [L, 0]])
      }
    },
  },
]

export const flora: ElementDef[] = [
  {
    id: 'oak',
    name: 'Oak tree',
    themes: ['nature', 'fantasy'],
    category: 'flora',
    tags: ['tree', 'forest', 'leafy'],
    roles: {
      leaf: { label: 'Leaves', color: 2 },
      leafLight: { label: 'Highlight', color: 10 },
      line: { label: 'Outline', color: 0 },
      trunk: { label: 'Trunk', color: 6 },
      bark: { label: 'Bark lines', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 24, max: 110, default: 60 },
      { key: 'width', label: 'Canopy width', type: 'int', min: 8, max: 30, default: 15 },
      { key: 'trunk', label: 'Trunk width', type: 'int', min: 2, max: 8, default: 3 },
      { key: 'outline', label: 'Outlines', type: 'bool', default: true },
      { key: 'highlights', label: 'Highlights', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 40, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const h = p.n('height')
      const w = p.n('width')
      const tw = p.n('trunk')
      const line = p.b('outline') ? R('line') : undefined
      const trunkTop = -h * 0.42
      // trunk with flared roots
      k.poly(
        [[-tw - 2, 0], [-tw, -2], [-tw + 0.5, trunkTop], [tw - 0.5, trunkTop], [tw, -2], [tw + 2, 0]],
        R('trunk'),
        line ?? R('trunk'),
      )
      if (tw >= 3 && k.S(1) >= 1) {
        for (let i = 0; i < Math.floor(tw / 2); i++) {
          const x = rng.range(-tw + 1, tw - 1)
          const y0 = rng.range(trunkTop * 0.9, trunkTop * 0.4)
          k.line([[x, y0], [x + rng.range(-0.6, 0.6), y0 + rng.range(4, 9)]], R('bark'))
        }
      }
      // canopy: keep it roundish (never a flat pancake). A wide crown hangs
      // lower on the trunk; if it still can't be tall enough, it gets narrower.
      const top = -h
      const ry = clamp(w * 1.36, h * 0.325, h * 0.42)
      const rx = Math.min(w, ry / 1.36)
      const cy = top + ry
      const crown = k.blobPts(0, cy, rx, ry, rng, 9, 0.16)
      k.poly(crown, R('leaf'), line ?? R('leaf'))
      if (p.b('highlights')) {
        const n = rng.int(2, 3)
        for (let i = 0; i < n; i++) {
          const hx = rng.range(-rx * 0.45, rx * 0.15)
          const hy = rng.range(cy - ry * 0.55, cy - ry * 0.1)
          k.blob(hx, hy, rx * rng.range(0.2, 0.3), ry * rng.range(0.15, 0.24), rng, R('leafLight'), undefined, 5, 0.25)
        }
      }
      if (line) {
        // one or two short clump arcs in the lower half, then a clean closed outline
        if (rx * k.sc >= 6) {
          const arcs = rng.int(1, 2)
          for (let i = 0; i < arcs; i++) {
            const ax = (i === 0 ? -1 : 1) * rng.range(0.05, 0.35) * rx
            const ay = cy + ry * rng.range(0.15, 0.45)
            k.line(k.ellipsePts(ax, ay, rx * 0.25, ry * 0.12, 5, Math.PI * 0.15, Math.PI * 0.85), line)
          }
        }
        outlineSolid(k, crown, line, R('leaf'))
      }
      // AGI trees block at the base of the trunk
      k.wall([[-tw - 1, 0], [tw + 1, 0]])
    },
  },
  ...plants,
]
