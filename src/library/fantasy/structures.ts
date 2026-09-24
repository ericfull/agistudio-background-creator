import { R, clamp, lerp, type LP } from '../../kit/helpers'
import type { ElementDef } from '../types'
import {
  archPts,
  archTopAt,
  arcY,
  battlement,
  boards,
  cylinderCourses,
  cylinderPts,
  cylinderShadePts,
  lowerArc,
  merlonRanges,
  onePx,
  stones,
  upperArc,
  type Span,
} from './shared'

const STONE = {
  stone: { label: 'Stone', color: 7 },
  mortar: { label: 'Mortar', color: 8 },
  shade: { label: 'Shadow', color: 8 },
  line: { label: 'Outline', color: 0 },
}

/** Subtract holes from a single span. */
function subtract(base: Span, holes: Span[]): Span[] {
  let out: Span[] = [base]
  for (const [h0, h1] of holes) {
    const next: Span[] = []
    for (const [a, b] of out) {
      if (h1 <= a || h0 >= b) next.push([a, b])
      else {
        if (h0 > a) next.push([a, h0])
        if (h1 < b) next.push([h1, b])
      }
    }
    out = next
  }
  return out
}

export const structures: ElementDef[] = [
  // ------------------------------------------------------------------ castle wall
  {
    id: 'fantasy-castle-wall',
    name: 'Castle wall',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['castle', 'wall', 'battlement', 'crenellated', 'stone'],
    roles: { ...STONE, dark: { label: 'Arrow slits', color: 0 } },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 16, max: 160, default: 96 },
      { key: 'height', label: 'Height', type: 'int', min: 20, max: 100, default: 68 },
      { key: 'merlon', label: 'Merlon size', type: 'int', min: 3, max: 9, default: 5 },
      { key: 'slits', label: 'Arrow slits', type: 'int', min: 0, max: 6, default: 2 },
      { key: 'walk', label: 'Wall-walk shadow', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 104 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = p.n('width') / 2
      const H = p.n('height')
      const mw = p.n('merlon')
      const mh = Math.min(Math.round(mw * 1.5), H * 0.35)
      const walkY = -H + mh
      const px = onePx(k)
      const top = battlement(-hw, hw, walkY, mw, mh, rng)
      k.poly([[-hw, 0], ...top, [hw, 0]], R('stone'), R('line'))
      let body = walkY
      if (p.b('walk') && H - mh > 8) {
        k.rect(-hw + px, walkY + px, hw - px, walkY + 2, R('shade'))
        body = walkY + 2
      }
      stones(k, rng, -hw, body, hw, 0, R('mortar'), { rowH: 5, minW: 6, maxW: 12 })
      // a course across each merlon
      for (const [a, b] of merlonRanges(top, walkY - mh)) {
        if (mh >= 5) k.hline(a + px, b - px, walkY - mh / 2, R('mortar'))
        k.vline(b - px, walkY - mh + px, walkY, R('shade'))
      }
      const n = p.n('slits')
      const sy = walkY + 5
      if (n > 0 && -sy > 11) {
        for (let i = 0; i < n; i++) {
          const x = lerp(-hw, hw, (i + 0.5) / n) + rng.range(-1, 1)
          k.rect(x, sy, x + 1, sy + 8, R('dark'))
        }
      }
      k.wall([[-hw, 0], [hw, 0]])
    },
  },

  // ------------------------------------------------------------------ castle tower
  {
    id: 'fantasy-castle-tower',
    name: 'Castle tower',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['castle', 'tower', 'turret', 'round', 'stone'],
    roles: {
      ...STONE,
      roof: { label: 'Roof', color: 1 },
      roofShade: { label: 'Roof lines', color: 0 },
      dark: { label: 'Windows', color: 0 },
      flag: { label: 'Pennant', color: 4 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 30, max: 120, default: 66 },
      { key: 'radius', label: 'Radius', type: 'int', min: 7, max: 24, default: 12 },
      {
        key: 'top', label: 'Top', type: 'select', default: 'cone',
        options: [{ value: 'cone', label: 'Conical roof' }, { value: 'crenel', label: 'Battlements' }],
      },
      { key: 'windows', label: 'Slit windows', type: 'int', min: 0, max: 5, default: 3 },
      { key: 'flag', label: 'Pennant', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 116 },
    hasControl: true,
    generate(k, p, rng) {
      const H = p.n('height')
      const r = p.n('radius')
      const px = onePx(k)
      const e = Math.max(1.5, r * 0.3)
      const line = R('line')
      k.poly(cylinderPts(k, r, -H, e), R('stone'), line)
      k.poly(cylinderShadePts(k, r, -H + px, e, 0.5), R('shade'))
      cylinderCourses(k, rng, r, -H, e, R('mortar'), 6)
      // slit windows, stacked up the tower
      const nw = p.n('windows')
      const wy0 = -H + 10
      const wy1 = -14
      for (let i = 0; i < nw && wy1 - wy0 > 8; i++) {
        const y = nw === 1 ? (wy0 + wy1) / 2 : lerp(wy0, wy1, i / (nw - 1))
        const x = rng.range(-r * 0.3, r * 0.15)
        k.rect(x, y - 8, x + 1, y, R('dark'), line)
      }
      let peak = -H
      if (p.s('top') === 'cone') {
        const R2 = r + 2
        const e2 = e + 1
        const ch = r * 2.4 + 6
        const apex: LP = [0, -H - ch]
        k.poly([apex, ...lowerArc(k, 0, -H, R2, e2)], R('roof'), line)
        // shingle rows around the cone
        for (const f of [0.35, 0.6, 0.82]) {
          k.line(k.ellipsePts(0, -H - ch * (1 - f), R2 * f, e2 * f, undefined, 0.15, Math.PI - 0.15), R('roofShade'))
        }
        k.line([apex, [R2 * 0.55, -H + e2 * 0.83]], R('roofShade'))
        peak = apex[1]
      } else {
        const R2 = r + 1.5
        const ph = 6
        const mh = 4
        const tw = battlement(-R2, R2, -H - ph, Math.max(2.5, R2 / 3.4), mh, rng)
        k.poly([...tw, [R2, -H], ...lowerArc(k, 0, -H, R2, e).slice(1, -1), [-R2, -H]], R('stone'), line)
        for (const [, b] of merlonRanges(tw, -H - ph - mh)) k.vline(b - px, -H - ph - mh + px, -H - ph, R('shade'))
        k.line(k.ellipsePts(0, -H - ph / 2, R2 - px, e, undefined, 0.2, Math.PI - 0.2), R('mortar'))
        // corbels under the parapet
        for (let x = -R2 + 2; x < R2 - 1; x += 3) {
          const y = -H + arcY(x, R2, e)
          k.vline(x, y + px, y + 2, line)
        }
        peak = -H - ph - mh
      }
      if (p.b('flag')) {
        const top = peak - 8
        k.vline(0, peak, top, line)
        k.poly([[px, top], [6, top + 1.5], [px, top + 3]], R('flag'))
      }
      k.wall(lowerArc(k, 0, -e, r, e))
    },
  },

  // ------------------------------------------------------------------ castle gate
  {
    id: 'fantasy-castle-gate',
    name: 'Castle gate',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['castle', 'gate', 'gatehouse', 'portcullis', 'drawbridge', 'entrance', 'exit'],
    roles: {
      ...STONE,
      dark: { label: 'Gateway', color: 0 },
      iron: { label: 'Portcullis', color: 8 },
      wood: { label: 'Drawbridge', color: 6 },
      grain: { label: 'Planks', color: 0 },
      chain: { label: 'Chains', color: 8 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 40, max: 130, default: 72 },
      { key: 'height', label: 'Height', type: 'int', min: 52, max: 100, default: 76 },
      {
        key: 'portcullis', label: 'Portcullis', type: 'select', default: 'up',
        options: [{ value: 'up', label: 'Raised' }, { value: 'half', label: 'Half down' }, { value: 'down', label: 'Lowered' }],
      },
      {
        key: 'bridge', label: 'Drawbridge', type: 'select', default: 'down',
        options: [{ value: 'none', label: 'None' }, { value: 'down', label: 'Lowered' }, { value: 'up', label: 'Raised' }],
      },
      { key: 'towers', label: 'Flanking towers', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 104 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const hw = w / 2
      const H = p.n('height')
      const px = onePx(k)
      const line = R('line')
      const ohw = clamp(w * 0.16, 7, 12)
      // tall enough for an unscaled character (~35 rows) to walk through
      const oh = clamp(H * 0.6, 38, 48)
      const port = p.s('portcullis')
      const bridge = p.s('bridge')
      const towers = p.b('towers')
      const tw = clamp(w * 0.12, 5, 10)
      const L = clamp(H * 0.4, 12, 24)
      const d0 = ohw + 1
      const d1 = ohw + 4

      // lowered drawbridge lies flat on the ground in front
      if (bridge === 'down') {
        k.withPriority('rows', () => {
          k.poly([[-d0, 0], [d0, 0], [d1, L], [-d1, L]], R('wood'), line)
          for (let y = 3; y < L - px; y += 3) {
            const hx = lerp(d0, d1, y / L)
            k.hline(-hx + px, hx - px, y, R('grain'))
          }
        })
      }

      // gatehouse body
      const mh = 6
      const walkY = -H + mh
      const top = battlement(-hw, hw, walkY, 4, mh, rng)
      k.poly([[-hw, 0], ...top, [hw, 0]], R('stone'), line)
      if (H - mh > 10) k.rect(-hw + px, walkY + px, hw - px, walkY + 2, R('shade'))
      stones(k, rng, -hw, walkY + 2, hw, 0, R('mortar'), { rowH: 5, minW: 6, maxW: 11 })
      for (const [, b] of merlonRanges(top, walkY - mh)) k.vline(b - px, walkY - mh + px, walkY, R('shade'))

      // arch ring with voussoirs, then the dark gateway
      const ring = 3
      k.poly(archPts(k, -ohw - ring, ohw + ring, -oh - ring, 0, true), R('stone'), line)
      const ry = Math.min(ohw * 1.7, oh * 0.5)
      const ry2 = Math.min((ohw + ring) * 1.7, (oh + ring) * 0.5)
      const cyI = -oh + ry
      const cyO = -oh - ring + ry2
      for (let i = 1; i < 7; i++) {
        const a = Math.PI + (Math.PI * i) / 7
        k.line([[Math.cos(a) * ohw, cyI + Math.sin(a) * ry], [Math.cos(a) * (ohw + ring), cyO + Math.sin(a) * ry2]], R('mortar'))
      }
      for (let y = cyI + 5; y < -2; y += 6) {
        k.hline(-ohw - ring + px, -ohw - px, y, R('mortar'))
        k.hline(ohw + px, ohw + ring - px, y, R('mortar'))
      }
      k.poly(archPts(k, -ohw, ohw, -oh, 0, true), R('dark'), line)

      // portcullis grid
      const pb = port === 'up' ? -oh + 5 : port === 'half' ? -oh * 0.45 : -1
      const halfAt = (y: number) => (y >= cyI ? ohw : ohw * Math.sqrt(Math.max(0, 1 - ((cyI - y) / ry) ** 2)))
      for (let x = -ohw + 2; x < ohw - px; x += 3) {
        const t = archTopAt(x, -ohw, ohw, -oh, 0, true) + px
        if (pb + 1.5 > t) k.vline(x, t, Math.min(pb + 1.5, -px), R('iron'))
      }
      for (let y = -oh + 3; y <= pb - 1; y += 5) {
        const h = halfAt(y) - px
        if (h > 1) k.hline(-h, h, y, R('iron'))
      }
      if (port !== 'up') k.hline(-halfAt(pb) + px, halfAt(pb) - px, pb, R('iron'))

      // raised drawbridge closes the gateway
      if (bridge === 'up') {
        const b = ohw + 1.5
        k.rect(-b, -oh - 1, b, 0, R('wood'), line)
        boards(k, rng, -b, -oh - 1, b, 0, R('grain'), 3, 0)
        k.hline(-b + px, b - px, -oh * 0.35, R('chain'))
        k.line([[-b + 1, -oh], [-ohw - ring - 2, -oh - ring - 3]], R('chain'))
        k.line([[b - 1, -oh], [ohw + ring + 2, -oh - ring - 3]], R('chain'))
      }

      // flanking towers
      if (towers) {
        for (const s of [-1, 1]) {
          const cx = s * hw
          const th = H + 10
          const tmh = 5
          const ttop = battlement(cx - tw, cx + tw, -th + tmh, 3, tmh, rng)
          k.poly([[cx - tw, 0], ...ttop, [cx + tw, 0]], R('stone'), line)
          k.rect(cx + tw * 0.45, -th + tmh + px, cx + tw - px, -px, R('shade'))
          stones(k, rng, cx - tw, -th + tmh, cx + tw * 0.45, 0, R('mortar'), { rowH: 5, minW: 5, maxW: 9 })
          k.rect(cx - 1, -th + 13, cx, -th + 19, R('dark'), line)
        }
      }

      // chains of the lowered bridge
      if (bridge === 'down') {
        for (const s of [-1, 1]) {
          const hx = s * (ohw + ring + 2)
          const hy = -oh - ring - 3
          k.dot(hx, hy, R('dark'))
          k.line([[hx, hy], [s * (d1 - 0.5), L - 1]], R('chain'))
        }
      }

      // control. The lowered bridge is walkable over a moat drawn by an earlier
      // layer; clear it first so the threshold trigger and walls land on top.
      // (Cleared pixels take the gate's 'baseline' depth, behind anyone on the deck.)
      if (bridge === 'down') k.clearControl([[-d0, 0], [d0, 0], [d1, L], [-d1, L]])
      const ex = hw + (towers ? tw : 0)
      k.wall([[-ex, 0], [-ohw, 0]])
      k.wall([[ohw, 0], [ex, 0]])
      // trigger on the threshold whatever the gate's state; game logic decides if it opens
      k.trigger([[-ohw + 1, 0], [ohw - 1, 0]])
      if (bridge === 'down') {
        k.wall([[-d0, 1], [-d1, L]])
        k.wall([[d0, 1], [d1, L]])
      }
    },
  },

  // ------------------------------------------------------------------ cottage
  {
    id: 'fantasy-cottage',
    name: 'Cottage',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['house', 'cottage', 'home', 'village', 'thatch', 'door', 'entrance'],
    roles: {
      wall: { label: 'Walls', color: 15 },
      timber: { label: 'Timber', color: 6 },
      line: { label: 'Outline', color: 0 },
      thatch: { label: 'Thatch', color: 14 },
      thatchLine: { label: 'Thatch lines', color: 6 },
      shingle: { label: 'Shingles', color: 4 },
      shingleLine: { label: 'Shingle lines', color: 0 },
      door: { label: 'Door', color: 6 },
      glass: { label: 'Windows', color: 0 },
      light: { label: 'Lit windows', color: 14 },
      chimney: { label: 'Chimney', color: 7 },
      mortar: { label: 'Chimney mortar', color: 8 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 40, max: 120, default: 72 },
      { key: 'height', label: 'Wall height', type: 'int', min: 42, max: 60, default: 48 },
      {
        key: 'roof', label: 'Roof', type: 'select', default: 'thatch',
        options: [{ value: 'thatch', label: 'Thatch' }, { value: 'shingle', label: 'Shingles' }],
      },
      {
        key: 'door', label: 'Door', type: 'select', default: 'center',
        options: [{ value: 'left', label: 'Left' }, { value: 'center', label: 'Center' }, { value: 'right', label: 'Right' }],
      },
      { key: 'chimney', label: 'Chimney', type: 'bool', default: true },
      { key: 'lit', label: 'Lit windows', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 124 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const hw = w / 2
      const H = p.n('height')
      const px = onePx(k)
      const line = R('line')
      const ov = 3
      const rh = clamp(w * 0.46, 18, 36)
      const eave = -H + 3
      const ridge = eave - rh
      const inset = Math.min(rh * 0.9, hw + ov - 2)
      const thatch = p.s('roof') === 'thatch'

      // chimney first so the roof covers its foot
      const cx = Math.min(hw * 0.5, hw + ov - inset - 4)
      if (p.b('chimney')) {
        const cy0 = ridge - 9
        k.rect(cx - 3, cy0, cx + 3, eave - rh * 0.4, R('chimney'), line)
        stones(k, rng, cx - 3, cy0 + 2, cx + 3, eave - rh * 0.4, R('mortar'), { rowH: 3, minW: 3, maxW: 4 })
        k.rect(cx - 4, cy0 - 1, cx + 4, cy0 + 1, R('chimney'), line)
      }

      // walls with a half-timber frame
      k.rect(-hw, -H, hw, 0, R('wall'), line)
      k.rect(-hw, -H, -hw + 2, 0, R('timber'), line)
      k.rect(hw - 2, -H, hw, 0, R('timber'), line)
      k.rect(-hw, -3, hw, 0, R('timber'), line)

      // door
      const pos = p.s('door')
      const dx = pos === 'center' ? 0 : (pos === 'left' ? -1 : 1) * Math.max(0, hw - 13)
      const dhw = 6
      const dh = Math.min(H - 4, 40)
      k.rect(dx - dhw - 1, -dh - 1, dx + dhw + 1, 0, R('timber'), line)
      k.rect(dx - dhw + 1, -dh + 1, dx + dhw - 1, 0, R('door'), line)
      boards(k, rng, dx - dhw + 1, -dh + 1, dx + dhw - 1, 0, line, 3, 0)
      k.hline(dx - dhw + 1, dx + dhw - 1, -dh * 0.3, line)
      k.hline(dx - dhw + 1, dx + dhw - 1, -dh * 0.75, line)
      k.rect(dx + dhw - 4, -dh * 0.5 - 1, dx + dhw - 3, -dh * 0.5 + 1, R('light'))

      // windows either side of the door
      const glass = p.b('lit') ? R('light') : R('glass')
      const wy0 = -H + 9
      const wy1 = Math.min(wy0 + 12, -8)
      const sections: Span[] = [[-hw + 3, dx - dhw - 3], [dx + dhw + 3, hw - 3]]
      for (const [a, b] of sections) {
        const room = b - a
        if (room < 11) continue
        const count = room > 34 ? 2 : 1
        for (let i = 0; i < count; i++) {
          const wx = a + (room * (i + 0.5)) / count
          k.rect(wx - 5, wy0 - 1, wx + 5, wy1 + 1, R('timber'), line)
          k.rect(wx - 4, wy0, wx + 4, wy1, glass, line)
          k.vline(wx, wy0, wy1, R('timber'))
          k.hline(wx - 4, wx + 4, (wy0 + wy1) / 2, R('timber'))
        }
      }

      // roof
      const roofL = (y: number) => lerp(-hw - ov + inset, -hw - ov, (y - ridge) / (eave - ridge))
      const roofR = (y: number) => -roofL(y)
      if (thatch) {
        const hem: LP[] = []
        const n = Math.max(4, Math.round(w / 5))
        for (let i = n; i >= 0; i--) hem.push([lerp(-hw - ov, hw + ov, i / n), eave + (i % 2 ? rng.range(0.8, 1.8) : 0)])
        k.poly([[-hw - ov + inset, ridge], [hw + ov - inset, ridge], ...hem], R('thatch'), line)
        // a few courses of straw across the roof, and strokes along the eaves
        const courses = rh > 24 ? 3 : 2
        for (let c = 1; c <= courses; c++) {
          const y = lerp(ridge, eave, c / (courses + 1))
          k.hline(roofL(y) + 2, roofR(y) - 2, y, R('thatchLine'))
        }
        for (let x = -hw - ov + 3 + rng.range(0, 3); x < hw + ov - 3; x += rng.range(6, 9)) k.vline(x, eave - 3, eave - px, R('thatchLine'))
      } else {
        k.poly([[-hw - ov, eave], [-hw - ov + inset, ridge], [hw + ov - inset, ridge], [hw + ov, eave]], R('shingle'), line)
        stones(k, rng, -hw - ov, ridge, hw + ov, eave, R('shingleLine'), {
          rowH: 3, minW: 3, maxW: 5, spans: (y) => [[roofL(y), roofR(y)]],
        })
      }

      k.wall([[-hw, 0], [dx - dhw, 0]])
      k.wall([[dx + dhw, 0], [hw, 0]])
      k.trigger([[dx - dhw + 1, 0], [dx + dhw - 1, 0]])
    },
  },

  // ------------------------------------------------------------------ thatched hut
  {
    id: 'fantasy-hut',
    name: 'Thatched hut',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['hut', 'round', 'thatch', 'peasant', 'village', 'entrance'],
    roles: {
      wall: { label: 'Walls', color: 6 },
      wallShade: { label: 'Wall shade', color: 8 },
      daub: { label: 'Wall marks', color: 0 },
      thatch: { label: 'Thatch', color: 14 },
      thatchLine: { label: 'Thatch lines', color: 6 },
      dark: { label: 'Doorway', color: 0 },
      frame: { label: 'Door frame', color: 6 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 20, max: 64, default: 36 },
      { key: 'height', label: 'Wall height', type: 'int', min: 39, max: 52, default: 40 },
      { key: 'roof', label: 'Roof height', type: 'int', min: 12, max: 48, default: 28 },
      { key: 'door', label: 'Doorway', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 124 },
    hasControl: true,
    generate(k, p, rng) {
      const r = p.n('width') / 2
      const H = p.n('height')
      const rh = p.n('roof')
      const e = Math.max(1.5, r * 0.3)
      const px = onePx(k)
      const line = R('line')
      k.poly(cylinderPts(k, r, -H, e), R('wall'), line)
      k.poly(cylinderShadePts(k, r, -H + px, e, 0.62), R('wallShade'))
      for (let i = 0; i < Math.round((r * H) / 60); i++) {
        const x = rng.range(-r + 2, r * 0.3)
        const y = rng.range(-H + 4, -3)
        k.hline(x, x + rng.range(1.5, 3), y, R('daub'))
      }
      const door = p.b('door')
      const dhw = Math.min(5, r * 0.4)
      if (door) {
        const dh = Math.min(H - 3, 40)
        const f = dhw + 1.5
        const yb = (x: number) => -e + arcY(x, r, e)
        k.poly([[-f, yb(f)], [-f, -dh - 1], [f, -dh - 1], [f, yb(f)], [0, 0]], R('frame'), line)
        k.poly([[-dhw, yb(dhw)], [-dhw, -dh + 1], [dhw, -dh + 1], [dhw, yb(dhw)], [0, 0]], R('dark'), line)
      }
      // conical thatch roof with a ragged hem
      const R2 = r + 3
      const e2 = e + 1
      const apex: LP = [rng.range(-0.8, 0.8), -H - rh]
      const hem = lowerArc(k, 0, -H + 1, R2, e2).map(([x, y], i) => [x, y + (i % 2 ? rng.range(0.6, 1.8) : 0)] as LP)
      k.poly([apex, ...hem], R('thatch'), line)
      // two courses of straw around the cone, and strokes along the eaves
      for (const f of [0.42, 0.72]) {
        k.line(k.ellipsePts(apex[0] * (1 - f), -H + 1 - rh * (1 - f), R2 * f - px, e2 * f, undefined, 0.15, Math.PI - 0.15), R('thatchLine'))
      }
      for (let a = rng.range(0.12, 0.2) * Math.PI; a < Math.PI * 0.9; a += rng.range(0.13, 0.18) * Math.PI) {
        const x = Math.cos(a) * (R2 - 1.5)
        const y = -H + 1 + Math.sin(a) * e2 * 0.9
        k.vline(x, y - 3, y - px, R('thatchLine'))
      }
      // top-knot
      k.line([[apex[0] - 1, apex[1] - 2], [apex[0], apex[1]], [apex[0] + 1, apex[1] - 2]], R('thatchLine'))
      const base = lowerArc(k, 0, -e, r, e)
      if (door) {
        const yb = -e + arcY(dhw, r, e)
        k.wall([...base.filter(([x]) => x > dhw), [dhw, yb]])
        k.wall([[-dhw, yb], ...base.filter(([x]) => x < -dhw)])
        k.trigger([[-dhw + 1, yb], [0, 0], [dhw - 1, yb]])
      } else k.wall(base)
    },
  },

  // ------------------------------------------------------------------ well
  {
    id: 'fantasy-well',
    name: 'Stone well',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['well', 'water', 'village', 'bucket', 'stone'],
    roles: {
      ...STONE,
      dark: { label: 'Well shaft', color: 0 },
      wood: { label: 'Wood', color: 6 },
      roof: { label: 'Roof', color: 4 },
      rope: { label: 'Rope', color: 6 },
    },
    params: [
      { key: 'radius', label: 'Radius', type: 'int', min: 6, max: 18, default: 10 },
      {
        key: 'roof', label: 'Top', type: 'select', default: 'roof',
        options: [{ value: 'roof', label: 'Little roof' }, { value: 'beam', label: 'Winch beam' }, { value: 'none', label: 'Open' }],
      },
      { key: 'bucket', label: 'Bucket', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 128 },
    hasControl: true,
    generate(k, p, rng) {
      const r = p.n('radius')
      const px = onePx(k)
      const line = R('line')
      const h = clamp(r * 1.2, 9, 16)
      const e = r * 0.42
      const kind = p.s('roof')
      const postTop = -h - 16 - r * 0.6
      const posts = kind !== 'none'
      // back posts are hidden by the rim; draw the stone ring first
      k.poly(cylinderPts(k, r, -h, e), R('stone'), line)
      k.poly(cylinderShadePts(k, r, -h + px, e, 0.5), R('shade'))
      cylinderCourses(k, rng, r, -h, e, R('mortar'), 4)
      k.ellipse(0, -h, r, e, R('stone'), line)
      k.ellipse(0, -h, r - 2.5, Math.max(1, e - 1.6), R('dark'))
      if (posts) {
        for (const s of [-1, 1]) k.rect(s * (r - 1) - 1, postTop, s * (r - 1) + 1, -h + 1, R('wood'), line)
        k.rect(-r + 1, postTop + 3, r - 1, postTop + 5, R('wood'), line)
        // winch handle
        k.line([[r, postTop + 4], [r + 3, postTop + 4], [r + 3, postTop + 8]], line)
      }
      if (kind === 'roof') {
        const rh = 7 + r * 0.3
        const ry = postTop + 1
        k.poly([[-r - 4, ry + 1], [0, ry - rh], [r + 4, ry + 1]], R('roof'), line)
        const gh = rh - 3
        k.poly([[-r + 1, ry], [0, ry - gh], [r - 1, ry]], R('wood'), line)
        for (let x = -r + 4; x < r - 3; x += 3) {
          const yTop = ry - gh * (1 - Math.abs(x) / (r - 1))
          if (ry - yTop > 2 * px) k.vline(x, yTop + px * 1.2, ry - px, line)
        }
      }
      if (p.b('bucket')) {
        if (posts) {
          const by = -h - 4
          k.vline(0, postTop + 5, by - 7, R('rope'))
          k.line([[-2, by - 5], [0, by - 7], [2, by - 5]], line)
          k.poly([[-2.5, by - 5], [2.5, by - 5], [2, by], [-2, by]], R('wood'), line)
          k.hline(-2.2, 2.2, by - 2.5, line)
        } else {
          const bx = r * 0.5
          const bb = -h + e * 0.5
          k.line([[bx - 2, bb - 5], [bx, bb - 7], [bx + 2, bb - 5]], line)
          k.poly([[bx - 2.5, bb - 5], [bx + 2.5, bb - 5], [bx + 2, bb], [bx - 2, bb]], R('wood'), line)
          k.hline(bx - 2.2, bx + 2.2, bb - 2.5, line)
        }
      }
      k.wall(lowerArc(k, 0, -e, r, e))
    },
  },

  // ------------------------------------------------------------------ stone arch bridge
  {
    id: 'fantasy-bridge',
    name: 'Stone arch bridge',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['bridge', 'arch', 'river', 'crossing', 'stone'],
    roles: {
      ...STONE,
      deck: { label: 'Deck', color: 8 },
      deckLine: { label: 'Deck stones', color: 7 },
      under: { label: 'Under the arch', color: 0 },
      water: { label: 'Water', color: 1 },
      ripple: { label: 'Ripples', color: 9 },
    },
    params: [
      { key: 'width', label: 'Span', type: 'int', min: 36, max: 150, default: 90 },
      { key: 'height', label: 'Height', type: 'int', min: 8, max: 40, default: 18 },
      { key: 'arches', label: 'Arches', type: 'int', min: 1, max: 3, default: 1 },
      { key: 'deck', label: 'Deck depth', type: 'int', min: 5, max: 18, default: 10 },
      { key: 'parapet', label: 'Parapets', type: 'bool', default: true },
      { key: 'water', label: 'Water under arches', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: true,
    place: { x: 80, y: 124 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const hw = w / 2
      const H = p.n('height')
      const D = p.n('deck')
      const n = p.n('arches')
      const par = p.b('parapet')
      const px = onePx(k)
      const line = R('line')
      const P = 4
      const wing = 3

      // Layer default is 'rows': the walkable deck, the far parapet and the
      // water under the arches lie flat. Upright parts say 'baseline'.
      k.rect(-hw, -H - D, hw, -H, R('deck'), line)
      for (let y = -H - D + 2; y < -H - 1; y += 2.5) {
        for (let x = -hw + rng.range(1, 5); x < hw - 3; x += rng.range(5, 9)) k.hline(x, x + rng.range(1, 2.5), y, R('deckLine'))
      }
      if (par) {
        k.rect(-hw, -H - D - P, hw, -H - D, R('stone'), line)
        stones(k, rng, -hw, -H - D - P, hw, -H - D, R('mortar'), { rowH: P, minW: 5, maxW: 9 })
      }

      // face with arches cut out (the river shows through)
      const pier = Math.max(4, w * 0.07)
      const ab = pier * 1.4
      const span = (w - 2 * ab - (n - 1) * pier) / n
      const rise = Math.max(3, Math.min(H - 3, span * 0.55))
      const arches = Array.from({ length: n }, (_, i) => {
        const x0 = -hw + ab + i * (span + pier)
        return { cx: x0 + span / 2, rx: span / 2 }
      })
      const ringW = 2.5
      k.withPriority('baseline', () => {
        const pts: LP[] = [[-hw - wing, 0], [-hw, -H], [hw, -H], [hw + wing, 0]]
        for (let i = n - 1; i >= 0; i--) {
          const a = arches[i]
          pts.push(...k.ellipsePts(a.cx, 0, a.rx, rise, undefined, 0, -Math.PI).map(([x, y]) => [x, y] as LP))
        }
        k.poly(pts, R('stone'), line)
        const spans = (y: number): Span[] => {
          const edge = hw + wing * (1 + y / H)
          const holes: Span[] = []
          for (const a of arches) {
            const ry = rise + ringW
            if (-y < ry) {
              const half = (a.rx + ringW) * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2))
              holes.push([a.cx - half, a.cx + half])
            }
          }
          return subtract([-edge, edge], holes)
        }
        stones(k, rng, -hw - wing, -H, hw + wing, 0, R('mortar'), { rowH: 4, minW: 5, maxW: 9, spans })
        for (const a of arches) {
          k.line(k.ellipsePts(a.cx, 0, a.rx + ringW, rise + ringW, undefined, -0.05, -Math.PI + 0.05), R('mortar'))
          const m = Math.max(4, Math.round(a.rx / 2.2))
          for (let i = 1; i < m; i++) {
            const t = -Math.PI * (i / m)
            k.line([[a.cx + Math.cos(t) * a.rx, Math.sin(t) * rise], [a.cx + Math.cos(t) * (a.rx + ringW), Math.sin(t) * (rise + ringW)]], R('mortar'))
          }
          if (p.b('water')) {
            // dark vault above the waterline
            k.poly(k.ellipsePts(a.cx, 0, a.rx - px, rise - px, undefined, 0, -Math.PI).map(([x, y]) => [x, y] as LP), R('under'))
          } else {
            k.line(k.ellipsePts(a.cx, 0, a.rx - px, rise - px, undefined, -0.5, -Math.PI + 0.5), R('shade'))
          }
        }
      })
      if (p.b('water')) {
        for (const a of arches) {
          const wl = -clamp(rise * 0.35, 2, 10)
          const half = (a.rx - px) * Math.sqrt(Math.max(0, 1 - (wl / rise) ** 2))
          k.poly([[a.cx - half, wl], [a.cx + half, wl], [a.cx + a.rx - px, 0], [a.cx - a.rx + px, 0]], R('water'))
          for (let y = wl + 2; y < -px; y += 2) {
            const hh = lerp(half, a.rx, (y - wl) / -wl)
            for (let x = a.cx - hh + rng.range(0.5, 3); x < a.cx + hh - 2; x += rng.range(4, 7)) k.hline(x, x + 1.5, y, R('ripple'))
          }
          k.water([[a.cx - half, wl], [a.cx + half, wl], [a.cx + a.rx, 0], [a.cx - a.rx, 0]])
        }
      }

      // The deck is walkable even over a river drawn by an earlier layer.
      // Clear pixels take the layer's default depth ('rows'), which suits a floor.
      const front = par ? -H - P : -H
      k.clearControl([[-hw, -H - D], [hw, -H - D], [hw, front], [-hw, front]])

      // near parapet: walkers keep their feet on the deck behind it
      k.withPriority('baseline', () => {
        if (par) {
          k.rect(-hw - 1, -H - P, hw + 1, -H, R('stone'), line)
          stones(k, rng, -hw - 1, -H - P, hw + 1, -H, R('mortar'), { rowH: P, minW: 5, maxW: 9 })
        } else k.hline(-hw, hw, -H, line)
      })

      k.wall([[-hw, -H - D], [hw, -H - D]])
      k.wall([[-hw, front], [hw, front]])
    },
  },

  // ------------------------------------------------------------------ wooden fence
  {
    id: 'fantasy-fence',
    name: 'Wooden fence',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['fence', 'rail', 'picket', 'farm', 'village'],
    roles: { wood: { label: 'Wood', color: 6 }, line: { label: 'Outline', color: 0 } },
    params: [
      { key: 'length', label: 'Length', type: 'int', min: 10, max: 160, default: 60 },
      { key: 'height', label: 'Height', type: 'int', min: 6, max: 24, default: 13 },
      { key: 'rails', label: 'Rails', type: 'int', min: 1, max: 3, default: 2 },
      { key: 'gap', label: 'Post spacing', type: 'int', min: 5, max: 16, default: 10 },
      {
        key: 'style', label: 'Style', type: 'select', default: 'rail',
        options: [{ value: 'rail', label: 'Post and rail' }, { value: 'picket', label: 'Pickets' }],
      },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 132 },
    hasControl: true,
    generate(k, p, rng) {
      const hl = p.n('length') / 2
      const H = p.n('height')
      const nr = p.n('rails')
      const line = R('line')
      const wood = R('wood')
      const railY = (j: number) => -H * (nr === 1 ? 0.62 : lerp(0.3, 0.82, j / (nr - 1)))
      const rails = () => {
        for (let j = 0; j < nr; j++) {
          const y = railY(j)
          k.rect(-hl, y - 1, hl, y + 1, wood, line)
        }
      }
      if (p.s('style') === 'picket') {
        rails()
        const step = 5
        const n = Math.max(1, Math.round((hl * 2 - 3) / step))
        for (let i = 0; i <= n; i++) {
          const x = lerp(-hl + 1.5, hl - 1.5, i / n)
          const t = -H - rng.range(0, 1)
          k.poly([[x - 1.5, 0], [x - 1.5, t + 2], [x, t], [x + 1.5, t + 2], [x + 1.5, 0]], wood, line)
        }
      } else {
        rails()
        const n = Math.max(1, Math.round((hl * 2) / p.n('gap')))
        for (let i = 0; i <= n; i++) {
          const x = lerp(-hl + 1, hl - 1, i / n) + (i > 0 && i < n ? rng.range(-0.8, 0.8) : 0)
          k.rect(x - 1, -H - 1 - rng.range(0, 1.5), x + 1, 0, wood, line)
        }
      }
      k.wall([[-hl, 0], [hl, 0]])
    },
  },

  // ------------------------------------------------------------------ signpost
  {
    id: 'fantasy-signpost',
    name: 'Signpost',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['sign', 'signpost', 'crossroads', 'arrow', 'direction'],
    roles: {
      wood: { label: 'Post', color: 6 },
      board: { label: 'Boards', color: 6 },
      text: { label: 'Lettering', color: 0 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 18, max: 46, default: 32 },
      { key: 'boards', label: 'Boards', type: 'int', min: 1, max: 3, default: 2 },
      {
        key: 'style', label: 'Boards', type: 'select', default: 'arrow',
        options: [{ value: 'arrow', label: 'Arrows' }, { value: 'plank', label: 'Plank sign' }],
      },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const H = p.n('height')
      const n = p.n('boards')
      const line = R('line')
      k.rect(-1, -H, 1, 0, R('wood'), line)
      const arrow = p.s('style') === 'arrow'
      for (let j = 0; j < n; j++) {
        const y0 = -H + 2 + j * 7
        if (y0 + 5 > -6) break
        const len = rng.int(11, 15)
        if (arrow) {
          const dir = j % 2 === 0 ? 1 : -1
          const a = -2 * dir
          const b = len * dir
          k.poly([[a, y0], [b, y0], [b + 3 * dir, y0 + 2.5], [b, y0 + 5], [a, y0 + 5]], R('board'), line)
          const t0 = dir > 0 ? 1.5 : -len + 1
          k.hline(t0, t0 + len * 0.35, y0 + 2.5, R('text'))
          k.hline(t0 + len * 0.5, t0 + len - 2.5, y0 + 2.5, R('text'))
        } else {
          const bw = len / 2 + 1
          k.rect(-bw, y0, bw, y0 + 6, R('board'), line)
          k.hline(-bw + 2, -1, y0 + 2, R('text'))
          k.hline(1, bw - 2, y0 + 2, R('text'))
          k.hline(-bw + 3, bw - 3, y0 + 4, R('text'))
        }
      }
      k.wall([[-2, 0], [2, 0]])
    },
  },

  // ------------------------------------------------------------------ cave mouth
  {
    id: 'fantasy-cave',
    name: 'Cave mouth',
    themes: ['fantasy'],
    category: 'rock',
    tags: ['cave', 'cavern', 'mouth', 'entrance', 'exit', 'rock', 'dragon'],
    roles: {
      rock: { label: 'Rock', color: 8 },
      rockLight: { label: 'Highlights', color: 7 },
      dark: { label: 'Opening', color: 0 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 30, max: 130, default: 64 },
      { key: 'height', label: 'Height', type: 'int', min: 40, max: 90, default: 48 },
      { key: 'mouth', label: 'Mouth width %', type: 'int', min: 25, max: 70, default: 40 },
      { key: 'boulders', label: 'Boulders', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 112 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = p.n('width') / 2
      const H = p.n('height')
      const line = R('line')
      const px = onePx(k)
      const mw = Math.max(5, (hw * 2 * p.n('mouth')) / 200)
      const mh = clamp(H - 6, 36, H * 0.9)
      // rock mass: steep sides, lumpy top
      const n = Math.max(10, Math.round(hw / 2.5))
      const prof: LP[] = []
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const f = 1 - Math.abs(2 * t - 1) ** 2.2
        const j = i === 0 || i === n ? 0 : rng.range(-0.1, 0.07)
        prof.push([lerp(-hw, hw, t) + (i % 2 ? rng.range(-1, 1) : 0), -H * clamp(f + j, 0, 1.05)])
      }
      k.poly([[-hw, 0], ...prof, [hw, 0]], R('rock'), line)
      // lit upper-left ledges
      const lit: LP[] = []
      for (let i = 1; i <= n * 0.55; i++) lit.push(prof[i])
      const back = lit.slice().reverse().map(([x, y]) => [x + 1.5, y + rng.range(3, 5)] as LP)
      if (lit.length > 2) k.poly([...lit, ...back], R('rockLight'))
      for (let i = 0; i < 3; i++) {
        const [x0, y0] = prof[rng.int(2, n - 2)]
        const pts: LP[] = [[x0, y0 + 1]]
        let x = x0
        let y = y0 + 1
        for (let s = 0; s < 3; s++) {
          x += rng.range(-2.5, 2.5)
          y += rng.range(2, 5)
          if (y > -2) break
          pts.push([x, y])
        }
        if (pts.length > 1) k.line(pts, line)
      }
      // the mouth: a lit rim, then darkness with hanging teeth
      const mouth = (grow: number): LP[] => {
        const arc = upperArc(k, 0, 0, mw + grow, mh + grow, 12)
        return [[-mw - grow, 0], ...arc.map(([x, y], i) => [x, y + (i % 2 ? rng.range(0, 1) : 0)] as LP), [mw + grow, 0]]
      }
      k.poly(mouth(2.5), R('rockLight'))
      k.poly(mouth(0), R('dark'), line)
      const teeth = Math.max(1, Math.round(mw / 5))
      for (let i = 0; i < teeth; i++) {
        const x = lerp(-mw * 0.6, mw * 0.6, teeth === 1 ? 0.5 : i / (teeth - 1)) + rng.range(-1, 1)
        const top = -mh + (mh - arcY(x, mw, mh)) - px
        k.poly([[x - 1.5, top], [x + 1.5, top], [x + rng.range(-0.5, 0.5), top + rng.range(3, 5)]], R('rock'), line)
      }
      if (p.b('boulders') && hw - mw > 7) {
        for (const s of [-1, 1]) {
          const bx = s * (mw + 5 + rng.range(0, 2))
          const br = rng.range(3, 4.5)
          k.blob(bx, -br * 0.8, br, br * 0.9, rng, R('rock'), line, 6, 0.2)
          k.hline(bx - br * 0.5, bx, -br * 1.2, R('rockLight'))
        }
      }
      k.wall([[-hw, 0], [-mw, 0], [-mw * 0.92, -3]])
      k.wall([[hw, 0], [mw, 0], [mw * 0.92, -3]])
      k.trigger([[-mw + 1, 0], [mw - 1, 0]])
    },
  },

  // ------------------------------------------------------------------ stone stairs
  {
    id: 'fantasy-stairs',
    name: 'Stone stairs',
    themes: ['fantasy'],
    category: 'structure',
    tags: ['stairs', 'steps', 'staircase', 'castle', 'dungeon'],
    roles: {
      stone: { label: 'Treads (stone)', color: 7 },
      stoneShade: { label: 'Risers (stone)', color: 8 },
      wood: { label: 'Treads (wood)', color: 6 },
      woodShade: { label: 'Risers (wood)', color: 8 },
      side: { label: 'Side walls', color: 7 },
      sideShade: { label: 'Side wall fronts', color: 8 },
      mortar: { label: 'Mortar', color: 8 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'steps', label: 'Steps', type: 'int', min: 2, max: 12, default: 6 },
      { key: 'width', label: 'Width', type: 'int', min: 12, max: 64, default: 26 },
      { key: 'rise', label: 'Step height', type: 'int', min: 2, max: 7, default: 4 },
      { key: 'sides', label: 'Side walls', type: 'bool', default: true },
      {
        key: 'material', label: 'Material', type: 'select', default: 'stone',
        options: [{ value: 'stone', label: 'Stone' }, { value: 'wood', label: 'Wood' }],
      },
    ],
    defaultPriority: 'rows',
    perspective: true,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const n = p.n('steps')
      const rise = p.n('rise')
      const w0 = p.n('width') / 2
      const line = R('line')
      const px = onePx(k)
      const stone = p.s('material') === 'stone'
      const tread = R(stone ? 'stone' : 'wood')
      const riser = R(stone ? 'stoneShade' : 'woodShade')
      const N = n * rise
      const hwAt = (i: number) => w0 * (1 - 0.035 * i)
      const wt = hwAt(n)
      const rh = Math.max(1, Math.round(rise * 0.45))
      for (let i = n - 1; i >= 0; i--) {
        const y1 = -i * rise
        const y0 = y1 - rise
        const a = hwAt(i + 1)
        const b = hwAt(i)
        k.poly([[-a, y0], [a, y0], [b, y1], [-b, y1]], tread)
        k.rect(-b, y1 - rh, b, y1, riser)
        k.hline(-b, b, y1 - rh, line)
        k.line([[-a, y0], [-b, y1]], line)
        k.line([[a, y0], [b, y1]], line)
        if (stone && rh >= 2) {
          for (let x = -b + rng.range(3, 7); x < b - 2; x += rng.range(5, 9)) k.vline(x, y1 - rh + px, y1 - px, R('mortar'))
        } else if (!stone) {
          for (const s of [-1, 1]) k.dot(s * (b - 2), y1 - rh - 1, line)
        }
      }
      if (p.b('sides')) {
        for (const s of [-1, 1]) {
          const sw = 4
          const fh = Math.min(5, rise + 2)
          // lit top running up the slope, shaded front face, a capped post at the foot
          k.poly([[s * w0, 0], [s * (w0 + sw), 0], [s * (w0 + sw), -fh], [s * (wt + sw), -N - fh], [s * wt, -N - fh], [s * wt, -N]], R('side'), line)
          k.line([[s * w0, -fh], [s * wt, -N - fh]], R('mortar'))
          const fx0 = Math.min(s * w0, s * (w0 + sw))
          const fx1 = Math.max(s * w0, s * (w0 + sw))
          k.rect(fx0, -fh, fx1, 0, R('sideShade'), line)
          k.vline((fx0 + fx1) / 2, -fh + 2, -px, R('mortar'))
          k.rect(fx0 - 0.5, -fh - 2, fx1 + 0.5, -fh, R('side'), line)
        }
      }
      k.wall([[-w0, 0], [-wt, -N]])
      k.wall([[w0, 0], [wt, -N]])
      // the top step leads on: trigger across it
      k.trigger([[-wt + 1, -N], [wt - 1, -N]])
    },
  },

  // ------------------------------------------------------------------ dungeon wall
  {
    id: 'fantasy-dungeon-wall',
    name: 'Dungeon wall',
    themes: ['fantasy', 'spooky'],
    category: 'structure',
    tags: ['dungeon', 'wall', 'prison', 'cell', 'stone', 'chains'],
    roles: {
      stone: { label: 'Stone', color: 8 },
      mortar: { label: 'Mortar', color: 0 },
      highlight: { label: 'Highlights', color: 7 },
      moss: { label: 'Moss', color: 2 },
      iron: { label: 'Chains', color: 7 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 20, max: 160, default: 96 },
      { key: 'height', label: 'Height', type: 'int', min: 20, max: 110, default: 60 },
      { key: 'block', label: 'Block size', type: 'int', min: 4, max: 10, default: 7 },
      { key: 'shackles', label: 'Shackles', type: 'int', min: 0, max: 3, default: 2 },
      { key: 'moss', label: 'Moss', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 110 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = p.n('width') / 2
      const H = p.n('height')
      const bs = p.n('block')
      const px = onePx(k)
      k.rect(-hw, -H, hw, 0, R('stone'), R('line'))
      const blocks = stones(k, rng, -hw, -H, hw, 0, R('mortar'), { rowH: bs, minW: bs * 1.3, maxW: bs * 2.6 })
      // a few worn top edges catch the torchlight
      for (const b of blocks) {
        if (b.x1 - b.x0 < 9 * px || b.y1 - b.y0 < 3 * px || !rng.chance(0.15)) continue
        k.hline(b.x0 + px * 1.5, b.x1 - px * 1.5, b.y0 + px, R('highlight'))
      }
      // a crack
      let cx = rng.range(-hw * 0.6, hw * 0.6)
      let cy = -H + rng.range(2, H * 0.3)
      const crack: LP[] = [[cx, cy]]
      for (let i = 0; i < 4 && cy < -4; i++) {
        cx += rng.range(-3, 3)
        cy += rng.range(3, 7)
        crack.push([cx, Math.min(cy, -2)])
      }
      k.line(crack, R('line'))
      if (p.b('moss')) {
        // a few clumps along the damp foot of the wall
        const m = Math.max(1, Math.round(hw / 22))
        for (let i = 0; i < m; i++) {
          const x = lerp(-hw, hw, (i + 0.5) / m) + rng.range(-hw / m / 2, hw / m / 2)
          const rx = Math.min(rng.range(4, 7), hw - Math.abs(x))
          if (rx < 2) continue
          k.poly(k.blobPts(x, -1, rx, rng.range(2.5, 3.5), rng, 5, 0.2).map(([bx, by]) => [clamp(bx, -hw, hw), Math.min(by, 0)] as LP), R('moss'))
        }
      }
      const ns = Math.min(p.n('shackles'), Math.floor((hw * 2) / 14))
      for (let i = 0; i < ns; i++) {
        const x = lerp(-hw, hw, (i + 0.5) / ns) + rng.range(-2, 2)
        const y = -H * 0.72
        if (y > -14) break
        // wall ring, two straight chains, a pair of cuffs
        const end = Math.min(y + 11, -4)
        for (const s of [-1, 1]) {
          const ex = x + s * 3
          k.line([[x, y + 1], [ex, end - 1]], R('iron'))
          k.rect(ex - 1, end - 1, ex + 1, end + 1, R('iron'), R('line'))
        }
        k.rect(x - 1, y - 1, x + 1, y + 1, R('iron'), R('line'))
      }
      k.wall([[-hw, 0], [hw, 0]])
    },
  },
]
