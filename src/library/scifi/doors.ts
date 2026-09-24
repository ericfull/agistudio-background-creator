import type { ColorRef } from '../../agi/commands'
import { R, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { hazard, LIGHT_ROLES, lightColor } from './common'

const O = R('outline')

/** Small wall box with a status lamp. */
function statusBox(k: Kit, x: number, y: number, lamp: ColorRef): void {
  k.rect(x, y, x + 3, y + 5, R('frame'), O)
  k.dot(x + 1.5, y + 2, lamp)
  k.hline(x + 1, x + 2, y + 4, R('detail'))
}

function roundRectPts(x0: number, y0: number, x1: number, y1: number, rx: number, ry: number): LP[] {
  const pts: LP[] = []
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 4; i++) {
      const a = a0 + (i / 4) * (Math.PI / 2)
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry])
    }
  }
  arc(x1 - rx, y1 - ry, 0)
  arc(x0 + rx, y1 - ry, Math.PI / 2)
  arc(x0 + rx, y0 + ry, Math.PI)
  arc(x1 - rx, y0 + ry, Math.PI * 1.5)
  return pts
}

export const doors: ElementDef[] = [
  {
    id: 'scifi-hatch',
    name: 'Bulkhead hatch',
    themes: ['scifi'],
    category: 'structure',
    tags: ['door', 'hatch', 'airlock', 'bulkhead', 'exit', 'spaceship'],
    roles: {
      frame: { label: 'Frame', color: 8 },
      door: { label: 'Door', color: 7 },
      detail: { label: 'Door detail', color: 8 },
      dark: { label: 'Doorway', color: 0 },
      warn: { label: 'Hazard stripes', color: 14 },
      lampShut: { label: 'Lamp (closed)', color: 12 },
      lampOpen: { label: 'Lamp (open)', color: 10 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'state', label: 'State', type: 'select', default: 'closed',
        options: [{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }],
      },
      {
        key: 'style', label: 'Style', type: 'select', default: 'slide',
        options: [{ value: 'slide', label: 'Sliding door' }, { value: 'airlock', label: 'Airlock hatch' }, { value: 'blast', label: 'Blast door' }],
      },
      { key: 'width', label: 'Width', type: 'int', min: 10, max: 24, default: 14 },
      { key: 'height', label: 'Height', type: 'int', min: 26, max: 48, default: 36 },
      { key: 'panel', label: 'Control panel', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 100 },
    hasControl: true,
    generate(k, p) {
      const w = p.n('width')
      const h = p.n('height')
      const hw = w / 2
      const open = p.s('state') === 'open'
      const style = p.s('style')
      let fw = 3 // frame thickness at the sides
      if (style === 'slide') {
        k.poly([[-hw - 3, 0], [-hw - 3, -h + 1], [-hw, -h - 3], [hw, -h - 3], [hw + 3, -h + 1], [hw + 3, 0]], R('frame'), O)
        const opening: LP[] = [[-hw, 0], [-hw, -h + 2], [-hw + 2, -h], [hw - 2, -h], [hw, -h + 2], [hw, 0]]
        if (open) {
          k.poly(opening, R('dark'), O)
          k.vline(-hw + 1, -h + 2, -1, R('door'))
          k.vline(hw - 1, -h + 2, -1, R('door'))
        } else {
          k.poly(opening, R('door'), O)
          k.vline(0, -h, 0, O)
          const wy = -h * 0.7
          k.rect(-hw + 2, wy, -2, wy + 1, R('detail'))
          k.rect(2, wy, hw - 2, wy + 1, R('detail'))
          k.rect(-hw + 2, -h * 0.35, -2, -3, R('door'), R('detail'))
          k.rect(2, -h * 0.35, hw - 2, -3, R('door'), R('detail'))
        }
        k.hline(-hw - 2, hw + 2, -h - 2, R('detail'))
      } else if (style === 'airlock') {
        fw = 4
        const ry = Math.min(h * 0.3, 8)
        const rx = Math.min(hw, ry / 1.7 + 1)
        k.poly(roundRectPts(-hw - 4, -h - 4, hw + 4, 0, rx + 2, ry + 3), R('frame'), O)
        const inner = roundRectPts(-hw, -h, hw, 1, rx, ry)
        if (open) {
          k.poly(inner, R('dark'), O)
        } else {
          k.poly(inner, R('door'), O)
          // locking wheel
          const cy = -h * 0.52
          const wr = Math.max(2, hw * 0.55)
          k.outline(k.ellipsePts(0, cy, wr, wr * 1.7, 14), R('detail'))
          k.line([[-wr, cy], [wr, cy]], R('detail'))
          k.line([[0, cy - wr * 1.7], [0, cy + wr * 1.7]], R('detail'))
          k.rect(-1, cy - 1, 1, cy + 1, R('detail'), O)
        }
        // bolts around the frame
        for (let y = -h + ry; y < -2; y += 5) {
          k.dot(-hw - 2, y, R('detail'))
          k.dot(hw + 2, y, R('detail'))
        }
      } else {
        fw = 3
        k.rect(-hw - 3, -h - 4, hw + 3, 0, R('frame'), O)
        hazard(k, -hw - 3, -h - 4, hw + 3, -h - 2, 4, R('warn'), O)
        if (open) {
          k.rect(-hw, -h, hw, 0, R('dark'), O)
          // the door has slid up: its bottom edge shows under the lintel
          k.rect(-hw, -h, hw, -h + 2, R('door'), O)
          hazard(k, -hw + 1, -h + 1, hw - 1, -h + 1, 4, R('warn'), O)
        } else {
          k.rect(-hw, -h, hw, 0, R('door'), O)
          const split = -h * 0.42
          hazard(k, -hw + 1, split, hw - 1, -1, 4, R('warn'), O)
          k.hline(-hw + 1, hw - 1, split - 1, O)
          k.rect(-hw * 0.5, -h * 0.8, hw * 0.5, -h * 0.72, R('detail'), O)
          for (let y = -h + 3; y < split - 3; y += 4) {
            k.dot(-hw + 1.5, y, R('detail'))
            k.dot(hw - 1.5, y, R('detail'))
          }
        }
      }
      if (p.b('panel')) statusBox(k, hw + fw + 2, -h * 0.55, open ? R('lampOpen') : R('lampShut'))

      // control: walls under the frame either side, trigger across the threshold
      k.wall([[-hw - fw, 0], [-hw, 0]])
      k.wall([[hw, 0], [hw + fw, 0]])
      k.trigger([[-hw + 1, 0], [hw - 1, 0]])
    },
  },
  {
    id: 'scifi-elevator',
    name: 'Lift doors',
    themes: ['scifi'],
    category: 'structure',
    tags: ['elevator', 'lift', 'door', 'exit', 'spaceship'],
    roles: {
      frame: { label: 'Frame', color: 8 },
      door: { label: 'Doors', color: 7 },
      detail: { label: 'Detail', color: 8 },
      cab: { label: 'Cab back wall', color: 8 },
      cabDark: { label: 'Cab shadow', color: 0 },
      lamp: { label: 'Indicator', color: 14 },
      outline: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'state', label: 'State', type: 'select', default: 'closed',
        options: [{ value: 'closed', label: 'Closed' }, { value: 'open', label: 'Open' }],
      },
      { key: 'width', label: 'Width', type: 'int', min: 14, max: 32, default: 20 },
      { key: 'height', label: 'Height', type: 'int', min: 28, max: 46, default: 38 },
      { key: 'floors', label: 'Floor lights', type: 'int', min: 0, max: 6, default: 4 },
      { key: 'call', label: 'Call buttons', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 100 },
    hasControl: true,
    generate(k, p, rng) {
      const w = p.n('width')
      const h = p.n('height')
      const hw = w / 2
      const open = p.s('state') === 'open'
      const floors = p.n('floors')
      const head = floors > 0 ? 6 : 3
      k.rect(-hw - 3, -h - head - 1, hw + 3, 0, R('frame'), O)
      k.hline(-hw - 2, hw + 2, -h - 2, O)
      if (floors > 0) {
        const lit = rng.int(0, floors - 1)
        const step = Math.min(3, (w - 2) / floors)
        const x0 = -((floors - 1) * step) / 2
        for (let i = 0; i < floors; i++) k.dot(x0 + i * step, -h - 4, i === lit ? R('lamp') : O)
      }
      if (open) {
        const bx = Math.max(2, hw * 0.3)
        const by = -h + Math.max(4, h * 0.14)
        const fy = -Math.max(3, h * 0.1)
        k.rect(-hw, -h, hw, 0, R('cabDark'), O)
        // back wall of the cab, lit from above, and its floor in perspective
        k.rect(-hw + bx, by, hw - bx, fy, R('cab'), O)
        k.poly([[-hw + bx, fy], [hw - bx, fy], [hw - 1, 0], [-hw + 1, 0]], R('detail'), O)
        k.line([[-hw, -h], [-hw + bx, by]], O)
        k.line([[hw, -h], [hw - bx, by]], O)
        k.hline(-hw + bx + 1, hw - bx - 1, (by + fy) / 2, R('detail'))
        k.rect(-2, -h + 1, 2, -h + 2, R('lamp'))
      } else {
        k.rect(-hw, -h, hw, 0, R('door'), O)
        k.vline(0, -h, 0, O)
        k.vline(-hw * 0.5, -h + 3, -3, R('detail'))
        k.vline(hw * 0.5, -h + 3, -3, R('detail'))
      }
      k.hline(-hw - 2, hw + 2, -1, R('detail'))
      if (p.b('call')) {
        const x = hw + 5
        const y = -h * 0.55
        k.rect(x, y, x + 3, y + 8, R('frame'), O)
        const up: ColorRef = rng.chance(0.5) ? R('lamp') : R('detail')
        k.poly([[x + 1, y + 3], [x + 1.5, y + 1.5], [x + 2, y + 3]], up)
        k.poly([[x + 1, y + 5], [x + 2, y + 5], [x + 1.5, y + 6.5]], up === O ? R('lamp') : O)
      }
      k.wall([[-hw - 3, 0], [-hw, 0]])
      k.wall([[hw, 0], [hw + 3, 0]])
      k.trigger([[-hw + 1, 0], [hw - 1, 0]])
    },
  },
  {
    id: 'scifi-ladder',
    name: 'Access ladder',
    themes: ['scifi'],
    category: 'structure',
    tags: ['ladder', 'climb', 'shaft', 'maintenance'],
    roles: {
      rail: { label: 'Rails', color: 7 },
      rung: { label: 'Rungs', color: 7 },
      shadow: { label: 'Shadow', color: 0 },
      hole: { label: 'Opening', color: 0 },
      rim: { label: 'Rim', color: 8 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 16, max: 120, default: 50 },
      { key: 'width', label: 'Width', type: 'int', min: 5, max: 12, default: 7 },
      { key: 'spacing', label: 'Rung spacing', type: 'int', min: 3, max: 8, default: 4 },
      {
        key: 'top', label: 'Top', type: 'select', default: 'hatch',
        options: [{ value: 'none', label: 'Plain' }, { value: 'hatch', label: 'Ceiling hatch' }, { value: 'cage', label: 'Safety cage' }],
      },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 120 },
    hasControl: true,
    generate(k, p) {
      const h = p.n('height')
      const hw = p.n('width') / 2
      const sp = p.n('spacing')
      const top = p.s('top')
      if (top === 'hatch') {
        k.ellipse(0, -h, hw + 4, 3, R('rim'), R('shadow'))
        k.ellipse(0, -h + 0.5, hw + 2, 1.6, R('hole'))
      }
      for (let y = -2; y > -h + 1; y -= sp) {
        k.hline(-hw, hw, y, R('rung'))
        k.hline(-hw + 1, hw, y + 1, R('shadow'))
      }
      k.vline(-hw, -h, 0, R('rail'))
      k.vline(hw, -h, 0, R('rail'))
      k.vline(-hw - 1, -h, 0, R('shadow'))
      k.vline(hw + 1, -h, 0, R('shadow'))
      if (top === 'cage' && h > 24) {
        const start = -Math.max(20, h * 0.35)
        for (let y = start; y > -h; y -= 7) {
          k.line(k.ellipsePts(0, y, hw + 4, 3, 10, 0, Math.PI), R('rail'))
        }
        for (const x of [-hw - 4, 0, hw + 4]) k.vline(x, -h, start + (x === 0 ? 3 : 0), R('rail'))
      }
      k.trigger([[-hw, 0], [hw, 0]])
    },
  },
  {
    id: 'scifi-forcefield',
    name: 'Force field',
    themes: ['scifi'],
    category: 'structure',
    tags: ['force field', 'barrier', 'laser', 'gate', 'security'],
    roles: {
      post: { label: 'Emitters', color: 8 },
      cap: { label: 'Emitter caps', color: 7 },
      beam: { label: 'Beams', color: 11 },
      beam2: { label: 'Beams (alt)', color: 3 },
      glow: { label: 'Sparkle', color: 15 },
      outline: { label: 'Outline', color: 0 },
      ...LIGHT_ROLES,
    },
    params: [
      { key: 'width', label: 'Width', type: 'int', min: 10, max: 80, default: 30 },
      { key: 'height', label: 'Height', type: 'int', min: 14, max: 44, default: 32 },
      { key: 'beams', label: 'Beams', type: 'int', min: 2, max: 10, default: 5 },
      { key: 'on', label: 'Powered', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const hw = p.n('width') / 2
      const h = p.n('height')
      const n = p.n('beams')
      const on = p.b('on')
      if (on) {
        for (let i = 0; i < n; i++) {
          const y = -h + 3 + ((h - 5) * i) / Math.max(1, n - 1)
          const pts: LP[] = []
          for (let x = -hw + 1; x <= hw - 1; x += 4) pts.push([x, y + (rng.chance(0.3) ? rng.int(-1, 1) * 0.6 : 0)])
          pts.push([hw - 1, y])
          k.line(pts, R(i % 2 ? 'beam2' : 'beam'))
        }
        for (let i = 0; i < hw * 0.8; i++) k.dot(rng.range(-hw + 2, hw - 2), rng.range(-h + 2, -2), R(rng.chance(0.5) ? 'glow' : 'beam'))
      }
      for (const s of [-1, 1]) {
        const x0 = s * hw
        const x1 = s * (hw + 3)
        k.rect(Math.min(x0, x1), -h, Math.max(x0, x1), 0, R('post'), O)
        k.rect(Math.min(x0, x1) - 0.5, -h - 3, Math.max(x0, x1) + 0.5, -h, R('cap'), O)
        k.rect(Math.min(x0, x1) - 0.5, -2, Math.max(x0, x1) + 0.5, 0, R('cap'), O)
        for (let y = -h + 3; y < -3; y += 3) k.dot(x0 + s * 1.5, y, on ? lightColor(rng) : O)
      }
      k.wall([[-hw - 3, 0], [-hw, 0]])
      k.wall([[hw, 0], [hw + 3, 0]])
      if (on) k.condWall([[-hw + 1, 0], [hw - 1, 0]])
    },
  },
]
