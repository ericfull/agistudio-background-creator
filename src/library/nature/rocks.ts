import { R, clamp, type LP } from '../../kit/helpers'
import type { ElementDef } from '../types'
import { drawRock } from './shapes'

export const rocks: ElementDef[] = [
  {
    id: 'boulder',
    name: 'Boulder',
    themes: ['nature', 'fantasy'],
    category: 'rock',
    tags: ['rock', 'stone', 'boulder'],
    roles: {
      rock: { label: 'Rock', color: 7 },
      shade: { label: 'Shadow', color: 8 },
      light: { label: 'Highlight', color: 15 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 3, max: 32, default: 11 },
      { key: 'height', label: 'Height', type: 'int', min: 3, max: 50, default: 18 },
      { key: 'cracks', label: 'Cracks', type: 'int', min: 0, max: 4, default: 1 },
      { key: 'highlight', label: 'Highlight', type: 'bool', default: true },
      { key: 'outline', label: 'Outline', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 110, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const h = p.n('height')
      const line = p.b('outline') ? R('line') : undefined
      drawRock(k, rng, 0, 0, w, h, {
        rock: R('rock'), shade: R('shade'), light: p.b('highlight') ? R('light') : null, line, crack: line ?? R('shade'),
      }, p.n('cracks'))
      k.wall([[-w * 0.8, 0], [w * 0.8, 0]])
    },
  },
  {
    id: 'rock-cluster',
    name: 'Rock cluster',
    themes: ['nature', 'fantasy', 'scifi'],
    category: 'rock',
    tags: ['rocks', 'stones', 'rubble', 'pile'],
    roles: {
      rock: { label: 'Rock', color: 7 },
      shade: { label: 'Shadow', color: 8 },
      light: { label: 'Highlight', color: 15 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'count', label: 'Rocks', type: 'int', min: 2, max: 9, default: 4 },
      { key: 'size', label: 'Biggest rock', type: 'int', min: 3, max: 22, default: 9 },
      { key: 'spread', label: 'Spread', type: 'int', min: 4, max: 60, default: 16 },
      { key: 'highlight', label: 'Highlights', type: 'bool', default: true },
      { key: 'outline', label: 'Outline', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 110, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const n = p.n('count')
      const size = p.n('size')
      const spread = Math.max(p.n('spread'), size)
      const line = p.b('outline') ? R('line') : undefined
      const colors = { rock: R('rock'), shade: R('shade'), light: p.b('highlight') ? R('light') : null, line, crack: null }
      // the biggest rock sits at the back in the middle, smaller ones spill out in front
      const list = Array.from({ length: n }, (_, i) => {
        const s = i === 0 ? size : size * rng.range(0.4, 0.8)
        const x = i === 0 ? rng.range(-spread * 0.2, spread * 0.2) : rng.range(-spread + s, spread - s)
        const y = i === 0 ? -1 : rng.range(-1, 2.5)
        return { x, y, w: s, h: s * rng.range(1.3, 1.9) }
      }).sort((a, b) => a.y - b.y || b.w - a.w)
      for (const r of list) drawRock(k, rng, r.x, r.y, r.w, r.h, colors, 0)
      const xs = list.map((r) => [r.x - r.w * 0.8, r.x + r.w * 0.8]).flat()
      k.wall([[Math.min(...xs), 0], [Math.max(...xs), 0]])
    },
  },
  {
    id: 'cliff',
    name: 'Cliff face',
    themes: ['nature', 'fantasy'],
    category: 'rock',
    tags: ['cliff', 'rock face', 'mountain', 'wall', 'ledge'],
    roles: {
      rock: { label: 'Rock', color: 7 },
      shade: { label: 'Shadow', color: 8 },
      strata: { label: 'Strata', color: 8 },
      line: { label: 'Outline', color: 0 },
      top: { label: 'Grassy top', color: 2 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 8, max: 80, default: 30 },
      { key: 'height', label: 'Height', type: 'int', min: 10, max: 130, default: 56 },
      { key: 'strata', label: 'Strata', type: 'int', min: 0, max: 12, default: 4 },
      { key: 'cracks', label: 'Cracks', type: 'int', min: 0, max: 10, default: 3 },
      { key: 'grass', label: 'Grassy top', type: 'bool', default: true },
      { key: 'outline', label: 'Outline', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 40, y: 120 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const h = p.n('height')
      const line = p.b('outline') ? R('line') : undefined
      // silhouette: sides lean in toward the top, with a jagged crest
      const sideSteps = clamp(Math.round(h / 8), 2, 12)
      const lean = Math.min(w * 0.25, h * 0.08 + 1)
      const leftSide: LP[] = [[-w, 0]]
      for (let i = 1; i < sideSteps; i++) {
        const f = i / sideSteps
        leftSide.push([-w + lean * f + rng.range(-1, 1.5) - (i % 2 ? rng.range(0, 1.5) : 0), -h * f])
      }
      const topSteps = clamp(Math.round((2 * w - 2 * lean) / 3.5), 3, 40)
      const topEdge: LP[] = []
      for (let i = 0; i <= topSteps; i++) {
        const x = -w + lean + ((2 * w - 2 * lean) * i) / topSteps
        const end = i === 0 || i === topSteps
        topEdge.push([x, -h + (end ? rng.range(1, 3) : rng.range(-2.5, 2))])
      }
      const rightSide: LP[] = []
      for (let i = sideSteps - 1; i >= 1; i--) {
        const f = i / sideSteps
        rightSide.push([w - lean * f - rng.range(-1, 1.5) + (i % 2 ? rng.range(0, 1.5) : 0), -h * f])
      }
      rightSide.push([w, 0])
      const outline = [...leftSide, ...topEdge, ...rightSide]
      k.poly(outline, R('rock'), line ?? R('rock'))

      // dark crevices of different lengths
      const crev = Math.max(1, Math.round(w / 7))
      for (let i = 0; i < crev; i++) {
        const x = -w + lean + 2 + ((i + rng.range(0.1, 0.9)) * (2 * w - 2 * lean - 4)) / crev
        const y0 = -h * rng.range(0.62, 0.92)
        const y1 = Math.min(-1, y0 + h * rng.range(0.3, 0.75))
        const fw = rng.range(1.2, 2.6)
        k.poly([[x, y0], [x + fw, y0 + (y1 - y0) * 0.35], [x + fw * 0.7, y0 + (y1 - y0) * 0.7], [x + fw * 0.2, y1], [x - fw * 0.35, (y0 + y1) / 2]], R('shade'))
      }
      // right edge in shadow
      const rs: LP[] = [topEdge[topEdge.length - 1], ...rightSide]
      k.poly([...rs, ...[...rs].reverse().map(([x, y]): LP => [x - rng.range(2, 4), y])], R('shade'))

      // strata: broken, slightly wavy horizontal bands
      const n = p.n('strata')
      for (let i = 0; i < n; i++) {
        const y = -h + 4 + ((i + rng.range(0.2, 0.8)) * (h - 6)) / n
        let x = -w + rng.range(1, 6)
        while (x < w - 3) {
          const len = rng.range(4, 14)
          const x1 = Math.min(w - 2, x + len)
          k.line([[x, y], [(x + x1) / 2, y + rng.range(-1, 1)], [x1, y + rng.range(-0.8, 0.8)]], R('strata'))
          x = x1 + rng.range(1, 6)
        }
      }
      // cracks: jagged lines running down from the top
      for (let i = 0; i < p.n('cracks'); i++) {
        let x = rng.range(-w + 3, w - 3)
        let y = -h + rng.range(1, 5)
        const pts: LP[] = [[x, y]]
        const end = y + h * rng.range(0.2, 0.6)
        while (y < end) {
          y += rng.range(3, 7)
          x += rng.range(-1.5, 1.5)
          pts.push([x, Math.min(y, -1)])
        }
        k.line(pts, line ?? R('shade'))
        if (pts.length > 2 && rng.chance(0.6)) {
          const [bx, by] = pts[1]
          k.line([[bx, by], [bx + rng.range(-3, 3), by + rng.range(3, 6)]], line ?? R('shade'))
        }
      }
      if (p.b('grass')) {
        // turf along the top with tufts hanging over the edge
        const turf: LP[] = topEdge.map(([x, y]): LP => [x, y - 1.5])
        const hang: LP[] = []
        for (let i = topEdge.length - 1; i >= 0; i--) {
          const [x, y] = topEdge[i]
          hang.push([x, y + (i % 2 ? rng.range(1.5, 3.5) : 0.5)])
        }
        k.poly([...turf, ...hang], R('top'), line ?? R('top'))
      } else if (line) {
        k.line([...leftSide, ...topEdge, ...rightSide], line)
      }
      if (line) {
        k.line([...leftSide, topEdge[0]], line)
        k.line([topEdge[topEdge.length - 1], ...rightSide], line)
      }
      k.wall([[-w, 0], [w, 0]])
    },
  },
]
