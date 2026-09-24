import { R, clamp, lerp, type LP } from '../../kit/helpers'
import type { ElementDef } from '../types'
import { archPts, archTopAt, flames, lowerArc, onePx, stones, upperArc } from './shared'

const BOOKS = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6']

export const furniture: ElementDef[] = [
  // ------------------------------------------------------------------ fireplace
  {
    id: 'fantasy-fireplace',
    name: 'Fireplace',
    themes: ['fantasy'],
    category: 'furniture',
    tags: ['fireplace', 'hearth', 'fire', 'kitchen', 'hall', 'cauldron'],
    roles: {
      stone: { label: 'Stone', color: 7 },
      mortar: { label: 'Mortar', color: 8 },
      line: { label: 'Outline', color: 0 },
      dark: { label: 'Firebox', color: 0 },
      mantel: { label: 'Mantel', color: 6 },
      log: { label: 'Logs', color: 6 },
      fire: { label: 'Flames', color: 12 },
      fireCore: { label: 'Flame core', color: 14 },
      ash: { label: 'Ash', color: 8 },
      pot: { label: 'Cauldron', color: 8 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 18, max: 50, default: 32 },
      { key: 'height', label: 'Height', type: 'int', min: 20, max: 56, default: 34 },
      { key: 'lit', label: 'Lit', type: 'bool', default: true },
      { key: 'chimney', label: 'Chimney breast', type: 'bool', default: true },
      { key: 'pot', label: 'Cauldron', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 100 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = p.n('width') / 2
      const H = p.n('height')
      const line = R('line')
      const ow = clamp(hw * 0.62, 5, hw - 3)
      const oh = clamp(H * 0.56, 10, H - 9)
      if (p.b('chimney')) {
        const top = -H - 70
        k.rect(-hw + 3, top, hw - 3, -H, R('stone'), line)
        stones(k, rng, -hw + 3, top, hw - 3, -H, R('mortar'), { rowH: 5, minW: 5, maxW: 10 })
      }
      k.rect(-hw, -H, hw, 0, R('stone'), line)
      stones(k, rng, -hw, -H, hw, 0, R('mortar'), { rowH: 5, minW: 5, maxW: 10 })
      // arch ring and firebox
      k.poly(archPts(k, -ow - 2, ow + 2, -oh - 2, 0, true), R('stone'), line)
      k.poly(archPts(k, -ow, ow, -oh, 0, true), R('dark'), line)
      const ry = Math.min(ow * 1.7, oh * 0.5)
      for (let i = 1; i < 6; i++) {
        const a = Math.PI + (Math.PI * i) / 6
        const cy = -oh + ry
        k.line([[Math.cos(a) * ow, cy + Math.sin(a) * ry], [Math.cos(a) * (ow + 2), cy - 1 + Math.sin(a) * (ry + 1)]], R('mortar'))
      }
      // mantel shelf
      const my = -oh - 5
      if (my > -H + 1) k.rect(-hw - 2, my - 2, hw + 2, my, R('mantel'), line)
      // logs and fire
      const lw = ow * 0.75
      const pot = p.b('pot')
      if (p.b('lit')) {
        flames(k, rng, rng.range(-0.5, 0.5), -2, ow * 1.3, Math.min(oh * (pot ? 0.4 : 0.65), 14), R('fire'), R('fireCore'))
      } else {
        k.poly([[-lw, -1], ...upperArc(k, 0, -1, lw, 2.5), [lw, -1]], R('ash'))
      }
      k.poly([[-lw, -4], [lw * 0.3, -2], [lw * 0.3, 0], [-lw, -2]], R('log'), line)
      k.poly([[lw, -4], [-lw * 0.3, -2], [-lw * 0.3, 0], [lw, -2]], R('log'), line)
      if (pot) {
        const pr = Math.min(ow * 0.5, 5)
        const py = -oh * 0.78
        k.vline(0, -oh + ry * 0.3, py - 1, line)
        k.poly([[-pr, py], [pr, py], ...lowerArc(k, 0, py, pr, pr * 1.1)], R('pot'), line)
        k.hline(-pr - 0.5, pr + 0.5, py, line)
      }
      // hearth slab in front
      k.rect(-hw - 3, -1, hw + 3, 2, R('stone'), line)
      k.wall([[-hw - 3, 2], [hw + 3, 2]])
    },
  },

  // ------------------------------------------------------------------ table
  {
    id: 'fantasy-table',
    name: 'Table',
    themes: ['fantasy'],
    category: 'furniture',
    tags: ['table', 'kitchen', 'tavern', 'inn', 'feast', 'candle'],
    roles: {
      wood: { label: 'Wood', color: 6 },
      line: { label: 'Outline', color: 0 },
      cloth: { label: 'Tablecloth', color: 15 },
      clothLine: { label: 'Cloth folds', color: 7 },
      item: { label: 'Plate / candle', color: 15 },
      flame: { label: 'Flame', color: 14 },
      food: { label: 'Food', color: 12 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 14, max: 56, default: 28 },
      { key: 'height', label: 'Height', type: 'int', min: 8, max: 18, default: 12 },
      { key: 'cloth', label: 'Tablecloth', type: 'bool', default: false },
      {
        key: 'items', label: 'On the table', type: 'select', default: 'candle',
        options: [{ value: 'none', label: 'Nothing' }, { value: 'candle', label: 'Candle' }, { value: 'meal', label: 'A meal' }],
      },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 128 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = p.n('width') / 2
      const H = p.n('height')
      const line = R('line')
      const td = 4
      // back legs
      for (const s of [-1, 1]) k.rect(s * (hw - 4), -H, s * (hw - 4) + s, -td, R('wood'), line)
      // top
      const cloth = p.b('cloth')
      k.poly([[-hw + 1, -H - td], [hw - 1, -H - td], [hw, -H], [-hw, -H]], cloth ? R('cloth') : R('wood'), line)
      if (!cloth) k.hline(-hw + 2, hw - 2, -H - td / 2, line)
      k.rect(-hw, -H, hw, -H + 2, R('wood'), line)
      for (const s of [-1, 1]) k.rect(s * (hw - 1) - 1, -H + 2, s * (hw - 1) + 1, 0, R('wood'), line)
      if (cloth) {
        const n = Math.max(2, Math.round(hw / 3))
        const hem: LP[] = []
        for (let i = n; i >= 0; i--) hem.push([lerp(-hw - 1, hw + 1, i / n), -H + 5 + (i % 2 ? 1.5 : 0)])
        k.poly([[-hw - 1, -H], [hw + 1, -H], ...hem], R('cloth'), line)
        for (let i = 1; i < n; i += 2) k.vline(lerp(-hw - 1, hw + 1, i / n), -H + 1, -H + 5, R('clothLine'))
      }
      const items = p.s('items')
      const ty = -H - td / 2
      if (items === 'candle') {
        const cx = Math.round(rng.range(-hw * 0.3, hw * 0.3))
        k.hline(cx - 1, cx + 1, ty, R('flame'))
        k.vline(cx, ty - 5, ty - 1, R('item'))
        k.vline(cx, ty - 8, ty - 6, R('flame'))
      } else if (items === 'meal') {
        const x0 = -hw * 0.45
        k.ellipse(x0, ty + 0.5, 3.5, 1.5, R('item'), line)
        k.poly([[x0 - 2, ty], ...upperArc(k, x0, ty, 2, 3), [x0 + 2, ty]], R('food'), line)
        const mx = hw * 0.4
        k.rect(mx - 1, ty - 5, mx + 1.5, ty, R('wood'), line)
        k.line([[mx + 1.5, ty - 4], [mx + 3, ty - 4], [mx + 3, ty - 1], [mx + 1.5, ty - 1]], line)
        k.poly([[-3, ty + 0.5], ...upperArc(k, 0, ty + 0.5, 3, 3), [3, ty + 0.5]], R('flame'), line)
      }
      k.wall([[-hw, 0], [hw, 0], [hw - 1, -td], [-hw + 1, -td], [-hw, 0]])
    },
  },

  // ------------------------------------------------------------------ bed
  {
    id: 'fantasy-bed',
    name: 'Bed',
    themes: ['fantasy'],
    category: 'furniture',
    tags: ['bed', 'bedroom', 'inn', 'four-poster', 'sleep'],
    roles: {
      wood: { label: 'Wood', color: 6 },
      line: { label: 'Outline', color: 0 },
      blanket: { label: 'Blanket', color: 4 },
      quilt: { label: 'Quilt lines', color: 12 },
      sheet: { label: 'Sheets', color: 15 },
      pillow: { label: 'Pillow', color: 15 },
    },
    params: [
      { key: 'length', label: 'Length', type: 'int', min: 26, max: 60, default: 40 },
      { key: 'depth', label: 'Depth', type: 'int', min: 5, max: 14, default: 8 },
      { key: 'posts', label: 'Four-poster', type: 'bool', default: false },
      { key: 'quilt', label: 'Patchwork', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 128 },
    hasControl: true,
    generate(k, p) {
      const hl = p.n('length') / 2
      const d = p.n('depth')
      const line = R('line')
      const mh = 10
      const hb = 12
      const top = -mh - d
      // back posts of a four-poster
      if (p.b('posts')) {
        for (const x of [-hl, hl - 1]) k.rect(x, top - hb - 18, x + 1, top, R('wood'), line)
      }
      // headboard (behind the mattress) and side rail
      k.rect(-hl - 2, top - hb, -hl + 1, 0, R('wood'), line)
      k.poly([[-hl - 2, top - hb], ...upperArc(k, -hl - 0.5, top - hb, 1.5, 2.5), [-hl + 1, top - hb]], R('wood'), line)
      k.rect(-hl, -mh + 2, hl, -3, R('wood'), line)
      k.rect(-hl, -3, -hl + 2, 0, R('wood'), line)
      k.rect(hl - 2, -3, hl, 0, R('wood'), line)
      // mattress top and pillow
      k.poly([[-hl + 1, top], [hl - 1, top], [hl, -mh], [hl, -mh + 2], [-hl, -mh + 2], [-hl, -mh]], R('sheet'), line)
      const pw = 7
      const px0 = -hl + 2
      const py0 = top + 1
      const py1 = top + Math.max(3, d - 2)
      k.poly([[px0 + 1, py0], [px0 + pw - 1, py0], [px0 + pw, py0 + 1], [px0 + pw, py1], [px0, py1], [px0, py0 + 1]], R('pillow'), line)
      // blanket over the top, draping down the side
      const bx = -hl + pw + 4
      k.poly([[bx + 1, top], [hl - 1, top], [hl, -mh], [hl, -4], [bx - 1, -4], [bx - 1, -mh]], R('blanket'), line)
      if (p.b('quilt')) {
        for (let x = bx + 5; x < hl - 2; x += 5) k.vline(x, -mh + 1, -5, R('quilt'))
        k.hline(bx, hl - 1, -mh + 2 + (mh - 6) / 2, R('quilt'))
        k.hline(bx + 1, hl - 2, top + d / 2, R('quilt'))
      }
      // turned-down sheet along the blanket's head edge
      k.poly([[bx + 1, top + 1], [bx + 3, top + 1], [bx + 2, -mh], [bx + 2, -5], [bx, -5], [bx, -mh]], R('sheet'))
      // footboard in front
      k.rect(hl - 1, top - 3, hl + 2, 0, R('wood'), line)
      if (p.b('posts')) {
        const ct = top - hb - 18
        for (const x of [-hl - 2, hl - 1]) k.rect(x, ct, x + 3, 0, R('wood'), line)
        k.rect(-hl - 2, ct - 2, hl + 2, ct + 2, R('wood'), line)
        const n = Math.max(3, Math.round(hl / 3))
        const hem: LP[] = []
        for (let i = n; i >= 0; i--) hem.push([lerp(-hl + 1, hl - 1, i / n), ct + 5 + (i % 2 ? 1.5 : 0)])
        k.poly([[-hl + 1, ct + 2], [hl - 1, ct + 2], ...hem], R('blanket'), line)
        // curtains tied back to the posts
        const tie = top - 6
        k.poly([[-hl + 1, ct + 2], [-hl + 5, ct + 2], [-hl + 2.5, tie], [-hl + 3.5, top - 1], [-hl + 1, top - 1]], R('blanket'), line)
        k.poly([[hl - 1, ct + 2], [hl - 5, ct + 2], [hl - 2.5, tie], [hl - 3.5, top - 4], [hl - 1, top - 4]], R('blanket'), line)
        k.hline(-hl + 1, -hl + 3, tie, R('quilt'))
        k.hline(hl - 3, hl - 1, tie, R('quilt'))
      }
      k.wall([[-hl - 2, 0], [hl + 2, 0], [hl + 2, -d], [-hl - 2, -d], [-hl - 2, 0]])
    },
  },

  // ------------------------------------------------------------------ bookshelf
  {
    id: 'fantasy-bookshelf',
    name: 'Bookshelf',
    themes: ['fantasy'],
    category: 'furniture',
    tags: ['bookshelf', 'books', 'library', 'study', 'wizard'],
    roles: {
      wood: { label: 'Wood', color: 6 },
      line: { label: 'Outline', color: 0 },
      back: { label: 'Back', color: 0 },
      b1: { label: 'Books 1', color: 4 },
      b2: { label: 'Books 2', color: 1 },
      b3: { label: 'Books 3', color: 2 },
      b4: { label: 'Books 4', color: 14 },
      b5: { label: 'Books 5', color: 5 },
      b6: { label: 'Books 6', color: 3 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 12, max: 48, default: 22 },
      { key: 'height', label: 'Height', type: 'int', min: 20, max: 60, default: 40 },
      { key: 'shelves', label: 'Shelves', type: 'int', min: 2, max: 7, default: 4 },
      { key: 'fill', label: 'Books %', type: 'int', min: 0, max: 100, default: 85 },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 104 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = p.n('width') / 2
      const H = p.n('height')
      const n = p.n('shelves')
      const fill = p.n('fill') / 100
      const line = R('line')
      const px = onePx(k)
      k.rect(-hw, -H, hw, 0, R('wood'), line)
      k.rect(-hw - 1, -H - 2, hw + 1, -H, R('wood'), line)
      const x0 = -hw + 2
      const x1 = hw - 2
      const yTop = -H + 2
      const yBot = -3
      k.rect(x0, yTop, x1, yBot, R('back'))
      const ch = (yBot - yTop) / n
      for (let i = 0; i < n; i++) {
        const ct = yTop + i * ch
        const cb = yTop + (i + 1) * ch - (i < n - 1 ? 1.5 : 0)
        if (i < n - 1) k.rect(x0, cb, x1, cb + 1.5, R('wood'), line)
        // books standing on the shelf
        let x = x0 + px
        let prev = ''
        while (x < x1 - px * 0.5) {
          const bw = rng.chance(0.6) ? 1 : 2
          if (rng.next() > fill) {
            x += rng.range(1, 3)
            continue
          }
          const h = Math.max(2, cb - ct - 1 - rng.range(0, 2.5))
          let c = rng.pick(BOOKS)
          if (c === prev) c = BOOKS[(BOOKS.indexOf(c) + 1) % BOOKS.length]
          prev = c
          if (x + bw * px > x1) break
          if (bw === 1) k.vline(x, cb - h, cb - px * 0.5, R(c))
          else k.rect(x, cb - h, x + px, cb - px * 0.5, R(c))
          x += bw * px
        }
      }
      k.rect(-hw, -2, hw, 0, R('wood'), line)
      k.wall([[-hw, 0], [hw, 0]])
    },
  },

  // ------------------------------------------------------------------ door
  {
    id: 'fantasy-door',
    name: 'Door',
    themes: ['fantasy'],
    category: 'furniture',
    tags: ['door', 'doorway', 'entrance', 'exit', 'arch'],
    roles: {
      wood: { label: 'Door', color: 6 },
      grain: { label: 'Planks', color: 0 },
      iron: { label: 'Ironwork', color: 8 },
      frame: { label: 'Frame', color: 7 },
      frameLine: { label: 'Frame joints', color: 8 },
      dark: { label: 'Doorway', color: 0 },
      handle: { label: 'Handle', color: 14 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 10, max: 22, default: 14 },
      { key: 'height', label: 'Height', type: 'int', min: 36, max: 54, default: 40 },
      {
        key: 'state', label: 'Door', type: 'select', default: 'closed',
        options: [{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }],
      },
      {
        key: 'shape', label: 'Shape', type: 'select', default: 'arched',
        options: [{ value: 'arched', label: 'Arched' }, { value: 'square', label: 'Square' }],
      },
      {
        key: 'frame', label: 'Frame', type: 'select', default: 'stone',
        options: [{ value: 'stone', label: 'Stone' }, { value: 'wood', label: 'Wood' }, { value: 'none', label: 'None' }],
      },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 100 },
    hasControl: true,
    generate(k, p, rng) {
      const dw = p.n('width') / 2
      const H = p.n('height')
      const arched = p.s('shape') === 'arched'
      const frame = p.s('frame')
      const open = p.s('state') === 'open'
      const line = R('line')
      const px = onePx(k)
      if (frame !== 'none') {
        const fw = frame === 'stone' ? 3 : 2
        k.poly(archPts(k, -dw - fw, dw + fw, -H - fw, 0, arched), frame === 'stone' ? R('frame') : R('wood'), line)
        if (frame === 'stone') {
          const ry = Math.min(dw * 1.7, H * 0.5)
          const cy = arched ? -H + ry : -H
          if (arched) {
            for (let i = 1; i < 7; i++) {
              const a = Math.PI + (Math.PI * i) / 7
              k.line([[Math.cos(a) * dw, cy + Math.sin(a) * ry], [Math.cos(a) * (dw + fw), cy + Math.sin(a) * (ry + 1.5) - 1]], R('frameLine'))
            }
          } else {
            for (const x of [-dw / 2, dw / 2]) k.vline(x, -H - fw + px, -H - px, R('frameLine'))
          }
          for (let y = cy + 5; y < -2; y += 6) {
            const o = rng.range(-1, 1)
            k.hline(-dw - fw + px, -dw - px, y + o, R('frameLine'))
            k.hline(dw + px, dw + fw - px, y - o, R('frameLine'))
          }
        }
      }
      const top = (x: number) => archTopAt(x, -dw, dw, -H, 0, arched)
      if (open) {
        k.poly(archPts(k, -dw, dw, -H, 0, arched), R('dark'), line)
        // the leaf swung inward against the left jamb
        const lw = dw * 0.7
        const t0 = top(-dw + 0.5)
        k.poly([[-dw, t0 + 1], [-dw + lw, t0 + 3], [-dw + lw, -2], [-dw, 0]], R('wood'), line)
        k.vline(-dw + lw * 0.5, t0 + 3, -1.5, R('grain'))
      } else {
        k.poly(archPts(k, -dw, dw, -H, 0, arched), R('wood'), line)
        for (let x = -dw + 3; x < dw - px * 1.5; x += 3) k.vline(x, top(x) + px, -px, R('grain'))
        for (const f of [0.22, 0.7]) {
          const y = -H * f
          k.rect(-dw + px, y - 1, dw - px, y, R('iron'))
          k.dot(-dw + 2, y - 0.5, line)
        }
        const hx = dw * 0.5
        k.outline(k.ellipsePts(hx, -H * 0.45, 1.2, 2, 8), R('handle'))
      }
      // walls either side, trigger on the threshold (open or shut: game logic decides)
      k.wall([[-dw - 3, 0], [-dw, 0]])
      k.wall([[dw, 0], [dw + 3, 0]])
      k.trigger([[-dw + 1, 0], [dw - 1, 0]])
    },
  },

  // ------------------------------------------------------------------ window
  {
    id: 'fantasy-window',
    name: 'Window',
    themes: ['fantasy'],
    category: 'furniture',
    tags: ['window', 'shutters', 'arched', 'wall'],
    roles: {
      frame: { label: 'Frame', color: 7 },
      frameShade: { label: 'Reveal', color: 8 },
      pane: { label: 'View / glass', color: 9 },
      bars: { label: 'Mullions', color: 0 },
      shutter: { label: 'Shutters', color: 6 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 6, max: 22, default: 10 },
      { key: 'height', label: 'Height', type: 'int', min: 10, max: 34, default: 18 },
      {
        key: 'shape', label: 'Shape', type: 'select', default: 'arched',
        options: [{ value: 'arched', label: 'Arched' }, { value: 'square', label: 'Square' }],
      },
      { key: 'shutters', label: 'Open shutters', type: 'bool', default: false },
      {
        key: 'bars', label: 'Glazing', type: 'select', default: 'cross',
        options: [{ value: 'none', label: 'Open' }, { value: 'cross', label: 'Cross' }, { value: 'grid', label: 'Leaded' }],
      },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 74 },
    generate(k, p) {
      const ww = p.n('width') / 2
      const H = p.n('height')
      const arched = p.s('shape') === 'arched'
      const line = R('line')
      const px = onePx(k)
      const yb = -2
      const yt = -H - 2
      if (p.b('shutters')) {
        const sw = ww + 1
        for (const s of [-1, 1]) {
          const a = s * (ww + 2)
          const b = s * (ww + 2 + sw)
          const x0 = Math.min(a, b)
          const x1 = Math.max(a, b)
          const st = arched ? yt + Math.min(ww * 1.7, H * 0.5) * 0.6 : yt
          k.rect(x0, st, x1, yb, R('shutter'), line)
          for (let x = x0 + 2; x < x1 - px; x += 2) k.vline(x, st + px, yb - px, line)
          k.line([[x0 + px, yb - 2], [x1 - px, st + 2]], line)
        }
      }
      k.rect(-ww - 2.5, -2, ww + 2.5, 0, R('frame'), line)
      k.poly(archPts(k, -ww - 2, ww + 2, yt - 2, yb, arched), R('frame'), line)
      if (arched) {
        const ry = Math.min((ww + 2) * 1.7, (H + 2) * 0.5)
        const cy = yt - 2 + ry
        for (let i = 1; i < 6; i++) {
          const a = Math.PI + (Math.PI * i) / 6
          k.line([[Math.cos(a) * ww, cy + 2 + Math.sin(a) * (ry - 2)], [Math.cos(a) * (ww + 2), cy + Math.sin(a) * ry]], R('frameShade'))
        }
      }
      k.poly(archPts(k, -ww, ww, yt, yb, arched), R('pane'), line)
      // reveal shadow on the left and top
      const top = (x: number) => archTopAt(x, -ww, ww, yt, yb, arched)
      k.vline(-ww + px, top(-ww + px) + px, yb - px, R('frameShade'))
      for (let x = -ww + px; x < ww - px; x += px) k.dot(x, top(x) + px, R('frameShade'))
      const bars = p.s('bars')
      if (bars === 'cross') {
        k.vline(0, top(0), yb, R('bars'))
        const my = lerp(yt, yb, arched ? 0.55 : 0.45)
        k.hline(-ww, ww, my, R('bars'))
      } else if (bars === 'grid') {
        for (let x = -ww + 3; x < ww - 1; x += 3) k.vline(x, top(x), yb, R('bars'))
        for (let y = yb - 4; y > yt + 1; y -= 4) {
          const xs: number[] = []
          for (let x = -ww; x <= ww; x += px) if (top(x) < y) xs.push(x)
          if (xs.length > 1) k.hline(xs[0], xs[xs.length - 1], y, R('bars'))
        }
      }
    },
  },

  // ------------------------------------------------------------------ throne
  {
    id: 'fantasy-throne',
    name: 'Throne',
    themes: ['fantasy'],
    category: 'furniture',
    tags: ['throne', 'king', 'castle', 'hall', 'royal', 'dais'],
    roles: {
      gold: { label: 'Gold', color: 14 },
      goldShade: { label: 'Gold shade', color: 6 },
      wood: { label: 'Wood', color: 6 },
      stone: { label: 'Stone', color: 7 },
      cushion: { label: 'Cushion', color: 4 },
      dais: { label: 'Dais', color: 7 },
      daisLine: { label: 'Dais joints', color: 8 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 22, max: 54, default: 38 },
      { key: 'width', label: 'Width', type: 'int', min: 12, max: 28, default: 18 },
      {
        key: 'style', label: 'Style', type: 'select', default: 'gold',
        options: [{ value: 'gold', label: 'Gold' }, { value: 'wood', label: 'Carved wood' }, { value: 'stone', label: 'Stone' }],
      },
      { key: 'dais', label: 'Dais', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 112 },
    hasControl: true,
    generate(k, p, rng) {
      const H = p.n('height')
      const hw = p.n('width') / 2
      const dais = p.b('dais')
      const line = R('line')
      const style = p.s('style')
      const frame = R(style === 'gold' ? 'gold' : style === 'wood' ? 'wood' : 'stone')
      const trim = R(style === 'gold' ? 'goldShade' : style === 'wood' ? 'line' : 'daisLine')
      const base = dais ? -6 : 0
      if (dais) {
        k.withPriority('rows', () => {
          k.rect(-hw - 10, -3, hw + 10, 0, R('dais'), line)
          k.rect(-hw - 6, -6, hw + 6, -3, R('dais'), line)
          for (let x = -hw - 10 + rng.range(3, 6); x < hw + 8; x += rng.range(6, 10)) k.vline(x, -2.5, -0.5, R('daisLine'))
          for (let x = -hw - 6 + rng.range(3, 6); x < hw + 4; x += rng.range(6, 10)) k.vline(x, -5.5, -3.5, R('daisLine'))
        })
      }
      const draw = () => {
        const seat = 12
        const bw = hw - 1
        const sy = base - seat
        k.poly([[-bw, sy], [-bw, base - H + 7], [0, base - H], [bw, base - H + 7], [bw, sy]], frame, line)
        k.poly([[-bw + 2.5, sy - 1], [-bw + 2.5, base - H + 8], [0, base - H + 3.5], [bw - 2.5, base - H + 8], [bw - 2.5, sy - 1]], R('cushion'), trim)
        for (const x of [-bw, bw]) k.ellipse(x, base - H + 5, 1.3, 2.2, frame, line)
        k.ellipse(0, base - H - 1.5, 1.3, 2.2, frame, line)
        k.rect(-hw + 2, sy - 1, hw - 2, sy + 2, R('cushion'), line)
        for (const s of [-1, 1]) {
          k.rect(s * hw, sy - 6, s * (hw - 3), sy + 3, frame, line)
          k.ellipse(s * (hw - 1.5), sy - 6.5, 2, 1.5, frame, line)
        }
        k.rect(-hw + 1, sy + 2, hw - 1, base, frame, line)
        k.rect(-hw + 3, sy + 4, hw - 3, base - 2, trim)
      }
      // on a dais the throne must stay behind anyone standing on the dais in front of it
      if (dais) k.withPriority(k.bandAt(base), draw)
      else draw()
      k.wall([[-hw, base], [hw, base]])
    },
  },

  // ------------------------------------------------------------------ rug
  {
    id: 'fantasy-rug',
    name: 'Rug',
    themes: ['fantasy'],
    category: 'furniture',
    tags: ['rug', 'carpet', 'floor', 'runner'],
    roles: {
      rug: { label: 'Field', color: 4 },
      border: { label: 'Border', color: 14 },
      pattern: { label: 'Pattern', color: 1 },
      fringe: { label: 'Fringe', color: 15 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 16, max: 100, default: 46 },
      { key: 'depth', label: 'Depth', type: 'int', min: 6, max: 40, default: 16 },
      {
        key: 'shape', label: 'Shape', type: 'select', default: 'rect',
        options: [{ value: 'rect', label: 'Rectangle' }, { value: 'oval', label: 'Oval' }],
      },
      {
        key: 'pattern', label: 'Pattern', type: 'select', default: 'border',
        options: [{ value: 'border', label: 'Border and medallion' }, { value: 'stripes', label: 'Stripes' }, { value: 'plain', label: 'Plain' }],
      },
      { key: 'fringe', label: 'Fringe', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 140 },
    generate(k, p) {
      const hw = p.n('width') / 2
      const D = p.n('depth')
      const line = R('line')
      const pat = p.s('pattern')
      const cy = -D / 2
      if (p.s('shape') === 'oval') {
        k.ellipse(0, cy, hw, D / 2, pat === 'plain' ? R('rug') : R('border'), line)
        if (pat === 'border') {
          k.ellipse(0, cy, hw - 3, D / 2 - 1.5, R('rug'))
          k.ellipse(0, cy, hw * 0.35, D * 0.2, R('pattern'), R('border'))
        } else if (pat === 'stripes') {
          k.ellipse(0, cy, hw - 3, D / 2 - 1.5, R('rug'))
          k.ellipse(0, cy, hw - 6, D / 2 - 3, R('pattern'))
          k.ellipse(0, cy, hw - 9, D / 2 - 4.5, R('rug'))
        }
        return
      }
      const slope = D * 0.2
      const q = (i: number): LP[] => [[-hw + slope + i, -D + i * 0.6], [hw - slope - i, -D + i * 0.6], [hw - i, -i * 0.6], [-hw + i, -i * 0.6]]
      const edgeX = (y: number) => hw - slope * (-y / D)
      if (p.b('fringe')) {
        for (let y = -D + 1; y < -0.5; y += 2) {
          const e = edgeX(y)
          k.hline(-e - 2, -e, y, R('fringe'))
          k.hline(e, e + 2, y, R('fringe'))
        }
      }
      k.poly(q(0), pat === 'plain' ? R('rug') : R('border'), line)
      if (pat === 'border') {
        k.poly(q(3), R('rug'))
        const mw = Math.max(3, hw * 0.3)
        const mh = Math.max(2, D * 0.28)
        k.poly([[0, cy - mh], [mw, cy], [0, cy + mh], [-mw, cy]], R('pattern'), R('border'))
        for (const s of [-1, 1]) k.poly([[s * (hw - 7), cy - 1], [s * (hw - 5), cy], [s * (hw - 7), cy + 1], [s * (hw - 9), cy]], R('pattern'))
      } else if (pat === 'stripes') {
        k.poly(q(2), R('rug'))
        let i = 0
        for (let y = -D + 3; y < -2; y += 3, i++) {
          const e = edgeX(y) - 2
          k.hline(-e, e, y, R(i % 2 ? 'border' : 'pattern'))
        }
      }
    },
  },
]
