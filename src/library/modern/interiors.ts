import type { ColorRef } from '../../agi/commands'
import { R } from '../../kit/helpers'
import type { ElementDef } from '../types'
import { W, type Pt2 } from './common'

/** One-point perspective helpers around a vanishing point. */
function persp(vx: number, vy: number) {
  return {
    /** Point pushed away from the VP by factor f (f > 1 moves toward the viewer). */
    ext: (x: number, y: number, f = 8): Pt2 => [vx + (x - vx) * f, vy + (y - vy) * f],
    /** y on the VP line through (x0, y0), at column x. */
    yAt: (x0: number, y0: number, x: number) => vy + ((y0 - vy) * (x - vx)) / (x0 - vx),
    /** x on the VP line through (x0, y0), at row y. */
    xAt: (x0: number, y0: number, y: number) => vx + ((x0 - vx) * (y - vy)) / (y0 - vy),
  }
}

export const interiors: ElementDef[] = [
  {
    id: 'modern-room',
    name: 'Room shell',
    themes: ['modern'],
    category: 'interior',
    tags: ['room', 'interior', 'office', 'bar', 'hotel', 'walls', 'floor', 'perspective'],
    span: 'full',
    roles: {
      wall: { label: 'Office walls', color: 7 },
      paper: { label: 'Hotel wallpaper', color: 3 },
      panel: { label: 'Bar walls', color: 1 },
      wood: { label: 'Wood / doors', color: 6 },
      floor: { label: 'Office floor', color: 8 },
      tile: { label: 'Floor lines', color: 7 },
      carpet: { label: 'Hotel carpet', color: 4 },
      ceiling: { label: 'Ceiling', color: 7 },
      light: { label: 'Ceiling lights', color: 15 },
      trim: { label: 'Baseboard / stripes', color: 8 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'style', label: 'Style', type: 'select', default: 'office',
        options: [
          { value: 'office', label: 'Office' },
          { value: 'bar', label: 'Bar' },
          { value: 'hotel', label: 'Hotel room' },
        ],
      },
      { key: 'width', label: 'Back wall width', type: 'int', min: 40, max: 150, default: 92 },
      { key: 'height', label: 'Back wall height', type: 'int', min: 30, max: 100, default: 58 },
      {
        key: 'door', label: 'Door', type: 'select', default: 'back',
        options: [
          { value: 'none', label: 'None' },
          { value: 'back', label: 'Back wall' },
          { value: 'left', label: 'Left wall' },
          { value: 'right', label: 'Right wall' },
        ],
      },
      { key: 'details', label: 'Details', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 98 },
    hasControl: true,
    generate(k, p) {
      const y = Math.round(k.ctx.y)
      const style = p.s('style')
      const bw = p.n('width')
      const bh = p.n('height')
      const details = p.b('details')
      const L = Math.round(80 - bw / 2)
      const Rt = Math.round(80 + bw / 2)
      const T = y - bh
      const vx = 80
      const vy = Math.round(y - bh * 0.42)
      const { ext, yAt, xAt } = persp(vx, vy)
      const M = 8 // depth steps: rows sit at a * M / (M - i)

      const wallC: ColorRef = style === 'bar' ? R('panel') : style === 'hotel' ? R('paper') : R('wall')
      const floorC: ColorRef = style === 'bar' ? R('wood') : style === 'hotel' ? R('carpet') : R('floor')
      const ceilC: ColorRef = style === 'bar' ? R('panel') : R('ceiling')

      // --- floor
      k.poly([[L, y], [Rt, y], ext(Rt, y), ext(L, y)], floorC)
      if (details && style === 'office') {
        for (let i = 1; i < M; i++) {
          const yy = Math.round(vy + ((y - vy) * M) / (M - i))
          if (yy > 167) break
          k.hline(0, W, yy, R('tile'))
        }
        const step = bw / 8
        for (let j = -24; j <= 32; j++) {
          const bx = L + j * step
          const bot = xAt(bx, y, 167)
          if (bot < -40 || bot > W + 40) continue
          k.line([[bx, y], ext(bx, y)], R('tile'))
        }
      } else if (details && style === 'bar') {
        const step = bw / 14
        for (let j = -40; j <= 54; j++) {
          const bx = L + j * step
          const bot = xAt(bx, y, 167)
          if (bot < -40 || bot > W + 40) continue
          k.line([[bx, y], ext(bx, y)], R('line'))
        }
      } else if (details && style === 'hotel') {
        // rug in front of the back wall
        const r0 = vy + ((y - vy) * M) / (M - 1.5)
        const r1 = Math.min(166, vy + ((y - vy) * M) / (M - 4.5))
        const rl = L + bw * 0.22
        const rr = Rt - bw * 0.22
        k.poly([[xAt(rl, y, r0), r0], [xAt(rr, y, r0), r0], [xAt(rr, y, r1), r1], [xAt(rl, y, r1), r1]], R('wood'), R('line'))
        k.poly([[xAt(rl + 3, y, r0 + 2), r0 + 2], [xAt(rr - 3, y, r0 + 2), r0 + 2], [xAt(rr - 3, y, r1 - 2), r1 - 2], [xAt(rl + 3, y, r1 - 2), r1 - 2]], R('carpet'))
      }

      // --- ceiling
      if (T > 0) {
        k.poly([[L, T], [Rt, T], ext(Rt, T), ext(L, T)], ceilC)
        if (details && style === 'office') {
          for (let i = 1; i < M; i += 2) {
            const y0 = vy + ((T - vy) * M) / (M - i)
            const y1 = vy + ((T - vy) * M) / (M - i - 0.8)
            if (y0 < 0) break
            for (const f of [0.3, 0.7]) {
              const a = L + bw * (f - 0.08)
              const b = L + bw * (f + 0.08)
              k.poly([[xAt(a, T, y0), y0], [xAt(b, T, y0), y0], [xAt(b, T, y1), y1], [xAt(a, T, y1), y1]], R('light'), R('line'))
            }
          }
        } else if (details && style === 'bar') {
          for (let j = 0; j < 4; j++) {
            const bx = L + (bw * (j + 0.5)) / 4
            k.line([[bx, T], ext(bx, T)], R('line'))
          }
        } else if (details && style === 'hotel') {
          k.line([[L, T + 2], [Rt, T + 2]], R('trim'))
        }
      }

      // --- side walls
      const side = (x: number) => {
        k.poly([[x, T], [x, y], ext(x, y), ext(x, T)], wallC)
      }
      side(L)
      side(Rt)

      // --- back wall
      k.rect(L, T, Rt, y, wallC)

      // wall details, applied to the back wall and both side walls
      const wallLine = (frac: number, color: ColorRef) => {
        const yy = y - bh * frac
        k.hline(L, Rt, yy, color)
        k.line([[L, yy], ext(L, yy)], color)
        k.line([[Rt, yy], ext(Rt, yy)], color)
      }
      const verticals = (step: number, fromFrac: number, color: ColorRef) => {
        const top = (x: number, x0: number) => yAt(x0, y - bh * fromFrac, x)
        for (let x = L + step; x < Rt - 1; x += step) k.vline(x, y - bh * fromFrac, y - 1, color)
        for (const x0 of [L, Rt]) {
          for (let i = 1; i < 40; i++) {
            const x = vx + ((x0 - vx) * M * 2) / (M * 2 - i)
            if (x < -1 || x > W + 1) break
            k.line([[x, top(x, x0)], [x, yAt(x0, y, x)]], color)
          }
        }
      }
      if (details) {
        if (style === 'bar') {
          verticals(Math.max(3, bw / 18), 1, R('line'))
          wallLine(0.4, R('wood'))
        } else if (style === 'hotel') {
          verticals(Math.max(3, bw / 22), 1, R('trim'))
          // wainscot below the chair rail
          const rail = y - bh * 0.3
          k.rect(L, rail, Rt, y, R('wood'))
          for (const x0 of [L, Rt]) k.poly([[x0, rail], [x0, y], ext(x0, y), ext(x0, rail)], R('wood'))
          wallLine(0.3, R('line'))
        }
        // baseboard
        const bb = style === 'office' ? R('trim') : R('line')
        k.rect(L, y - 2, Rt, y, bb)
        for (const x0 of [L, Rt]) k.poly([[x0, y - 2], [x0, y], ext(x0, y), ext(x0, y - 2)], bb)
      }

      // --- door
      let door = p.s('door')
      const dh = Math.min(36, bh - 4)
      let sideDoor: { x1: number; x2: number; x0: number } | null = null
      if (door === 'left' || door === 'right') {
        const x0 = door === 'left' ? L : Rt
        const x1 = vx + ((x0 - vx) * M) / (M - 1.2)
        const x2 = vx + ((x0 - vx) * M) / (M - 2.4)
        if (x2 >= 1 && x2 <= W - 1) sideDoor = { x0, x1, x2 }
        else door = 'back'
      }
      let backDoor: [number, number] | null = null
      if (door === 'back' && bw >= 24) {
        const want = p.s('door') === 'right' ? Rt - 12 : p.s('door') === 'left' ? L + 12 : L + bw * 0.72
        const dx = Math.max(L + 9, Math.min(Rt - 9, want))
        backDoor = [dx - 7, dx + 7]
        k.rect(dx - 9, y - dh - 3, dx + 9, y, R('line'))
        k.rect(dx - 8, y - dh - 2, dx + 8, y, style === 'bar' ? R('wood') : R('trim'))
        k.rect(dx - 7, y - dh, dx + 7, y, R('wood'), R('line'))
        k.outline([[dx - 5, y - dh + 3], [dx + 5, y - dh + 3], [dx + 5, y - dh + 15], [dx - 5, y - dh + 15]], R('line'))
        k.dot(dx + 5, y - dh * 0.45, R('light'))
      }
      if (sideDoor) {
        const { x0, x1, x2 } = sideDoor
        const top = y - dh
        const q: Pt2[] = [[x1, yAt(x0, y, x1)], [x1, yAt(x0, top, x1)], [x2, yAt(x0, top, x2)], [x2, yAt(x0, y, x2)]]
        const fr: Pt2[] = [[x1, yAt(x0, y, x1)], [x1, yAt(x0, top - 2, x1)], [x2, yAt(x0, top - 2, x2)], [x2, yAt(x0, y, x2)]]
        k.poly(fr, R('line'))
        k.poly(q, R('wood'), R('line'))
        const kx = x1 + (x2 - x1) * 0.2
        k.dot(kx, yAt(x0, y - dh * 0.45, kx), R('light'))
      }

      // --- edges
      k.line([[L, T], [L, y]], R('line'))
      k.line([[Rt, T], [Rt, y]], R('line'))
      k.line([[L, y], [Rt, y]], R('line'))
      k.line([[L, y], ext(L, y)], R('line'))
      k.line([[Rt, y], ext(Rt, y)], R('line'))
      if (T > 0) {
        k.line([[L, T], [Rt, T]], R('line'))
        k.line([[L, T], ext(L, T)], R('line'))
        k.line([[Rt, T], ext(Rt, T)], R('line'))
      }

      // --- control: walls along every floor edge, triggers in doorways
      if (backDoor) {
        k.wall([[L, y], [backDoor[0] - 1, y]])
        k.trigger([[backDoor[0], y], [backDoor[1], y]])
        k.wall([[backDoor[1] + 1, y], [Rt, y]])
      } else k.wall([[L, y], [Rt, y]])
      for (const x0 of [L, Rt]) {
        if (sideDoor && sideDoor.x0 === x0) {
          const { x1, x2 } = sideDoor
          k.wall([[x0, y], [x1, yAt(x0, y, x1)]])
          k.trigger([[x1, yAt(x0, y, x1)], [x2, yAt(x0, y, x2)]])
          k.wall([[x2, yAt(x0, y, x2)], ext(x0, y)])
        } else k.wall([[x0, y], ext(x0, y)])
      }
    },
  },
  {
    id: 'modern-desk',
    name: 'Office desk',
    themes: ['modern'],
    category: 'furniture',
    tags: ['desk', 'office', 'phone', 'papers', 'police', 'computer'],
    roles: {
      top: { label: 'Desktop', color: 6 },
      body: { label: 'Body', color: 6 },
      dark: { label: 'Knee hole', color: 0 },
      handle: { label: 'Handles', color: 7 },
      paper: { label: 'Papers', color: 15 },
      ink: { label: 'Paper lines', color: 7 },
      phone: { label: 'Phone', color: 0 },
      lamp: { label: 'Lamp shade', color: 2 },
      case: { label: 'Terminal case', color: 7 },
      screen: { label: 'Screen', color: 2 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 26, max: 60, default: 40 },
      { key: 'phone', label: 'Phone', type: 'bool', default: true },
      { key: 'papers', label: 'Papers', type: 'bool', default: true },
      {
        key: 'extra', label: 'On the desk', type: 'select', default: 'lamp',
        options: [
          { value: 'none', label: 'Nothing' },
          { value: 'lamp', label: 'Desk lamp' },
          { value: 'terminal', label: 'Computer terminal' },
          { value: 'typewriter', label: 'Typewriter' },
        ],
      },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 132 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = Math.round(p.n('width') / 2)
      const top = -14
      const back = -19
      const pw = Math.max(6, Math.round(hw * 0.55))
      // top surface, slightly narrower at the back
      k.poly([[-hw + 2, back], [hw - 2, back], [hw, top], [-hw, top]], R('top'), R('line'))
      // front: pedestals, center drawer, knee hole
      k.rect(-hw, top, hw, 0, R('body'), R('line'))
      k.rect(-hw + pw, top + 3, hw - pw, 0, R('dark'), R('line'))
      k.hline(-hw + pw + 1, hw - pw - 1, top + 1.5, R('handle'))
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -hw : hw - pw
        const x1 = s < 0 ? -hw + pw : hw
        for (const dy of [top + 5, top + 9]) k.hline(x0, x1, dy, R('line'))
        for (const dy of [top + 3, top + 7, top + 11]) k.hline((x0 + x1) / 2 - 1, (x0 + x1) / 2 + 1, dy, R('handle'))
      }
      k.hline(-hw, hw, 0, R('line'))

      // items sit on the top surface; the "floor" of the desktop is y = -16
      const sy = -16
      const extra = p.s('extra')
      if (extra === 'lamp') {
        const lx = -hw + 6
        k.rect(lx - 3, sy - 1, lx + 3, sy, R('handle'), R('line'))
        k.vline(lx, sy - 6, sy - 1, R('line'))
        k.poly(k.ellipsePts(lx, sy - 6, 5, 4, 12, Math.PI, Math.PI * 2), R('lamp'), R('line'))
      } else if (extra === 'terminal') {
        const tx = -hw + 10
        k.rect(tx - 7, sy - 13, tx + 7, sy - 2, R('case'), R('line'))
        k.rect(tx - 5, sy - 11, tx + 5, sy - 4, R('screen'), R('line'))
        for (let yy = sy - 10; yy <= sy - 6; yy += 2) k.hline(tx - 4, tx + rng.int(-2, 4), yy, R('paper'))
        k.rect(tx - 8, sy - 1, tx + 8, sy + 1, R('case'), R('line'))
      } else if (extra === 'typewriter') {
        const tx = -hw + 9
        k.poly([[tx - 6, sy + 1], [tx + 6, sy + 1], [tx + 5, sy - 4], [tx - 5, sy - 4]], R('phone'), R('line'))
        k.rect(tx - 7, sy - 6, tx + 7, sy - 5, R('handle'), R('line'))
        k.rect(tx - 3, sy - 10, tx + 3, sy - 6, R('paper'), R('line'))
      }
      if (p.b('papers')) {
        const px0 = extra === 'none' ? -4 : 0
        k.poly([[px0 - 4, sy + 1], [px0 + 4, sy + 1], [px0 + 5, sy - 1], [px0 - 3, sy - 1]], R('paper'), R('line'))
        k.hline(px0 - 2, px0 + 2, sy, R('ink'))
        const stack = rng.int(2, 4)
        const sx = px0 + 9
        k.rect(sx - 3, sy - stack, sx + 3, sy + 1, R('paper'), R('line'))
        for (let i = 1; i < stack; i++) k.hline(sx - 3, sx + 3, sy + 1 - i, R('ink'))
      }
      if (p.b('phone')) {
        const fx = hw - 7
        k.poly([[fx - 4, sy + 1], [fx + 4, sy + 1], [fx + 3, sy - 3], [fx - 3, sy - 3]], R('phone'), R('line'))
        k.rect(fx - 5, sy - 5, fx + 5, sy - 4, R('phone'), R('line'))
        k.dot(fx, sy - 1, R('handle'))
        k.line([[fx + 4, sy], [fx + 6, sy + 2]], R('line'))
      }
      k.wall([[-hw, 0], [hw, 0]])
    },
  },
  {
    id: 'modern-chair',
    name: 'Office chair',
    themes: ['modern'],
    category: 'furniture',
    tags: ['chair', 'office', 'seat', 'swivel'],
    roles: {
      seat: { label: 'Upholstery', color: 1 },
      frame: { label: 'Frame', color: 8 },
      wood: { label: 'Wood', color: 6 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'swivel',
        options: [
          { value: 'swivel', label: 'Swivel chair' },
          { value: 'guest', label: 'Guest chair' },
          { value: 'arm', label: 'Club armchair' },
        ],
      },
      { key: 'back', label: 'Back height', type: 'int', min: 6, max: 16, default: 11 },
      {
        key: 'facing', label: 'Facing', type: 'select', default: 'front',
        options: [
          { value: 'front', label: 'Toward viewer' },
          { value: 'back', label: 'Away from viewer' },
        ],
      },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 140 },
    hasControl: true,
    generate(k, p) {
      const kind = p.s('kind')
      const bh = p.n('back')
      const away = p.s('facing') === 'back'
      if (kind === 'swivel') {
        // five-star base with casters
        k.hline(-6, 6, -1, R('frame'))
        k.line([[-6, -1], [0, -3], [6, -1]], R('line'))
        for (const x of [-6, -2, 2, 6]) k.dot(x, 0, R('line'))
        k.rect(-1, -8, 0, -2, R('frame'), R('line'))
        const seatY = -9
        if (away) {
          k.poly(k.ellipsePts(0, seatY, 6, 2, 12), R('seat'), R('line'))
          k.rect(-5, seatY - bh - 2, 5, seatY - 1, R('seat'), R('line'))
          k.vline(0, seatY - 1, seatY + 1, R('frame'))
        } else {
          k.rect(-5, seatY - bh - 2, 5, seatY - 2, R('seat'), R('line'))
          k.hline(-3, 3, seatY - bh + 1, R('line'))
          k.poly([[-6, seatY - 2], [6, seatY - 2], [6, seatY + 1], [-6, seatY + 1]], R('seat'), R('line'))
          k.rect(-8, seatY - 5, -6, seatY - 4, R('frame'), R('line'))
          k.rect(6, seatY - 5, 8, seatY - 4, R('frame'), R('line'))
          k.vline(-7, seatY - 4, seatY, R('line'))
          k.vline(7, seatY - 4, seatY, R('line'))
        }
        k.wall([[-5, 0], [5, 0]])
      } else if (kind === 'guest') {
        // four legs, wooden frame, padded seat and back
        const seatY = -10
        for (const x of [-5, 5]) k.rect(x - 0.5, seatY, x + 0.5, 0, R('wood'), R('line'))
        k.hline(-5, 5, -4, R('wood'))
        k.rect(-6, seatY - 1, 6, seatY + 1, R('seat'), R('line'))
        const bt = seatY - bh - 1
        if (away) k.rect(-5, bt, 5, seatY, R('wood'), R('line'))
        else {
          k.rect(-5, bt, -4, seatY - 1, R('wood'), R('line'))
          k.rect(4, bt, 5, seatY - 1, R('wood'), R('line'))
          k.rect(-4, bt + 1, 4, seatY - 3, R('seat'), R('line'))
        }
        k.wall([[-5, 0], [5, 0]])
      } else {
        // squat upholstered club chair
        const seatY = -7
        const bt = seatY - bh
        k.rect(-7, bt, 7, seatY, R('seat'), R('line'))
        if (!away) k.rect(-6, seatY - 2, 6, seatY + 1, R('seat'), R('line'))
        k.rect(-10, seatY - 6, -6, -1, R('seat'), R('line'))
        k.rect(6, seatY - 6, 10, -1, R('seat'), R('line'))
        k.rect(-10, -1, 10, 0, R('wood'), R('line'))
        k.wall([[-10, 0], [10, 0]])
      }
    },
  },
  {
    id: 'modern-bar-counter',
    name: 'Bar counter with stools',
    themes: ['modern'],
    category: 'furniture',
    tags: ['bar', 'counter', 'stools', 'lounge', 'drinks'],
    roles: {
      wood: { label: 'Counter front', color: 6 },
      top: { label: 'Counter top', color: 4 },
      kick: { label: 'Kick plate', color: 0 },
      rail: { label: 'Foot rail', color: 14 },
      seat: { label: 'Stool seats', color: 12 },
      chrome: { label: 'Chrome', color: 7 },
      bottle: { label: 'Bottles', color: 2 },
      bottle2: { label: 'Bottles 2', color: 6 },
      glass: { label: 'Glasses', color: 11 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'length', label: 'Length', type: 'int', min: 30, max: 156, default: 96 },
      { key: 'stools', label: 'Stools', type: 'int', min: 0, max: 10, default: 5 },
      { key: 'bottles', label: 'Drinks on top', type: 'bool', default: true },
      { key: 'rail', label: 'Brass foot rail', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 136 },
    hasControl: true,
    generate(k, p, rng) {
      const a = Math.round(p.n('length') / 2)
      const base = -4
      const topY = -22
      // counter top slab and front
      k.rect(-a, topY + 2, a, base, R('wood'), R('line'))
      const n = Math.max(1, Math.round((2 * a) / 12))
      const pw = (2 * a) / n
      for (let i = 0; i < n; i++) {
        const x0 = -a + i * pw + 2
        const x1 = -a + (i + 1) * pw - 2
        if (x1 - x0 >= 3) k.outline([[x0, topY + 5], [x1, topY + 5], [x1, base - 5], [x0, base - 5]], R('line'))
      }
      k.rect(-a, base - 2, a, base, R('kick'), R('line'))
      k.rect(-a - 1, topY - 1, a + 1, topY + 2, R('top'), R('line'))
      if (p.b('rail')) {
        k.hline(-a, a, base - 5, R('rail'))
        for (let x = -a + 6; x < a - 3; x += 16) k.vline(x, base - 5, base - 3, R('rail'))
      }
      // drinks on the counter
      if (p.b('bottles')) {
        let x = -a + rng.int(2, 6)
        while (x < a - 2) {
          const r = rng.next()
          if (r < 0.3) {
            k.rect(x, topY - 5, x, topY - 2, R(rng.chance(0.5) ? 'bottle' : 'bottle2'))
            k.dot(x, topY - 6, R('line'))
          } else if (r < 0.65) k.rect(x, topY - 3, x + 1, topY - 2, R('glass'))
          x += rng.int(3, 9)
        }
      }
      // stools in front, evenly spaced
      const ns = p.n('stools')
      for (let i = 0; i < ns; i++) {
        const sx = -a + ((2 * a) * (i + 0.5)) / ns
        const seatY = -13
        k.vline(sx, seatY + 1, -1, R('chrome'))
        k.hline(sx - 2, sx + 2, -5, R('chrome'))
        k.hline(sx - 2, sx + 2, -1, R('chrome'))
        k.hline(sx - 3, sx + 3, 0, R('line'))
        k.rect(sx - 4, seatY - 1, sx + 4, seatY + 1, R('seat'), R('line'))
      }
      k.wall([[-a, base], [a, base]])
    },
  },
  {
    id: 'modern-jukebox',
    name: 'Jukebox',
    themes: ['modern'],
    category: 'furniture',
    tags: ['jukebox', 'music', 'bar', 'diner', 'neon'],
    roles: {
      cabinet: { label: 'Cabinet', color: 6 },
      tube: { label: 'Light tube 1', color: 12 },
      tube2: { label: 'Light tube 2', color: 14 },
      tube3: { label: 'Light tube 3', color: 11 },
      glass: { label: 'Dome glass', color: 3 },
      panel: { label: 'Selection panel', color: 15 },
      grille: { label: 'Grille', color: 8 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'style', label: 'Style', type: 'select', default: 'arch',
        options: [
          { value: 'arch', label: 'Classic arch' },
          { value: 'box', label: 'Modern box' },
        ],
      },
      { key: 'height', label: 'Height', type: 'int', min: 22, max: 36, default: 30 },
      { key: 'lit', label: 'Lit', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p) {
      const h = p.n('height')
      const hw = 8
      const lit = p.b('lit')
      const t1 = lit ? R('tube') : R('grille')
      const t2 = lit ? R('tube2') : R('grille')
      const t3 = lit ? R('tube3') : R('grille')
      if (p.s('style') === 'arch') {
        const springY = -h + hw * 1.3
        const arch = k.ellipsePts(0, springY, hw, hw * 1.3, 16, Math.PI, Math.PI * 2)
        k.poly([[-hw, 0], ...arch, [hw, 0]], R('cabinet'), R('line'))
        // light tubes follow the arch and run down the sides
        k.line([[-hw + 1, -3], ...k.ellipsePts(0, springY, hw - 1, hw * 1.3 - 1, 16, Math.PI, Math.PI * 2), [hw - 1, -3]], t1)
        k.line([[-hw + 2, -3], ...k.ellipsePts(0, springY, hw - 2, hw * 1.3 - 2, 16, Math.PI, Math.PI * 2), [hw - 2, -3]], t2)
        k.poly(k.ellipsePts(0, springY + 1, hw - 4, hw * 1.3 - 4, 12, Math.PI, Math.PI * 2), R('glass'), R('line'))
        k.hline(-hw + 4, hw - 4, springY + 1, R('line'))
        k.rect(-hw + 3, springY + 2, hw - 3, springY + 5, R('panel'), R('line'))
        k.hline(-hw + 4, hw - 4, springY + 3.5, R('grille'))
        k.rect(-hw + 3, springY + 7, hw - 3, -3, R('grille'), R('line'))
        for (let x = -hw + 5; x < hw - 3; x += 2) k.vline(x, springY + 8, -4, R('line'))
        k.line([[-hw + 3, springY + 6], [hw - 3, springY + 6]], t3)
      } else {
        k.rect(-hw, -h, hw, 0, R('cabinet'), R('line'))
        k.rect(-hw + 1, -h + 1, hw - 1, -h + 2, t1)
        k.rect(-hw + 2, -h + 4, hw - 2, -h + 12, R('glass'), R('line'))
        k.ellipse(0, -h + 8, 3, 3, R('line'))
        k.dot(0, -h + 8, R('panel'))
        k.rect(-hw + 2, -h + 14, hw - 2, -h + 17, R('panel'), R('line'))
        k.vline(-hw + 1, -h + 3, -2, t2)
        k.vline(hw - 1, -h + 3, -2, t3)
        k.rect(-hw + 3, -h + 19, hw - 3, -3, R('grille'), R('line'))
        for (let yy = -h + 21; yy < -3; yy += 2) k.hline(-hw + 4, hw - 4, yy, R('line'))
      }
      k.rect(-hw, -2, hw, 0, R('line'))
      k.wall([[-hw, 0], [hw, 0]])
    },
  },
  {
    id: 'modern-blinds',
    name: 'Window with blinds',
    themes: ['modern'],
    category: 'structure',
    tags: ['window', 'blinds', 'office', 'interior', 'noir', 'wall'],
    roles: {
      frame: { label: 'Frame', color: 15 },
      slat: { label: 'Slats', color: 7 },
      slat2: { label: 'Slat shadow', color: 8 },
      day: { label: 'Day sky', color: 11 },
      night: { label: 'Night sky', color: 1 },
      city: { label: 'City', color: 8 },
      lit: { label: 'Lit windows', color: 14 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 12, max: 60, default: 28 },
      { key: 'height', label: 'Height', type: 'int', min: 12, max: 44, default: 24 },
      { key: 'blinds', label: 'Blinds down %', type: 'int', min: 0, max: 100, default: 60 },
      {
        key: 'view', label: 'View', type: 'select', default: 'city',
        options: [
          { value: 'day', label: 'Day sky' },
          { value: 'night', label: 'Night sky' },
          { value: 'city', label: 'City at night' },
        ],
      },
      { key: 'tilt', label: 'Slats open', type: 'bool', default: false },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 70 },
    generate(k, p, rng) {
      const hw = Math.round(p.n('width') / 2)
      const h = p.n('height')
      const view = p.s('view')
      const sky = view === 'day' ? R('day') : R('night')
      // frame and glass
      k.rect(-hw - 1, -h - 1, hw + 1, 0, R('frame'), R('line'))
      k.rect(-hw + 1, -h + 1, hw - 1, -2, sky, R('line'))
      if (view === 'city') {
        let x = -hw + 2
        while (x < hw - 1) {
          const bw = rng.int(3, 7)
          const bt = -rng.int(4, Math.max(5, h - 4))
          const x1 = Math.min(hw - 2, x + bw)
          k.rect(x, bt, x1, -3, R('city'))
          for (let wy = bt + 2; wy < -3; wy += 3) for (let wx = x + 1; wx < x1; wx += 2) if (rng.chance(0.3)) k.dot(wx, wy, R('lit'))
          x = x1 + 1
        }
      } else if (view === 'day') {
        k.blob(rng.range(-hw * 0.4, hw * 0.4), -h * 0.6, Math.min(8, hw * 0.4), 2.5, rng, R('frame'), undefined, 6, 0.3)
      }
      k.vline(0, -h + 1, -2, R('line')) // mullion
      // blinds from the top down
      const down = Math.round(((h - 3) * p.n('blinds')) / 100)
      const tilt = p.b('tilt')
      for (let i = 0; i < down; i++) {
        const yy = -h + 1 + i
        if (i % 2 === 0) k.hline(-hw + 1, hw - 1, yy, R('slat'))
        else if (!tilt) k.hline(-hw + 1, hw - 1, yy, R('slat2'))
      }
      if (down > 0) {
        k.rect(-hw + 1, -h + down, hw - 1, -h + down + 1, R('slat2'), R('line'))
        k.vline(hw - 3, -h + 1, Math.min(-2, -h + down + 5), R('line')) // pull cord
      }
      k.rect(-hw - 2, 0, hw + 2, 1, R('frame'), R('line')) // sill
    },
  },
  {
    id: 'modern-vending',
    name: 'Vending machine',
    themes: ['modern'],
    category: 'furniture',
    tags: ['vending', 'soda', 'snack', 'machine', 'hallway'],
    roles: {
      soda: { label: 'Soda body', color: 4 },
      snack: { label: 'Snack body', color: 8 },
      logo: { label: 'Logo', color: 15 },
      glass: { label: 'Glass', color: 3 },
      button: { label: 'Buttons', color: 7 },
      lit: { label: 'Lit panel', color: 14 },
      goods: { label: 'Goods 1', color: 12 },
      goods2: { label: 'Goods 2', color: 10 },
      goods3: { label: 'Goods 3', color: 14 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'soda',
        options: [
          { value: 'soda', label: 'Soda' },
          { value: 'snack', label: 'Snacks' },
        ],
      },
      { key: 'height', label: 'Height', type: 'int', min: 28, max: 44, default: 36 },
      { key: 'width', label: 'Width', type: 'int', min: 10, max: 20, default: 14 },
      { key: 'lit', label: 'Lit', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 128 },
    hasControl: true,
    generate(k, p, rng) {
      const h = p.n('height')
      const hw = Math.round(p.n('width') / 2)
      const lit = p.b('lit')
      const soda = p.s('kind') === 'soda'
      const body = soda ? R('soda') : R('snack')
      k.rect(-hw, -h, hw, 0, body, R('line'))
      const px = hw - 4 // control column on the right
      if (soda) {
        // big logo panel with a wave
        k.rect(-hw + 1, -h + 2, px - 1, -8, lit ? R('soda') : R('button'), R('line'))
        const midY = -h * 0.55
        k.poly([[-hw + 2, midY + 2], [-hw * 0.2, midY - 3], [px - 2, midY - 1], [px - 2, midY + 2], [-hw * 0.2, midY + 1], [-hw + 2, midY + 5]], R('logo'))
        for (let yy = -h + 3; yy < -9; yy += 3) k.rect(px + 1, yy, hw - 2, yy + 1, lit && yy < -h + 10 ? R('lit') : R('button'), R('line'))
      } else {
        // glass front with rows of snacks on coils
        k.rect(-hw + 1, -h + 2, px - 1, -9, R('glass'), R('line'))
        for (let yy = -h + 7; yy < -9; yy += 6) {
          k.hline(-hw + 2, px - 2, yy, R('line'))
          for (let x = -hw + 2; x < px - 2; x += 3) k.rect(x, yy - 3, x + 1, yy - 1, R(rng.pick(['goods', 'goods2', 'goods3'])))
        }
        k.rect(px + 1, -h + 3, hw - 2, -h + 6, lit ? R('lit') : R('button'), R('line'))
        for (let yy = -h + 9; yy < -h + 17; yy += 2) k.hline(px + 1, hw - 2, yy, R('button'))
      }
      k.rect(px + 1, -h * 0.35, hw - 2, -h * 0.35 + 2, R('line'))
      k.rect(-hw + 2, -6, px - 2, -2, R('line'))
      k.hline(-hw + 3, px - 3, -4, R('button'))
      k.wall([[-hw, 0], [hw, 0]])
    },
  },
  {
    id: 'modern-plant',
    name: 'Potted plant',
    themes: ['modern'],
    category: 'furniture',
    tags: ['plant', 'pot', 'office', 'lobby', 'ficus', 'fern'],
    roles: {
      leaf: { label: 'Leaves', color: 2 },
      leafLight: { label: 'Highlight', color: 10 },
      pot: { label: 'Pot', color: 6 },
      stem: { label: 'Stem', color: 6 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 12, max: 44, default: 26 },
      {
        key: 'plant', label: 'Plant', type: 'select', default: 'ficus',
        options: [
          { value: 'ficus', label: 'Ficus' },
          { value: 'fern', label: 'Fern' },
          { value: 'snake', label: 'Snake plant' },
        ],
      },
      {
        key: 'pot', label: 'Pot', type: 'select', default: 'round',
        options: [
          { value: 'round', label: 'Clay pot' },
          { value: 'square', label: 'Planter box' },
          { value: 'urn', label: 'Tall urn' },
        ],
      },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 130, y: 132 },
    hasControl: true,
    generate(k, p, rng) {
      const h = p.n('height')
      const potKind = p.s('pot')
      const ph = potKind === 'urn' ? Math.max(8, h * 0.4) : Math.max(5, h * 0.25)
      const pw = potKind === 'square' ? 5 : 4
      const plant = p.s('plant')
      const top = -ph
      const ch = h - ph // foliage height
      // foliage first, pot drawn over its base
      if (plant === 'ficus') {
        k.line([[0, top], [0, top - ch * 0.5]], R('stem'))
        const n = Math.max(2, Math.round(ch / 7))
        for (let i = 0; i < n; i++) {
          const t = i / Math.max(1, n - 1)
          const cy = top - ch * (0.35 + 0.5 * t)
          const cx = rng.range(-2, 2)
          const rx = Math.max(3, (ch * 0.28) * (1 - t * 0.4))
          k.blob(cx, cy, rx, ch * 0.2, rng, R('leaf'), R('line'), 6, 0.3)
          k.blob(cx - rx * 0.3, cy - ch * 0.05, rx * 0.4, ch * 0.07, rng, R('leafLight'), undefined, 4, 0.3)
        }
      } else if (plant === 'fern') {
        const n = 9
        for (let i = 0; i < n; i++) {
          const a = Math.PI * (0.08 + (0.84 * i) / (n - 1))
          const len = ch * rng.range(0.7, 1)
          const ex = -Math.cos(a) * len * 0.55
          const ey = top - Math.sin(a) * len
          const droop = Math.abs(Math.cos(a)) * ch * 0.35
          const pts: Pt2[] = [[0, top], [ex * 0.6, (top + ey) / 2 - 1], [ex, ey + droop]]
          k.line(pts, R('line'))
          k.line(pts.map(([x, y]) => [x + 0.6, y + 1] as Pt2), R(i % 2 ? 'leaf' : 'leafLight'))
        }
      } else {
        // upright tapered blades, back row dark and front row light, no outlines
        const n = 7
        for (const front of [false, true]) {
          for (let i = front ? 1 : 0; i < n; i += 2) {
            const x = (i - (n - 1) / 2) * 1.3
            const lh = ch * (front ? 0.8 : 1) * rng.range(0.85, 1)
            const tip = x * 1.35 + rng.range(-0.5, 0.5)
            k.poly([[x - 1, top], [x + 1, top], [tip + 0.5, top - lh * 0.7], [tip, top - lh]], R(front ? 'leafLight' : 'leaf'))
            k.line([[x, top], [tip, top - lh]], R(front ? 'leaf' : 'line'))
          }
        }
      }
      // pot
      if (potKind === 'round') {
        k.poly([[-pw, top], [pw, top], [pw - 1, 0], [-pw + 1, 0]], R('pot'), R('line'))
        k.rect(-pw - 1, top - 1, pw + 1, top + 1, R('pot'), R('line'))
      } else if (potKind === 'square') {
        k.rect(-pw, top, pw, 0, R('pot'), R('line'))
        k.hline(-pw, pw, top + 2, R('line'))
      } else {
        const u: Pt2[] = [[-pw + 1, top], [pw - 1, top], [pw + 1, top + ph * 0.4], [pw - 1, -2], [pw, 0], [-pw, 0], [-pw + 1, -2], [-pw - 1, top + ph * 0.4]]
        k.poly(u, R('pot'), R('line'))
        k.hline(-pw + 1, pw - 1, top + 1, R('line'))
      }
      k.wall([[-pw, 0], [pw, 0]])
    },
  },
  {
    id: 'modern-file-cabinet',
    name: 'Filing cabinet',
    themes: ['modern'],
    category: 'furniture',
    tags: ['file', 'cabinet', 'drawers', 'office', 'police', 'records'],
    roles: {
      metal: { label: 'Metal', color: 7 },
      shade: { label: 'Seams', color: 8 },
      handle: { label: 'Handles', color: 0 },
      label: { label: 'Labels', color: 15 },
      folder: { label: 'Folders', color: 14 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'drawers', label: 'Drawers', type: 'int', min: 2, max: 5, default: 4 },
      { key: 'width', label: 'Width', type: 'int', min: 7, max: 12, default: 8 },
      { key: 'open', label: 'Top drawer open', type: 'bool', default: false },
      { key: 'stuff', label: 'Stuff on top', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 130, y: 120 },
    hasControl: true,
    generate(k, p, rng) {
      const n = p.n('drawers')
      const hw = p.n('width') / 2
      const dh = 7
      const H = n * dh + 1
      k.rect(-hw, -H, hw, 0, R('metal'), R('line'))
      k.vline(hw - 1, -H + 1, -1, R('shade'))
      for (let i = 0; i < n; i++) {
        const top = -H + 1 + i * dh
        if (i > 0) k.hline(-hw, hw, top, R('line'))
        k.rect(-1.5, top + 2, 1.5, top + 3, R('label'), R('line'))
        k.hline(-1, 1, top + 5, R('handle'))
      }
      if (p.b('open')) {
        // top drawer pulled out toward the viewer, folders sticking up
        const top = -H + 1
        k.rect(-hw - 1, top - 3, hw + 1, top + dh - 1, R('metal'), R('line'))
        for (let x = -hw + 1; x < hw; x++) k.vline(x, top - 5 + rng.int(0, 2), top - 3, R(x % 2 ? 'folder' : 'label'))
        k.rect(-1.5, top + 2, 1.5, top + 3, R('label'), R('line'))
        k.hline(-1, 1, top + 5, R('handle'))
      } else if (p.b('stuff')) {
        // a stack of paper or a potted cactus
        if (rng.chance(0.5)) k.rect(-hw + 1, -H - 3, -hw + 5, -H, R('label'), R('line'))
        else {
          k.rect(-1, -H - 2, 1, -H, R('folder'), R('line'))
          k.rect(-0.5, -H - 6, 0.5, -H - 2, R('shade'))
        }
      }
      k.wall([[-hw, 0], [hw, 0]])
    },
  },
]
