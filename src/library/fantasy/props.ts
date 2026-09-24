import type { Rng } from '../../agi/rng'
import { R, lerp, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { flames, lowerArc, onePx, upperArc } from './shared'

/** Upright barrel standing on (ox, oy): bulging staves, two hoops, an oval lid. */
function barrel(k: Kit, ox: number, oy: number, h: number): void {
  const line = R('line')
  const r = h * 0.25
  const rt = r * 0.74
  const e = Math.max(1.2, rt * 0.55)
  const side = (t: number) => rt + (r - rt) * Math.sin(Math.PI * t)
  const n = 8
  const yAt = (t: number) => oy + lerp(-h + e, -e, t)
  const left: LP[] = []
  const right: LP[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    left.push([ox - side(t), yAt(t)])
    right.push([ox + side(t), yAt(t)])
  }
  const base = lowerArc(k, ox, oy - e, rt, e).reverse()
  k.poly([...left, ...base, ...right.reverse()], R('wood'), line)
  // hoops follow the curve of the staves
  for (const t of [0.22, 0.78]) {
    const w = side(t)
    for (const d of [0, 1]) k.line(k.ellipsePts(ox, yAt(t) + d - e * 0.6, w - 0.4, e * 0.6, undefined, 0.1, Math.PI - 0.1), R('hoop'))
  }
  k.ellipse(ox, oy - h + e, rt, e, R('lid'), line)
  k.outline(k.ellipsePts(ox, oy - h + e, rt * 0.6, e * 0.5), R('hoop'))
}

/** Crate standing on (ox, oy): front face, top and right side in oblique view. */
function crate(k: Kit, rng: Rng, ox: number, oy: number, s: number): void {
  const line = R('line')
  const fw = s * 0.62
  const dx = s * 0.22
  const dy = s * 0.28
  const x0 = ox - (fw + dx) / 2
  const x1 = x0 + fw
  const top = oy - s
  k.poly([[x1, oy], [x1, top], [x1 + dx, top - dy], [x1 + dx, oy - dy]], R('side'), line)
  k.poly([[x0, top], [x1, top], [x1 + dx, top - dy], [x0 + dx, top - dy]], R('lid'), line)
  k.line([[x0 + dx * 0.5, top - dy * 0.5], [x1 + dx * 0.5, top - dy * 0.5]], line)
  k.rect(x0, top, x1, oy, R('wood'), line)
  const i = Math.max(1.5, s * 0.12)
  k.outline([[x0 + i, top + i], [x1 - i, top + i], [x1 - i, oy - i], [x0 + i, oy - i]], line)
  if (rng.chance(0.5)) k.line([[x0 + i, oy - i], [x1 - i, top + i]], line)
  else k.line([[x0 + i, top + i], [x1 - i, oy - i]], line)
}

export const props: ElementDef[] = [
  // ------------------------------------------------------------------ barrel / crate
  {
    id: 'fantasy-barrel',
    name: 'Barrel or crate',
    themes: ['fantasy'],
    category: 'prop',
    tags: ['barrel', 'crate', 'box', 'cask', 'storage', 'tavern', 'cellar', 'dock'],
    roles: {
      wood: { label: 'Wood', color: 6 },
      lid: { label: 'Top', color: 6 },
      side: { label: 'Crate side', color: 8 },
      hoop: { label: 'Hoops', color: 8 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'barrel',
        options: [{ value: 'barrel', label: 'Barrel' }, { value: 'crate', label: 'Crate' }],
      },
      { key: 'size', label: 'Size', type: 'int', min: 10, max: 30, default: 20 },
      {
        key: 'layout', label: 'Arrangement', type: 'select', default: 'single',
        options: [{ value: 'single', label: 'Single' }, { value: 'row', label: 'Pair' }, { value: 'stack', label: 'Stack of three' }],
      },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 80, y: 128 },
    hasControl: true,
    generate(k, p, rng) {
      const s = p.n('size')
      const isBarrel = p.s('kind') === 'barrel'
      const layout = p.s('layout')
      const w = isBarrel ? s * 0.5 + 1 : s * 0.84 + 1
      const one = (x: number, y: number) => (isBarrel ? barrel(k, x, y, s) : crate(k, rng, x, y, s))
      let half = w / 2
      if (layout === 'single') one(0, 0)
      else {
        one(-w / 2, 0)
        one(w / 2, 0)
        half = w
        if (layout === 'stack') one(rng.range(-1, 1), isBarrel ? -s + s * 0.1 : -s - s * 0.12)
      }
      k.wall([[-half, 0], [half, 0]])
    },
  },

  // ------------------------------------------------------------------ torch
  {
    id: 'fantasy-torch',
    name: 'Torch',
    themes: ['fantasy', 'spooky'],
    category: 'prop',
    tags: ['torch', 'sconce', 'fire', 'light', 'dungeon', 'castle', 'wall'],
    roles: {
      iron: { label: 'Iron', color: 8 },
      wood: { label: 'Handle', color: 6 },
      head: { label: 'Pitch head', color: 0 },
      fire: { label: 'Flame', color: 12 },
      fireCore: { label: 'Flame core', color: 14 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'mount', label: 'Mount', type: 'select', default: 'wall',
        options: [{ value: 'wall', label: 'Wall sconce' }, { value: 'pole', label: 'Standing pole' }],
      },
      { key: 'lit', label: 'Lit', type: 'bool', default: true },
      { key: 'size', label: 'Torch length', type: 'int', min: 6, max: 16, default: 10 },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 74 },
    hasControl: true,
    generate(k, p, rng) {
      const L = p.n('size')
      const line = R('line')
      const lit = p.b('lit')
      const torch = (base: number) => {
        k.rect(-0.5, base - L, 0.5, base, R('wood'), line)
        k.rect(-1, base - L - 2, 1.5, base - L, R('head'), line)
        if (lit) flames(k, rng, 0.25, base - L - 1.5, 4.5, 7 + L * 0.2, R('fire'), R('fireCore'))
      }
      if (p.s('mount') === 'pole') {
        k.withPriority('baseline', () => {
          const H = 30
          k.rect(-1, -H, 1, 0, R('wood'), line)
          k.rect(-2.5, -1.5, 2.5, 0, R('iron'), line)
          k.poly([[-3, -H - 1], [3, -H - 1], [1.5, -H + 2], [-1.5, -H + 2]], R('iron'), line)
          torch(-H - 1)
        })
        k.wall([[-2, 0], [2, 0]])
      } else {
        // wall plate with a ring holding the torch
        k.rect(-1.5, -6, 1.5, 0, R('iron'), line)
        k.dot(0, -1.5, line)
        torch(-2)
        k.rect(-1.5, -5, 2, -4, R('iron'), line)
      }
    },
  },

  // ------------------------------------------------------------------ treasure chest
  {
    id: 'fantasy-chest',
    name: 'Treasure chest',
    themes: ['fantasy'],
    category: 'prop',
    tags: ['chest', 'treasure', 'gold', 'loot', 'coins', 'dragon'],
    roles: {
      wood: { label: 'Wood', color: 6 },
      band: { label: 'Bands', color: 8 },
      lock: { label: 'Lock', color: 14 },
      inside: { label: 'Inside', color: 0 },
      gold: { label: 'Gold', color: 14 },
      goldShade: { label: 'Gold shade', color: 6 },
      sparkle: { label: 'Sparkle', color: 15 },
      gem: { label: 'Gems', color: 12 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'size', label: 'Width', type: 'int', min: 10, max: 28, default: 16 },
      { key: 'open', label: 'Open', type: 'bool', default: false },
      { key: 'gold', label: 'Gold inside', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 128 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = p.n('size') / 2
      const bh = Math.max(5, hw * 1.05)
      const lh = Math.max(3, hw * 0.7)
      const line = R('line')
      const px = onePx(k)
      const open = p.b('open')
      const bands = [-hw * 0.6, hw * 0.6]
      if (open) {
        // lid thrown back: we see its inside above the chest
        const lt = -bh - lh * 1.8
        k.poly([[-hw + 0.5, -bh], [-hw + 0.5, lt + lh * 0.6], ...upperArc(k, 0, lt + lh * 0.6, hw - 0.5, lh * 0.6), [hw - 0.5, lt + lh * 0.6], [hw - 0.5, -bh]], R('wood'), line)
        k.rect(-hw + 2, lt + lh * 0.7, hw - 2, -bh - 1, R('inside'))
        k.rect(-hw, -bh - 1.5, hw, -bh, R('inside'), line)
        if (p.b('gold')) {
          const heap = upperArc(k, 0, -bh, hw - 1, lh * 1.1, 9).map(([x, y], i) => [x, y + (i % 2 ? 1 : 0)] as LP)
          k.poly([[-hw + 1, -bh], ...heap, [hw - 1, -bh]], R('gold'), R('goldShade'))
          for (let i = 0; i < hw * 0.8; i++) {
            const x = rng.range(-hw + 3, hw - 3)
            k.dot(x, -bh - rng.range(1, lh * 0.8), R('goldShade'))
          }
          k.dot(rng.range(-hw * 0.4, hw * 0.4), -bh - lh * 0.7, R('sparkle'))
          k.ellipse(rng.range(-hw * 0.3, hw * 0.3), -bh - lh * 0.35, 1, 1.4, R('gem'), line)
          // a few coins spilled on the floor
          for (const s of [-1, 1]) if (rng.chance(0.7)) k.ellipse(s * (hw + 2.5), -0.8, 1.2, 0.8, R('gold'), R('goldShade'))
        }
      } else {
        k.poly([[-hw, -bh], ...upperArc(k, 0, -bh, hw, lh), [hw, -bh]], R('wood'), line)
        for (const x of bands) {
          const t = -bh - lh * Math.sqrt(Math.max(0, 1 - (x / hw) ** 2))
          k.rect(x - 0.5, t + px, x + 0.5, -bh, R('band'))
        }
        k.hline(-hw + 2, hw - 2, -bh - lh * 0.55, line)
      }
      k.rect(-hw, -bh, hw, 0, R('wood'), line)
      k.hline(-hw + px, hw - px, -bh * 0.5, line)
      for (const x of bands) k.rect(x - 0.5, -bh + px, x + 0.5, -px, R('band'))
      k.rect(-hw, -bh, hw, -bh + 1, R('band'), line)
      k.rect(-1.5, -bh - (open ? 0 : 1.5), 1.5, -bh + 3, R('lock'), line)
      k.dot(0, -bh + 1.5, line)
      k.wall([[-hw, 0], [hw, 0]])
    },
  },
]
