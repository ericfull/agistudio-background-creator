import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { R } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { text, textLocalWidth } from './common'

/** A street door: frame, panel, upper glass, knob. Returns nothing; control is up to the caller. */
function streetDoor(k: Kit, cx: number, w: number, h: number, door: ColorRef, glass: ColorRef, line: ColorRef, knob: ColorRef): void {
  const x0 = cx - w / 2
  const x1 = cx + w / 2
  k.rect(x0 - 1, -h - 2, x1 + 1, 0, line) // frame / shadow
  k.rect(x0, -h, x1, 0, door, line)
  k.rect(x0 + 2, -h + 3, x1 - 2, -h * 0.55, glass, line)
  k.hline(x0 + 2, x1 - 2, -h * 0.35, line)
  k.dot(x1 - 2, -h * 0.45, knob)
}

/** Upper-floor window with sill; unlit windows sometimes have a shade pulled down. */
function flatWindow(k: Kit, rng: Rng, x0: number, y0: number, x1: number, y1: number, lit: boolean): void {
  k.rect(x0, y0, x1, y1, lit ? R('lit') : R('window'), R('frame'))
  if (!lit && rng.chance(0.3)) k.rect(x0 + 1, y0 + 1, x1 - 1, y0 + Math.max(1, (y1 - y0) * rng.range(0.3, 0.6)), R('shade'))
  if (k.S(x1 - x0) >= 6) k.vline((x0 + x1) / 2, y0, y1, R('frame'))
  k.hline(x0 - 1, x1 + 1, y1 + 1, R('trim'))
}

export const buildings: ElementDef[] = [
  {
    id: 'modern-building',
    name: 'Building front',
    themes: ['modern'],
    category: 'structure',
    tags: ['building', 'facade', 'city', 'apartment', 'office', 'brick', 'windows'],
    roles: {
      brick: { label: 'Brick', color: 4 },
      mortar: { label: 'Mortar', color: 6 },
      stucco: { label: 'Stucco', color: 7 },
      glass: { label: 'Curtain glass', color: 3 },
      glassHi: { label: 'Glass glint', color: 11 },
      trim: { label: 'Ledges', color: 7 },
      window: { label: 'Windows', color: 1 },
      shade: { label: 'Window shades', color: 15 },
      lit: { label: 'Lit windows', color: 14 },
      door: { label: 'Door', color: 6 },
      frame: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'material', label: 'Material', type: 'select', default: 'brick',
        options: [
          { value: 'brick', label: 'Brick' },
          { value: 'stucco', label: 'Stucco' },
          { value: 'glass', label: 'Glass tower' },
        ],
      },
      { key: 'width', label: 'Width', type: 'int', min: 36, max: 150, default: 72 },
      { key: 'floors', label: 'Floors (clamped to fit)', type: 'int', min: 1, max: 6, default: 2 },
      { key: 'cols', label: 'Windows across', type: 'int', min: 1, max: 8, default: 4 },
      { key: 'door', label: 'Door', type: 'bool', default: true },
      { key: 'lit', label: 'Lit windows %', type: 'int', min: 0, max: 100, default: 20 },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 92 },
    hasControl: true,
    generate(k, p, rng) {
      const mat = p.s('material')
      const hw = Math.round(p.n('width') / 2)
      const cols = p.n('cols')
      const litP = p.n('lit') / 100
      const gh = 42 // ground floor: 36-row door plus transom
      const uh = 27 // upper floors, in proportion to a ~34-row character
      // keep the roof on-screen: drop floors that would poke above row 0
      const room = Math.floor(k.ctx.y / k.sc) - 1
      const floors = Math.max(1, Math.min(p.n('floors'), 1 + Math.floor((room - gh - 4) / uh)))
      const H = gh + (floors - 1) * uh + 4
      const wall = mat === 'brick' ? R('brick') : mat === 'stucco' ? R('stucco') : R('glass')
      const hasDoor = p.b('door')
      const dw = 14
      const dh = 36

      k.rect(-hw, -H, hw, 0, wall, R('frame'))
      if (mat === 'brick') k.courses(-hw + 1, -H + 4, hw - 1, -1, 3, 6, R('mortar'))

      const cw = (2 * hw) / cols
      if (mat === 'glass') {
        // curtain wall: solid panes, straight mullions, a spandrel band per floor
        // and one diagonal reflection streak
        const np = Math.max(2, cols * 2)
        const pw = (2 * hw) / np
        const streak = rng.int(0, np)
        const bands: [number, number][] = [[-gh + 2, -1]]
        for (let f = 1; f < floors; f++) bands.push([-gh - f * uh + 2, -gh - (f - 1) * uh - 1])
        bands.forEach(([t, b], f) => {
          for (let c = 0; c < np; c++) {
            const x0 = -hw + c * pw
            const lit = f > 0 && rng.next() < litP
            const hi = !lit && (c + f === streak || c + f === streak + 1)
            if (lit || hi) k.rect(x0, t, x0 + pw, b, lit ? R('lit') : R('glassHi'))
          }
        })
        for (let c = 1; c < np; c++) k.vline(-hw + c * pw, -H + 3, -1, R('frame'))
        for (const [t] of bands) k.rect(-hw, t - 2, hw, t - 1, R('trim'))
      } else {
        // floor ledges and upper-floor windows
        for (let f = 1; f < floors; f++) {
          const base = -gh - (f - 1) * uh
          k.hline(-hw, hw, base, R('trim'))
          const ww = Math.max(3, Math.min(cw * 0.55, 12))
          for (let c = 0; c < cols; c++) {
            const cx = -hw + cw * (c + 0.5)
            flatWindow(k, rng, cx - ww / 2, base - uh + 6, cx + ww / 2, base - 5, rng.next() < litP)
          }
        }
      }
      // cornice
      k.rect(-hw - 1, -H, hw + 1, -H + 2, R('trim'), R('frame'))

      // ground floor
      const ground = -gh
      if (mat !== 'glass') k.hline(-hw, hw, ground, R('trim'))
      const doorX = 0
      if (hasDoor) {
        streetDoor(k, doorX, dw, dh, mat === 'glass' ? R('window') : R('door'), mat === 'glass' ? R('glassHi') : R('window'), R('frame'), R('trim'))
        k.rect(doorX - dw / 2 - 2, -dh - 5, doorX + dw / 2 + 2, -dh - 3, R('trim'), R('frame'))
      }
      // big ground-floor windows, either side of the door
      if (mat !== 'glass') {
        const runs: [number, number][] = hasDoor ? [[-hw + 4, -dw / 2 - 5], [dw / 2 + 5, hw - 4]] : [[-hw + 4, hw - 4]]
        for (const [a, b] of runs) {
          const span = b - a
          if (span < 6) continue
          const n = Math.max(1, Math.round(span / 22))
          const each = span / n
          for (let i = 0; i < n; i++) {
            const x0 = a + i * each + 1
            const x1 = a + (i + 1) * each - 1
            if (x1 - x0 >= 3) flatWindow(k, rng, x0, -30, x1, -12, rng.next() < litP)
          }
        }
      }
      k.hline(-hw, hw, 0, R('frame'))

      if (hasDoor) {
        k.wall([[-hw, 0], [doorX - dw / 2 - 1, 0]])
        k.trigger([[doorX - dw / 2, 0], [doorX + dw / 2, 0]])
        k.wall([[doorX + dw / 2 + 1, 0], [hw, 0]])
      } else k.wall([[-hw, 0], [hw, 0]])
    },
  },
  {
    id: 'modern-storefront',
    name: 'Storefront',
    themes: ['modern'],
    category: 'structure',
    tags: ['shop', 'store', 'awning', 'sign', 'window', 'city'],
    roles: {
      wall: { label: 'Wall', color: 6 },
      trim: { label: 'Trim', color: 7 },
      sign: { label: 'Sign board', color: 1 },
      signText: { label: 'Sign letters', color: 15 },
      awning: { label: 'Awning', color: 4 },
      awning2: { label: 'Awning stripe', color: 15 },
      glass: { label: 'Glass', color: 3 },
      glint: { label: 'Glint', color: 11 },
      goods: { label: 'Goods 1', color: 12 },
      goods2: { label: 'Goods 2', color: 14 },
      goods3: { label: 'Goods 3', color: 10 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 40, max: 120, default: 66 },
      {
        key: 'awning', label: 'Awning', type: 'select', default: 'striped',
        options: [
          { value: 'none', label: 'None' },
          { value: 'striped', label: 'Striped' },
          { value: 'solid', label: 'Solid' },
        ],
      },
      {
        key: 'sign', label: 'Sign', type: 'select', default: 'DELI',
        options: ['none', 'DELI', 'LIQUOR', 'PAWN', 'DRUGS', 'DONUTS', 'BOOKS', 'MARKET', 'GUNS'].map((v) => ({ value: v, label: v === 'none' ? 'None' : v })),
      },
      {
        key: 'doorSide', label: 'Door', type: 'select', default: 'center',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      },
      { key: 'goods', label: 'Window display', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 92 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = Math.round(p.n('width') / 2)
      const H = 52
      const dw = 13
      const dh = 35
      const side = p.s('doorSide')
      const dx = side === 'left' ? -hw + dw / 2 + 4 : side === 'right' ? hw - dw / 2 - 4 : 0
      // wall and parapet
      k.rect(-hw, -H, hw, 0, R('wall'), R('line'))
      k.rect(-hw - 1, -H - 2, hw + 1, -H, R('trim'), R('line'))
      // sign band
      const sign = p.s('sign')
      if (sign !== 'none') {
        const tw = textLocalWidth(k, sign)
        const sw = Math.min(hw - 3, tw / 2 + 4)
        k.rect(-sw, -H + 3, sw, -H + 11, R('sign'), R('line'))
        text(k, sign, 0, -H + 5, R('signText'))
      }
      // display windows
      const wy0 = -37
      const wy1 = -8
      const panes: [number, number][] = []
      const l = dx - dw / 2 - 3
      const r = dx + dw / 2 + 3
      if (l - (-hw + 3) >= 6) panes.push([-hw + 3, l])
      if (hw - 3 - r >= 6) panes.push([r, hw - 3])
      for (const [x0, x1] of panes) {
        k.rect(x0, wy0, x1, wy1, R('glass'), R('line'))
        if (p.b('goods')) {
          // two shelves of colorful merchandise
          for (const sy of [wy1 - 1, wy1 - 10]) {
            k.hline(x0 + 1, x1 - 1, sy, R('trim'))
            let gx = x0 + 2
            while (gx < x1 - 3) {
              const w = rng.int(1, 3)
              const h = rng.int(2, 6)
              if (rng.chance(0.8)) k.rect(gx, sy - h, gx + w, sy - 1, R(rng.pick(['goods', 'goods2', 'goods3'])), R('line'))
              gx += w + rng.int(2, 3)
            }
          }
        }
        k.line([[x0 + 3, wy0 + 9], [x0 + 7, wy0 + 2]], R('glint'))
        if (x1 - x0 > 16) k.line([[x0 + 7, wy0 + 11], [x0 + 12, wy0 + 3]], R('glint'))
        k.rect(x0, wy1 + 1, x1, -1, R('trim'), R('line')) // bulkhead
      }
      // glass door
      k.rect(dx - dw / 2 - 1, -dh - 2, dx + dw / 2 + 1, 0, R('trim'), R('line'))
      k.rect(dx - dw / 2 + 1, -dh, dx + dw / 2 - 1, -1, R('glass'), R('line'))
      k.rect(dx - 3, -dh * 0.55, dx + 3, -dh * 0.55 + 4, R('signText'), R('line')) // OPEN card
      k.hline(dx - dw / 2 + 2, dx - dw / 2 + 4, -dh * 0.4, R('line'))
      // awning over the windows
      const aw = p.s('awning')
      if (aw !== 'none') {
        const top = -41
        const bot = -33
        const out = 3
        k.poly([[-hw - 1, top], [hw + 1, top], [hw + out, bot], [-hw - out, bot]], R('awning'), R('line'))
        if (aw === 'striped') {
          for (let x = -hw + 2; x < hw; x += 6) {
            const t = x / hw
            k.poly([[x, top + 1], [x + 2, top + 1], [x + 2 + t * out, bot - 1], [x + t * out, bot - 1]], R('awning2'))
          }
        }
        // scalloped valance
        for (let x = -hw - out; x < hw + out - 2; x += 4) {
          k.poly([[x, bot], [x + 4, bot], [x + 3, bot + 2], [x + 1, bot + 2]], R(aw === 'striped' && Math.round((x + hw) / 4) % 2 ? 'awning2' : 'awning'), R('line'))
        }
      }
      k.hline(-hw, hw, 0, R('line'))
      k.wall([[-hw, 0], [dx - dw / 2 - 1, 0]])
      k.trigger([[dx - dw / 2, 0], [dx + dw / 2, 0]])
      k.wall([[dx + dw / 2 + 1, 0], [hw, 0]])
    },
  },
  {
    id: 'modern-bar',
    name: 'Bar front with neon',
    themes: ['modern'],
    category: 'structure',
    tags: ['bar', 'neon', 'sign', 'night', 'club', 'lounge', 'lefty'],
    roles: {
      wall: { label: 'Wall', color: 8 },
      mortar: { label: 'Mortar', color: 0 },
      trim: { label: 'Trim', color: 7 },
      backing: { label: 'Sign backing', color: 0 },
      neon: { label: 'Neon 1', color: 13 },
      neon2: { label: 'Neon 2', color: 12 },
      neon3: { label: 'Neon 3', color: 11 },
      door: { label: 'Padded door', color: 4 },
      stud: { label: 'Studs', color: 14 },
      glass: { label: 'Windows', color: 1 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 44, max: 110, default: 70 },
      {
        key: 'sign', label: 'Sign', type: 'select', default: "LEFTY'S",
        options: ["LEFTY'S", 'BAR', 'COCKTAILS', 'LOUNGE', 'CLUB', 'TAVERN', 'DISCO'].map((v) => ({ value: v, label: v })),
      },
      {
        key: 'icon', label: 'Neon icon', type: 'select', default: 'martini',
        options: [
          { value: 'none', label: 'None' },
          { value: 'martini', label: 'Martini glass' },
          { value: 'arrow', label: 'Arrow' },
          { value: 'star', label: 'Stars' },
        ],
      },
      { key: 'windows', label: 'Beer-sign windows', type: 'bool', default: true },
      { key: 'brick', label: 'Brick', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 92 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = Math.round(p.n('width') / 2)
      const H = 62
      const dw = 14
      const dh = 36
      // shuffle neon roles so every seed lights up a little differently
      const neons = ['neon', 'neon2', 'neon3']
      for (let i = neons.length - 1; i > 0; i--) {
        const j = rng.int(0, i)
        ;[neons[i], neons[j]] = [neons[j], neons[i]]
      }
      const [nText, nBorder, nIcon] = neons.map((n) => R(n))

      k.rect(-hw, -H, hw, 0, R('wall'), R('line'))
      if (p.b('brick')) k.courses(-hw + 1, -H + 3, hw - 1, -1, 3, 6, R('mortar'))
      k.rect(-hw - 1, -H - 2, hw + 1, -H + 1, R('trim'), R('line'))

      // sign: black backing board with neon letters and a tube border
      const sign = p.s('sign')
      const tw = textLocalWidth(k, sign)
      const sw = Math.min(hw - 2, tw / 2 + 4)
      const sTop = -H + 5
      const tall = sw * 2 * k.sc >= textLocalWidth(k, sign) * k.sc + 4
      const sBot = sTop + (tall ? 15 : 10)
      k.rect(-sw, sTop, sw, sBot, R('backing'), R('line'))
      k.outline([[-sw + 1, sTop + 1], [sw - 1, sTop + 1], [sw - 1, sBot - 1], [-sw + 1, sBot - 1]], nBorder)
      text(k, sign, 0, sTop + 3 - (tall ? 1 : 0), nText, tall)

      // door (padded, studded) with a neon icon above or beside it
      const doorTop = -dh
      k.rect(-dw / 2 - 2, doorTop - 3, dw / 2 + 2, 0, R('trim'), R('line'))
      k.rect(-dw / 2, doorTop, dw / 2, 0, R('door'), R('line'))
      for (let yy = doorTop + 3; yy < -2; yy += 5) {
        for (let xx = -dw / 2 + 2; xx <= dw / 2 - 2; xx += 3) k.dot(xx, yy, R('stud'))
      }
      const pt = doorTop + 5 // octagonal porthole
      k.poly([[-1.5, pt], [1.5, pt], [3, pt + 2], [3, pt + 5], [1.5, pt + 7], [-1.5, pt + 7], [-3, pt + 5], [-3, pt + 2]], R('glass'), R('line'))
      k.dot(dw / 2 - 2, -dh * 0.45, R('stud'))

      // neon icon beside the sign
      const icon = p.s('icon')
      const room = hw - 2 - sw // free space right of the sign
      if (icon === 'martini' && room >= 14) {
        const cx = sw + 3 + Math.min(8, room / 2)
        const t = sTop + (tall ? 2 : 0)
        k.line([[cx - 5, t], [cx + 5, t], [cx, t + 6], [cx - 5, t]], nIcon)
        k.vline(cx, t + 6, t + 10, nIcon)
        k.hline(cx - 3, cx + 3, t + 11, nIcon)
        k.dot(cx + 2, t + 2, nText)
        k.line([[cx + 1, t + 3], [cx + 6, t - 2]], nBorder)
      } else if (icon === 'arrow' && room >= 8) {
        // bent arrow running from the sign down toward the door, with chaser bulbs
        const ax = sw + Math.min(room - 2, 8)
        const my = Math.round((sTop + sBot) / 2)
        const tipX = dw / 2 + 4
        const ty = doorTop + 3
        k.line([[sw + 1, my], [ax, my], [ax, ty], [tipX, ty]], nIcon)
        k.line([[tipX + 3, ty - 2], [tipX, ty], [tipX + 3, ty + 2]], nIcon)
        for (let yy = my + 3; yy < ty - 1; yy += 3) k.dot(ax + 2, yy, nText)
      } else if (icon === 'star') {
        for (const sx of [-1, 1]) {
          const cx = sx * (sw + 6)
          if (Math.abs(cx) + 4 > hw) continue
          const cy = (sTop + sBot) / 2
          k.line([[cx - 3, cy], [cx + 3, cy]], nIcon)
          k.line([[cx, cy - 4], [cx, cy + 4]], nIcon)
          k.line([[cx - 2, cy - 2], [cx + 2, cy + 2]], nBorder)
          k.line([[cx - 2, cy + 2], [cx + 2, cy - 2]], nBorder)
        }
      }

      // small dark windows with beer signs
      if (p.b('windows')) {
        for (const side of [-1, 1]) {
          const x0 = dw / 2 + 6
          const x1 = Math.min(hw - 4, x0 + 18)
          if (x1 - x0 < 8) continue
          const a = side < 0 ? -x1 : x0
          const b = side < 0 ? -x0 : x1
          k.rect(a, -30, b, -12, R('glass'), R('line'))
          k.rect(a - 1, -11, b + 1, -10, R('trim'), R('line'))
          const cx = (a + b) / 2
          const which = rng.int(0, 2)
          if (which === 0) text(k, 'BEER', cx, -24, R(rng.pick(neons)))
          else if (which === 1) {
            k.outline(k.ellipsePts(cx, -21, 4, 6, 12), R(rng.pick(neons)))
            k.hline(cx - 2, cx + 2, -21, R(rng.pick(neons)))
          } else {
            text(k, 'OPEN', cx, -24, R(rng.pick(neons)))
            k.outline([[cx - 8, -26], [cx + 8, -26], [cx + 8, -17], [cx - 8, -17]], R(rng.pick(neons)))
          }
        }
      }
      k.hline(-hw, hw, 0, R('line'))
      k.wall([[-hw, 0], [-dw / 2 - 1, 0]])
      k.trigger([[-dw / 2, 0], [dw / 2, 0]])
      k.wall([[dw / 2 + 1, 0], [hw, 0]])
    },
  },
  {
    id: 'modern-hotel-door',
    name: 'Hotel or apartment door',
    themes: ['modern'],
    category: 'structure',
    tags: ['door', 'hotel', 'apartment', 'number', 'interior', 'hallway'],
    roles: {
      casing: { label: 'Casing', color: 15 },
      door: { label: 'Door', color: 6 },
      panel: { label: 'Panel lines', color: 0 },
      plate: { label: 'Brass numbers', color: 14 },
      digits: { label: 'Glass lettering', color: 0 },
      knob: { label: 'Knob', color: 14 },
      hanger: { label: 'Door hanger', color: 15 },
      hangerText: { label: 'Hanger mark', color: 4 },
      dark: { label: 'Dark doorway', color: 0 },
      glass: { label: 'Frosted glass', color: 11 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'number', label: 'Number', type: 'int', min: 1, max: 999, default: 214 },
      {
        key: 'style', label: 'Style', type: 'select', default: 'hotel',
        options: [
          { value: 'hotel', label: 'Hotel (panels)' },
          { value: 'apartment', label: 'Apartment (flush)' },
          { value: 'office', label: 'Office (frosted glass)' },
        ],
      },
      { key: 'hanger', label: 'Do-not-disturb hanger', type: 'bool', default: false },
      { key: 'open', label: 'Ajar', type: 'bool', default: false },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 104 },
    hasControl: true,
    generate(k, p) {
      const dw = 7 // half-width
      const dh = 38
      const style = p.s('style')
      const open = p.b('open')
      k.rect(-dw - 2, -dh - 3, dw + 2, 0, R('casing'), R('line'))
      if (open) {
        k.rect(-dw, -dh, dw, 0, R('dark'), R('line'))
        // door swung inward, seen edge-on at the hinge side
        k.poly([[-dw, -dh], [-dw + 4, -dh + 2], [-dw + 4, -1], [-dw, 0]], R('door'), R('line'))
      } else {
        k.rect(-dw, -dh, dw, 0, R('door'), R('line'))
        const num = String(p.n('number'))
        if (style === 'hotel') {
          // brass numerals over two raised panels
          text(k, num, 0, -dh + 3, R('plate'))
          k.outline([[-4, -dh + 10], [4, -dh + 10], [4, -20], [-4, -20]], R('panel'))
          k.outline([[-4, -17], [4, -17], [4, -4], [-4, -4]], R('panel'))
        } else if (style === 'office') {
          k.rect(-dw + 2, -dh + 3, dw - 2, -dh + 18, R('glass'), R('line'))
          text(k, num, 0, -dh + 8, R('digits'))
        } else {
          k.dot(0, -dh + 4, R('line')) // peephole
          text(k, num, 0, -dh + 8, R('plate'))
        }
        k.hline(dw - 2, dw - 1, -16, R('knob')) // lever handle
        k.dot(dw - 2, -15, R('line'))
        if (p.b('hanger')) {
          k.rect(dw - 3, -14, dw, -7, R('hanger'), R('line'))
          k.hline(dw - 2, dw - 1, -12, R('hangerText'))
          k.hline(dw - 2, dw - 1, -10, R('hangerText'))
        }
      }
      k.hline(-dw - 2, dw + 2, 0, R('line'))
      k.trigger([[-dw + 1, 0], [dw - 1, 0]])
    },
  },
]
