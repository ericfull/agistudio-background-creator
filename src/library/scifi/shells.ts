import type { ColorRef } from '../../agi/commands'
import type { Rng } from '../../agi/rng'
import { clamp, R, type LP } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { ElementDef } from '../types'
import { depthSteps, discRows, LIGHT_ROLES, lightColor, lightRow, RoomBox, starDots } from './common'

const EDGE = R('edge')

/** Quad on a side wall between two depths and two heights. */
function wallQuad(b: RoomBox, u: number, v0: number, v1: number, s0: number, s1: number): LP[] {
  return [b.P(u, v0, s0), b.P(u, v0, s1), b.P(u, v1, s1), b.P(u, v1, s0)]
}

/** Floor lines: rays toward the vanishing point and cross lines at depths. */
function floorGrid(k: Kit, b: RoomBox, u0: number, u1: number, du: number, depths: number[], color: ColorRef): void {
  const sEnd = b.sFloor + 0.5
  const n = Math.floor((Math.max(80 - u0, u1 - 80) + 1e-6) / du)
  for (let i = -n; i <= n; i++) {
    const u = 80 + i * du
    if (u >= u0 - 1e-6 && u <= u1 + 1e-6) k.line([b.P(u, b.sy, 1), b.P(u, b.sy, sEnd)], color)
  }
  for (const s of depths) k.line([b.P(u0, b.sy, s), b.P(u1, b.sy, s)], color)
}

/** Paneled side wall with a trim stripe, ribs and a few indicator lights. */
function sideWall(k: Kit, rng: Rng, b: RoomBox, side: 'l' | 'r', panels: number, trim: [number, number]): void {
  const u = side === 'l' ? b.bx0 : b.bx1
  k.poly(b.wallPoly(side), R('wall'), EDGE)
  const sEnd = b.sSide
  const steps = depthSteps(panels, sEnd * 1.02)
  const h = b.sy - b.top
  for (let i = 0; i < steps.length - 1; i++) {
    const s0 = steps[i]
    const s1 = steps[i + 1]
    const d = s1 - s0
    const a = s0 + d * 0.14
    const c = s1 - d * 0.14
    // upper and lower inset panels
    k.poly(wallQuad(b, u, b.top + h * 0.1, trim[0] - h * 0.06, a, c), R('panel'), EDGE)
    k.poly(wallQuad(b, u, trim[1] + h * 0.07, b.sy - h * 0.1, a, c), R('panel'), EDGE)
    // seeded panel features: readouts, a wall screen or a vent
    const m = s0 + d * 0.5
    const up0 = b.top + h * 0.1
    const up1 = trim[0] - h * 0.06
    const lo0 = trim[1] + h * 0.07
    const lo1 = b.sy - h * 0.1
    const feature = rng.int(0, 3)
    if (feature === 1) {
      const [x0, y0] = b.P(u, trim[0] - h * 0.2, m)
      const n = rng.int(2, 4)
      for (let j = 0; j < n; j++) k.dot(x0, y0 - j * 2 * m, lightColor(rng))
    } else if (feature === 2) {
      const e = d * 0.3
      const vm = (up0 + up1) / 2
      k.poly(wallQuad(b, u, vm - h * 0.08, vm + h * 0.08, s0 + e, s1 - e), R('screen'), EDGE)
      const [x0, y0] = b.P(u, vm, s0 + e * 1.3)
      k.dot(x0, y0, lightColor(rng))
    } else if (feature === 3) {
      for (let v = lo0 + h * 0.05; v < lo1 - h * 0.03; v += h * 0.05) k.line([b.P(u, v, a + d * 0.08), b.P(u, v, c - d * 0.08)], EDGE)
    }
  }
  // a pipe run along the top of the wall on some seeds
  if (rng.chance(0.5)) {
    const v = b.top + h * 0.05
    k.line([b.P(u, v, 1), b.P(u, v, sEnd * 1.05)], R('panel'))
    k.line([b.P(u, v + 1, 1), b.P(u, v + 1, sEnd * 1.05)], EDGE)
  }
  // trim stripe along the whole wall
  k.poly(wallQuad(b, u, trim[0], trim[1], 1, sEnd * 1.05), R('trim'))
  for (const s of steps.slice(1)) {
    const [x, y0] = b.P(u, b.top, s)
    const [, y1] = b.P(u, b.sy, s)
    k.vline(x, y0, y1, EDGE)
  }
  // kick plate line
  k.line([b.P(u, b.sy - 2, 1), b.P(u, b.sy - 2, sEnd * 1.05)], EDGE)
}

function ceilingLights(k: Kit, b: RoomBox, n: number, lw: number, sEnd?: number): void {
  const sCeil = Math.max(1.05, sEnd ?? Math.min(b.sSide, b.vy / Math.max(1, b.vy - b.top), 70 / lw))
  const steps = depthSteps(Math.max(1, n), sCeil)
  for (let i = 0; i < steps.length - 1; i++) {
    const d = steps[i + 1] - steps[i]
    const a = steps[i] + d * 0.3
    const c = steps[i] + d * 0.7
    k.poly([b.P(80 - lw, b.top, a), b.P(80 + lw, b.top, a), b.P(80 + lw, b.top, c), b.P(80 - lw, b.top, c)], R('lamp'), EDGE)
  }
}

function spaceView(k: Kit, rng: Rng, x0: number, y0: number, x1: number, y1: number, planet: boolean): void {
  k.rect(x0, y0, x1, y1, R('space'))
  const area = (x1 - x0) * (y1 - y0)
  starDots(k, rng, Math.round(area / 26), x0 + 1, y0 + 1, x1 - 1, y1 - 1)
  if (!planet) return
  const r = Math.max(4, (y1 - y0) * 0.45)
  const cx = x1 - r * 0.9
  const cy = y1 + r * 0.4
  discRows(k, cx, cy, r, r * 1.7, (y, a, b) => {
    if (y <= y0 || y >= y1) return
    const l = Math.max(a, x0 + 1)
    const rr = Math.min(b, x1 - 1)
    if (rr < l) return
    k.hline(l, rr, y, R('planet'))
    const split = a + (b - a) * 0.62
    if (split < rr) k.hline(Math.max(l, split), rr, y, R('planetShade'))
  })
}

export const shells: ElementDef[] = [
  {
    id: 'scifi-corridor',
    name: 'Ship corridor',
    themes: ['scifi'],
    category: 'interior',
    tags: ['corridor', 'hallway', 'spaceship', 'interior', 'perspective', 'room'],
    span: 'full',
    roles: {
      wall: { label: 'Side walls', color: 7 },
      panel: { label: 'Wall panels', color: 8 },
      trim: { label: 'Trim stripe', color: 3 },
      back: { label: 'Back bulkhead', color: 7 },
      ceiling: { label: 'Ceiling', color: 8 },
      lamp: { label: 'Ceiling lights', color: 15 },
      floor: { label: 'Floor', color: 8 },
      grate: { label: 'Floor lines', color: 0 },
      door: { label: 'End door', color: 7 },
      screen: { label: 'Wall screens', color: 3 },
      space: { label: 'Window space', color: 0 },
      star: { label: 'Stars', color: 15 },
      star2: { label: 'Dim stars', color: 7 },
      planet: { label: 'Planet', color: 12 },
      planetShade: { label: 'Planet shade', color: 4 },
      edge: { label: 'Edges', color: 0 },
      ...LIGHT_ROLES,
    },
    params: [
      { key: 'backW', label: 'Back wall width', type: 'int', min: 30, max: 110, default: 60 },
      { key: 'backH', label: 'Back wall height', type: 'int', min: 30, max: 70, default: 46 },
      {
        key: 'end', label: 'Far end', type: 'select', default: 'door',
        options: [{ value: 'door', label: 'Door' }, { value: 'window', label: 'Viewport' }, { value: 'bulkhead', label: 'Bulkhead' }],
      },
      {
        key: 'floor', label: 'Floor', type: 'select', default: 'grating',
        options: [{ value: 'grating', label: 'Center grating' }, { value: 'tiles', label: 'Tiles' }, { value: 'plain', label: 'Plain' }],
      },
      { key: 'panels', label: 'Wall panels', type: 'int', min: 1, max: 6, default: 3 },
      { key: 'lights', label: 'Ceiling lights', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 100 },
    hasControl: true,
    generate(k, p, rng) {
      const sy = clamp(Math.round(k.ctx.y), 40, 160)
      const bw = p.n('backW')
      const bh = Math.min(p.n('backH'), sy - 4)
      const bx0 = Math.round(80 - bw / 2)
      const bx1 = Math.round(80 + bw / 2)
      const top = sy - bh
      const b = new RoomBox(bx0, bx1, top, sy, 0.45)
      const trim: [number, number] = [sy - bh * 0.5, sy - bh * 0.5 + 2]
      const panels = p.n('panels')

      // ceiling with ribs
      k.poly(b.ceilPoly, R('ceiling'), EDGE)
      for (const s of depthSteps(panels, b.sSide * 1.02).slice(1)) k.line([b.P(bx0, top, s), b.P(bx1, top, s)], EDGE)
      if (p.b('lights')) ceilingLights(k, b, panels, Math.max(3, bw * 0.16))

      // floor
      k.poly(b.floorPoly, R('floor'), EDGE)
      const fl = p.s('floor')
      const depths = depthSteps(panels * 3, b.sFloor).slice(1)
      if (fl === 'grating') {
        const gw = Math.max(4, bw * 0.22)
        floorGrid(k, b, 80 - gw, 80 + gw, 2, depths, R('grate'))
        k.line([b.P(80 - gw - 2, sy, 1), b.P(80 - gw - 2, sy, b.sFloor + 0.5)], R('trim'))
        k.line([b.P(80 + gw + 2, sy, 1), b.P(80 + gw + 2, sy, b.sFloor + 0.5)], R('trim'))
      } else if (fl === 'tiles') {
        floorGrid(k, b, bx0, bx1, bw / 6, depthSteps(panels * 2, b.sFloor).slice(1), R('grate'))
      } else {
        k.line([b.P(80, sy, 1), b.P(80, sy, b.sFloor + 0.5)], R('trim'))
      }

      // side walls
      sideWall(k, rng, b, 'l', panels, trim)
      sideWall(k, rng, b, 'r', panels, trim)

      // back bulkhead
      k.rect(bx0, top, bx1, sy, R('back'), EDGE)
      k.rect(bx0 + 1, trim[0], bx1 - 1, trim[1], R('trim'))
      k.hline(bx0 + 1, bx1 - 1, sy - 2, EDGE)
      const end = p.s('end')
      const dw = Math.min(14, bw - 8)
      const dh = Math.min(36, bh - 5)
      if (end === 'door') {
        const x0 = 80 - dw / 2
        const x1 = 80 + dw / 2
        k.poly([[x0 - 2, sy], [x0 - 2, sy - dh], [x0, sy - dh - 3], [x1, sy - dh - 3], [x1 + 2, sy - dh], [x1 + 2, sy]], R('panel'), EDGE)
        k.poly([[x0, sy], [x0, sy - dh + 2], [x0 + 2, sy - dh], [x1 - 2, sy - dh], [x1, sy - dh + 2], [x1, sy]], R('door'), EDGE)
        k.vline(80, sy - dh, sy, EDGE)
        k.rect(x0 + 2, sy - dh * 0.72, 79, sy - dh * 0.72 + 1, R('panel'))
        k.rect(81, sy - dh * 0.72, x1 - 2, sy - dh * 0.72 + 1, R('panel'))
        k.rect(x1 + 4, sy - dh * 0.55, x1 + 6, sy - dh * 0.55 + 4, R('panel'), EDGE)
        k.dot(x1 + 5, sy - dh * 0.55 + 2, R('light3'))
      } else if (end === 'window') {
        const ww = Math.max(8, bw * 0.6)
        const y0 = top + bh * 0.18
        const y1 = sy - bh * 0.3
        k.rect(80 - ww / 2 - 2, y0 - 2, 80 + ww / 2 + 2, y1 + 2, R('panel'), EDGE)
        spaceView(k, rng, 80 - ww / 2, y0, 80 + ww / 2, y1, true)
        k.outline([[80 - ww / 2, y0], [80 + ww / 2, y0], [80 + ww / 2, y1], [80 - ww / 2, y1]], EDGE)
      } else {
        // closed bulkhead: panels, a pipe run and a light bank
        const cols = Math.max(2, Math.round(bw / 16))
        const pw = (bw - 4) / cols
        for (let i = 0; i < cols; i++) {
          const x0 = bx0 + 2 + i * pw + 1
          k.rect(x0, top + 3, x0 + pw - 2, trim[0] - 3, R('panel'), EDGE)
          k.rect(x0, trim[1] + 3, x0 + pw - 2, sy - 5, R('panel'), EDGE)
          lightRow(k, rng, x0 + 2, x0 + pw - 4, trim[1] + 6, 2)
        }
        k.rect(bx0 + 1, top + bh * 0.3, bx1 - 1, top + bh * 0.3 + 2, R('wall'), EDGE)
      }
      // blinking lights over the far end
      lightRow(k, rng, bx0 + 3, bx0 + 9, top + 3, 2, EDGE, 0.8)
      lightRow(k, rng, bx1 - 9, bx1 - 3, top + 3, 2, EDGE, 0.8)

      // control: floor edges and the far wall
      k.wall([[bx0, sy], b.exit(bx0, sy)])
      k.wall([[bx1, sy], b.exit(bx1, sy)])
      if (end === 'door') {
        k.wall([[bx0, sy], [80 - dw / 2, sy]])
        k.wall([[80 + dw / 2, sy], [bx1, sy]])
        k.trigger([[80 - dw / 2 + 1, sy], [80 + dw / 2 - 1, sy]])
      } else {
        k.wall([[bx0, sy], [bx1, sy]])
      }
    },
  },
  {
    id: 'scifi-control-room',
    name: 'Control room',
    themes: ['scifi'],
    category: 'interior',
    tags: ['bridge', 'cockpit', 'control', 'computer', 'spaceship', 'interior', 'room'],
    span: 'full',
    roles: {
      wall: { label: 'Walls', color: 7 },
      panel: { label: 'Panels', color: 8 },
      trim: { label: 'Trim stripe', color: 1 },
      ceiling: { label: 'Ceiling', color: 8 },
      lamp: { label: 'Ceiling lights', color: 15 },
      floor: { label: 'Floor', color: 1 },
      grate: { label: 'Floor lines', color: 0 },
      console: { label: 'Console', color: 8 },
      consoleTop: { label: 'Console top', color: 7 },
      screen: { label: 'Screens', color: 3 },
      screenLine: { label: 'Screen lines', color: 11 },
      space: { label: 'Window space', color: 0 },
      star: { label: 'Stars', color: 15 },
      star2: { label: 'Dim stars', color: 7 },
      planet: { label: 'Planet', color: 12 },
      planetShade: { label: 'Planet shade', color: 4 },
      edge: { label: 'Edges', color: 0 },
      ...LIGHT_ROLES,
    },
    params: [
      {
        key: 'window', label: 'Main window', type: 'select', default: 'planet',
        options: [
          { value: 'stars', label: 'Stars' },
          { value: 'planet', label: 'Planet' },
          { value: 'monitor', label: 'Big monitor' },
          { value: 'none', label: 'None' },
        ],
      },
      { key: 'side', label: 'Side wall depth', type: 'int', min: 0, max: 40, default: 16 },
      { key: 'height', label: 'Wall height', type: 'int', min: 30, max: 80, default: 58 },
      { key: 'consoles', label: 'Console bank', type: 'bool', default: true },
      {
        key: 'floor', label: 'Floor', type: 'select', default: 'tiles',
        options: [{ value: 'tiles', label: 'Tiles' }, { value: 'grating', label: 'Grating' }, { value: 'plain', label: 'Plain' }],
      },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 104 },
    hasControl: true,
    generate(k, p, rng) {
      const sy = clamp(Math.round(k.ctx.y), 40, 160)
      const side = p.n('side')
      const bh = Math.min(p.n('height'), sy - 2)
      const bx0 = side
      const bx1 = 159 - side
      const top = sy - bh
      const b = new RoomBox(bx0, bx1, top, sy, 0.45)
      const bw = bx1 - bx0

      // ceiling and floor
      k.poly(b.ceilPoly, R('ceiling'), EDGE)
      k.poly(b.floorPoly, R('floor'), EDGE)
      const fl = p.s('floor')
      if (fl === 'tiles') floorGrid(k, b, bx0, bx1, Math.max(8, bw / 10), depthSteps(6, b.sFloor).slice(1), R('grate'))
      else if (fl === 'grating') floorGrid(k, b, bx0, bx1, 3, depthSteps(16, b.sFloor).slice(1), R('grate'))
      if (top > 3) {
        const lw = Math.min(30, bw * 0.3)
        ceilingLights(k, b, 2, lw, Math.min((b.vy / Math.max(1, b.vy - top)) * 0.95, 70 / lw))
      }

      // narrow side walls
      if (side > 2) {
        const trim: [number, number] = [sy - bh * 0.45, sy - bh * 0.45 + 2]
        sideWall(k, rng, b, 'l', Math.max(1, Math.round(side / 14)), trim)
        sideWall(k, rng, b, 'r', Math.max(1, Math.round(side / 14)), trim)
      }

      // back wall
      k.rect(bx0, top, bx1, sy, R('wall'), EDGE)
      const tY = top + Math.max(3, bh * 0.08)
      k.rect(bx0 + 1, tY, bx1 - 1, tY + 1, R('trim'))
      // wall ribs
      const ribs = Math.max(2, Math.round(bw / 26))
      for (let i = 1; i < ribs; i++) {
        const x = bx0 + (bw * i) / ribs
        k.vline(x, top, tY - 1, EDGE)
      }

      const cons = p.b('consoles')
      const cTop = sy - 18 // top of the console risers
      const win = p.s('window')
      if (win !== 'none') {
        const ww = Math.max(20, bw * 0.72)
        const wy0 = tY + 4
        const wy1 = Math.max(wy0 + 6, (cons ? cTop : sy - 6) - 4)
        const x0 = 80 - ww / 2
        const x1 = 80 + ww / 2
        k.poly([[x0 - 3, wy0 - 1], [x0, wy0 - 3], [x1, wy0 - 3], [x1 + 3, wy0 - 1], [x1 + 3, wy1 + 1], [x1, wy1 + 3], [x0, wy1 + 3], [x0 - 3, wy1 + 1]], R('panel'), EDGE)
        if (win === 'monitor') {
          k.rect(x0, wy0, x1, wy1, R('screen'), EDGE)
          const mh = wy1 - wy0
          for (let y = wy0 + 3; y < wy1 - 1; y += 4) k.hline(x0 + 1, x1 - 1, y, R('screenLine'))
          for (let x = x0 + 6; x < x1 - 1; x += 8) k.vline(x, wy0 + 1, wy1 - 1, R('screenLine'))
          // a planet outline and a blip on the display
          k.outline(k.ellipsePts(80 - ww * 0.18, wy0 + mh / 2, Math.max(3, mh * 0.28), Math.max(5, mh * 0.45), 16), R('light3'))
          k.dot(80 + ww * 0.2, wy0 + mh * 0.35, R('light1'))
          k.hline(80 + ww * 0.2 - 2, 80 + ww * 0.2 + 2, wy0 + mh * 0.35 + 2, R('light1'))
        } else {
          spaceView(k, rng, x0, wy0, x1, wy1, win === 'planet')
          // window mullions
          for (const m of [-1, 1]) k.rect(80 + (m * ww) / 6 - 1, wy0, 80 + (m * ww) / 6, wy1, R('panel'), EDGE)
          k.outline([[x0, wy0], [x1, wy0], [x1, wy1], [x0, wy1]], EDGE)
        }
      } else {
        // plain paneled wall
        const cols = Math.max(2, Math.round(bw / 22))
        const pw = (bw - 4) / cols
        for (let i = 0; i < cols; i++) {
          const x0 = bx0 + 2 + i * pw + 1
          k.rect(x0, tY + 4, x0 + pw - 2, (cons ? cTop : sy - 4) - 3, R('panel'), EDGE)
        }
      }

      // console bank along the back wall
      const front = sy + 3
      if (cons) {
        const x0 = bx0 + 2
        const x1 = bx1 - 2
        const segs = Math.max(2, Math.round((x1 - x0) / 22))
        const sw = (x1 - x0) / segs
        // risers against the wall
        k.rect(x0, cTop, x1, sy - 9, R('console'), EDGE)
        // sloped top and front face
        k.poly([[x0 - 1, sy - 5], [x0, sy - 9], [x1, sy - 9], [x1 + 1, sy - 5]], R('consoleTop'), EDGE)
        k.rect(x0 - 1, sy - 5, x1 + 1, front, R('console'), EDGE)
        k.hline(x0, x1, front - 1, EDGE)
        for (let i = 0; i < segs; i++) {
          const a = x0 + i * sw
          if (i > 0) {
            k.vline(a, cTop, sy - 9, EDGE)
            k.vline(a, sy - 5, front, EDGE)
          }
          const kind = rng.int(0, 2)
          if (kind === 0) {
            k.rect(a + 3, cTop + 2, a + sw - 3, sy - 11, R('screen'), EDGE)
            for (let y = cTop + 4; y < sy - 11; y += 2) k.hline(a + 4, a + 4 + rng.int(1, Math.max(1, sw - 9)), y, R('screenLine'))
          } else if (kind === 1) {
            k.rect(a + 3, cTop + 2, a + sw / 2 - 1, sy - 11, R('screen'), EDGE)
            lightRow(k, rng, a + sw / 2 + 2, a + sw - 3, cTop + 3, 2)
            lightRow(k, rng, a + sw / 2 + 2, a + sw - 3, cTop + 5, 2)
          } else {
            lightRow(k, rng, a + 3, a + sw - 3, cTop + 2, 2)
            lightRow(k, rng, a + 3, a + sw - 3, cTop + 4, 2)
            k.rect(a + 3, cTop + 6, a + sw - 3, sy - 11, R('screen'), EDGE)
          }
          lightRow(k, rng, a + 2, a + sw - 2, sy - 7, 2, R('console'), 0.6)
          lightRow(k, rng, a + 3, a + sw - 3, sy - 3, 3, EDGE, 0.5)
        }
      }

      // control: floor edges and the back wall / console front
      const wallY = cons ? front + 1 : sy
      const s = (wallY - b.vy) / (sy - b.vy)
      const [lx] = b.P(bx0, sy, s)
      const [rx] = b.P(bx1, sy, s)
      k.wall([[lx, wallY], [rx, wallY]])
      if (side > 0) {
        k.wall([[lx, wallY], b.exit(bx0, sy)])
        k.wall([[rx, wallY], b.exit(bx1, sy)])
      }
    },
  },
]
