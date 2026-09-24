import { R } from '../../kit/helpers'
import type { Kit } from '../../kit/kit'
import type { Rng } from '../../agi/rng'
import type { ElementDef } from '../types'
import { W, text, textLocalWidth, type Pt2 } from './common'

/** x on a line through the vanishing point (vx, vy) and (x, yRef), evaluated at row yy. */
function toward(vx: number, vy: number, x: number, yRef: number, yy: number): number {
  return vx + ((x - vx) * (yy - vy)) / (yRef - vy)
}

function skylineRow(
  k: Kit,
  rng: Rng,
  base: number,
  maxH: number,
  fill: string,
  lit: number,
  litRoles: string[],
  antennas: boolean,
): void {
  let x = -rng.int(0, 6)
  while (x <= W) {
    const bw = rng.int(7, 18)
    const tall = rng.chance(0.2)
    const h = Math.round(tall ? rng.range(0.8, 1) * maxH : rng.range(0.3, 0.75) * maxH)
    const x1 = x + bw
    const top = base - h
    k.rect(x, top, x1, base, R(fill))
    // setback crown on some towers
    let roof = top
    if (h > 14 && rng.chance(0.35)) {
      const inset = Math.max(1, Math.round(bw * rng.range(0.2, 0.3)))
      const sh = rng.int(3, 6)
      k.rect(x + inset, top - sh, x1 - inset, top, R(fill))
      roof = top - sh
      if (antennas && rng.chance(0.6)) k.vline((x + x1) / 2, roof - rng.int(3, 8), roof, R(fill))
    } else if (antennas && rng.chance(0.3)) {
      // rooftop water tank on legs
      const tx = rng.int(x + 1, Math.max(x + 1, x1 - 5))
      k.rect(tx, top - 7, tx + 4, top - 3, R(fill))
      k.hline(tx + 1, tx + 3, top - 8, R(fill))
      k.vline(tx + 1, top - 3, top, R(fill))
      k.vline(tx + 3, top - 3, top, R(fill))
    } else if (antennas && rng.chance(0.25)) {
      k.vline(rng.int(x + 1, x1 - 1), top - rng.int(3, 7), top, R(fill))
    }
    // window dots: every other column, every third row
    if (lit > 0) {
      const ox = rng.int(0, 1)
      for (let wy = top + 2; wy < base - 1; wy += 3) {
        for (let wx = x + 1 + ox; wx < x1; wx += 2) {
          if (wx < 0 || wx > W) continue
          if (rng.next() < lit) k.dot(wx, wy, R(rng.pick(litRoles)))
        }
      }
    }
    x = x1 + (rng.chance(0.2) ? rng.int(1, 3) : 1)
  }
}

export const street: ElementDef[] = [
  {
    id: 'modern-street',
    name: 'Street and sidewalks',
    themes: ['modern'],
    category: 'ground',
    tags: ['road', 'sidewalk', 'curb', 'city', 'asphalt', 'crosswalk'],
    span: 'full',
    roles: {
      asphalt: { label: 'Asphalt', color: 8 },
      sidewalk: { label: 'Sidewalk', color: 7 },
      curb: { label: 'Curb', color: 15 },
      gutter: { label: 'Gutter', color: 0 },
      joint: { label: 'Slab joints', color: 8 },
      lane: { label: 'Center line', color: 14 },
      dash: { label: 'Lane dashes', color: 15 },
      stripe: { label: 'Crosswalk', color: 15 },
      detail: { label: 'Cracks / covers', color: 0 },
    },
    params: [
      { key: 'street', label: 'Street depth', type: 'int', min: 16, max: 80, default: 38 },
      { key: 'farWalk', label: 'Far sidewalk', type: 'int', min: 0, max: 24, default: 8 },
      {
        key: 'lines', label: 'Lane markings', type: 'select', default: 'center',
        options: [
          { value: 'none', label: 'None' },
          { value: 'center', label: 'Double yellow' },
          { value: 'dashed', label: 'Dashed white' },
          { value: 'both', label: 'Center + lanes' },
        ],
      },
      {
        key: 'cross', label: 'Crosswalk', type: 'select', default: 'none',
        options: [
          { value: 'none', label: 'None' },
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      },
      { key: 'details', label: 'Cracks and manhole', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    place: { x: 80, y: 100 },
    hasControl: true,
    generate(k, p, rng) {
      const y = Math.round(k.ctx.y)
      const sh = p.n('street')
      const fw = p.n('farWalk')
      const near = y + sh // near curb row
      const vx = 80
      const vy = Math.min(k.ctx.horizon, y - fw - 12)

      // far sidewalk and curb face
      if (fw > 0) {
        const top = y - fw
        if (y - 3 >= top) {
          k.rect(0, top, W, y - 3, R('sidewalk'))
          for (let jx = 8 + rng.int(0, 10); jx < W + 20; jx += 22) {
            k.line([[toward(vx, vy, jx, y, top), top], [jx, y - 3]], R('joint'))
          }
        }
        k.rect(0, Math.max(top, y - 2), W, y - 1, R('curb'))
      }
      // asphalt with the gutter line along the far curb
      k.rect(0, y, W, Math.min(167, near - 1), R('asphalt'))
      if (fw > 0) k.hline(0, W, y, R('gutter'))

      // lane markings
      const lines = p.s('lines')
      const mid = Math.round(y + sh / 2)
      if (lines === 'center' || lines === 'both') {
        k.hline(0, W, mid - 1, R('lane'))
        k.hline(0, W, mid + 1, R('lane'))
      }
      const dashes = (row: number, len: number, gap: number) => {
        const off = rng.int(0, gap)
        for (let x = -off; x <= W; x += len + gap) k.hline(Math.max(0, x), Math.min(W, x + len - 1), row, R('dash'))
      }
      if (lines === 'dashed') dashes(mid, 10, 8)
      if (lines === 'both' && sh >= 28) {
        dashes(Math.round(y + sh * 0.25), 8, 8)
        dashes(Math.round(y + sh * 0.75), 12, 8)
      }

      // details: oil stains, cracks, manhole cover, storm drain
      if (p.b('details')) {
        for (let i = 0; i < 3; i++) {
          const cx = rng.int(4, W - 12)
          const cy = rng.int(y + 3, near - 3)
          if (Math.abs(cy - mid) <= 2) continue
          k.line([[cx, cy], [cx + rng.int(3, 6), cy + rng.int(-1, 1)], [cx + rng.int(7, 11), cy]], R('detail'))
        }
        if (sh >= 24) {
          const mx = rng.int(20, W - 20)
          const my = Math.round(y + sh * (rng.chance(0.5) ? 0.3 : 0.7))
          k.ellipse(mx, my, 5, 2, R('detail'))
          k.hline(mx - 2, mx + 2, my, R('asphalt'))
        }
        if (fw > 0) {
          const dx = rng.int(10, W - 16)
          k.rect(dx, y - 2, dx + 6, y - 1, R('detail'))
        }
      }

      // crosswalk: zebra bars converging on the vanishing point
      const cross = p.s('cross')
      if (cross !== 'none') {
        const cx = cross === 'left' ? 30 : cross === 'right' ? 129 : 80
        const hw = 14
        let bar = 0
        for (let yy = y + 1; yy <= near - 1; yy++, bar++) {
          const xl = toward(vx, vy, cx - hw - 2, near, yy)
          const xr = toward(vx, vy, cx + hw + 2, near, yy)
          // lane paint stops at the crossing; bars alternate with bare asphalt
          const isBar = yy >= y + 2 && yy <= near - 2 && bar % 4 < 2
          k.hline(Math.max(0, xl), Math.min(W, xr), yy, isBar ? R('stripe') : R('asphalt'))
        }
      }

      // near curb and sidewalk
      if (near <= 167) {
        k.rect(0, near, W, Math.min(167, near + 1), R('curb'))
        if (near + 2 <= 167) {
          k.rect(0, near + 2, W, 167, R('sidewalk'))
          const off = rng.int(0, 16)
          for (let jx = -80 + off; jx < W + 80; jx += 36) {
            const x0 = toward(vx, vy, jx, 167, near + 2)
            if (x0 < -2 && jx < 0) continue
            k.line([[x0, near + 2], [jx, 167]], R('joint'))
          }
        }
        // cars stop at the curb: conditional walls along both curbs
        k.condWall([[0, near], [W, near]])
      }
      if (fw > 0) k.condWall([[0, y], [W, y]])
    },
  },
  {
    id: 'modern-skyline',
    name: 'City skyline',
    themes: ['modern'],
    category: 'backdrop',
    tags: ['city', 'buildings', 'night', 'distant', 'skyscraper'],
    span: 'full',
    roles: {
      far: { label: 'Far buildings', color: 1 },
      near: { label: 'Near buildings', color: 8 },
      lit: { label: 'Lit windows', color: 14 },
      lit2: { label: 'Lit windows 2', color: 15 },
      beacon: { label: 'Beacon', color: 12 },
    },
    params: [
      { key: 'height', label: 'Max height', type: 'int', min: 12, max: 80, default: 46 },
      { key: 'lit', label: 'Lit windows %', type: 'int', min: 0, max: 100, default: 30 },
      { key: 'rows', label: 'Rows', type: 'int', min: 1, max: 2, default: 2 },
      { key: 'antennas', label: 'Roof details', type: 'bool', default: true },
      { key: 'tower', label: 'Landmark tower', type: 'bool', default: true },
    ],
    defaultPriority: 'rows',
    perspective: false,
    // sits right on top of modern-street's far sidewalk at their defaults
    place: { x: 80, y: 92 },
    generate(k, p, rng) {
      const base = Math.round(k.ctx.y)
      const h = p.n('height')
      const lit = p.n('lit') / 100
      const ant = p.b('antennas')
      if (p.n('rows') >= 2) skylineRow(k, rng.fork(1), base, h, 'far', lit * 0.6, ['lit'], ant)
      // landmark: stepped tower with a spire, drawn between the rows
      if (p.b('tower')) {
        const r2 = rng.fork(3)
        const tx = r2.int(24, 136)
        const th = Math.round(h * 1.25)
        const tw = 6
        const top = base - th
        k.rect(tx - tw, base - Math.round(th * 0.55), tx + tw, base, R('near'))
        k.rect(tx - tw + 2, base - Math.round(th * 0.8), tx + tw - 2, base, R('near'))
        k.rect(tx - 2, top, tx + 2, base, R('near'))
        k.vline(tx, top - Math.round(h * 0.25), top, R('near'))
        k.dot(tx, top - Math.round(h * 0.25), R('beacon'))
        if (lit > 0) {
          for (let wy = top + 2; wy < base - 1; wy += 3) {
            const half = wy < base - th * 0.8 ? 1 : wy < base - th * 0.55 ? 3 : 5
            for (let wx = tx - half; wx <= tx + half; wx += 2) if (r2.next() < lit) k.dot(wx, wy, R('lit'))
          }
        }
      }
      skylineRow(k, rng.fork(2), base, Math.round(h * 0.7), 'near', lit, ['lit', 'lit', 'lit2'], ant)
      // solid street-level base so the skyline always meets whatever stands below it
      k.rect(0, base - 3, W, base, R('near'))
    },
  },
  {
    id: 'modern-streetlamp',
    name: 'Streetlamp',
    themes: ['modern'],
    category: 'prop',
    tags: ['light', 'lamp', 'street', 'night', 'pole'],
    roles: {
      pole: { label: 'Pole', color: 8 },
      lamp: { label: 'Lamp', color: 14 },
      off: { label: 'Unlit lamp', color: 7 },
      pool: { label: 'Light pool', color: 14 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 34, max: 90, default: 58 },
      {
        key: 'style', label: 'Style', type: 'select', default: 'cobra',
        options: [
          { value: 'cobra', label: 'Cobra head' },
          { value: 'globe', label: 'Globe' },
          { value: 'double', label: 'Double globe' },
        ],
      },
      { key: 'lit', label: 'Lit', type: 'bool', default: true },
      { key: 'pool', label: 'Light pool', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 40, y: 124 },
    hasControl: true,
    generate(k, p) {
      const h = p.n('height')
      const style = p.s('style')
      const lamp = p.b('lit') ? R('lamp') : R('off')
      if (p.b('pool') && p.b('lit')) {
        const px = style === 'cobra' ? h * 0.2 : 0
        k.withPriority('rows', () => k.ellipse(px, 1, 13, 3, R('pool')))
      }
      // base and pole
      k.rect(-2, -4, 2, 0, R('pole'), R('line'))
      if (style === 'globe' || style === 'double') {
        k.rect(-1, -h, 1, -4, R('pole'), R('line'))
        k.rect(-2, -h * 0.35, 2, -h * 0.35 + 2, R('pole'), R('line'))
      } else {
        k.vline(-1, -h, -4, R('pole'))
        k.vline(0, -h, -4, R('line'))
      }
      if (style === 'cobra') {
        const reach = Math.max(8, h * 0.22)
        const arm: Pt2[] = [[0, -h], [2, -h - 3], [reach * 0.55, -h - 4], [reach, -h - 3]]
        k.line(arm, R('line'))
        k.line(arm.map(([x, y]) => [x, y + 1] as Pt2), R('pole'))
        k.poly([[reach - 3, -h - 5], [reach + 4, -h - 5], [reach + 5, -h - 3], [reach + 3, -h - 1], [reach - 3, -h - 2]], R('pole'), R('line'))
        k.hline(reach - 2, reach + 3, -h - 1, lamp)
      } else if (style === 'globe') {
        k.rect(-2, -h - 1, 2, -h, R('pole'), R('line'))
        k.ellipse(0, -h - 6, 3, 5, lamp, R('line'))
        k.rect(-1, -h - 12, 1, -h - 11, R('pole'), R('line'))
      } else {
        k.line([[-6, -h - 1], [6, -h - 1]], R('line'))
        k.line([[-6, -h], [6, -h]], R('pole'))
        for (const sx of [-6, 6]) {
          k.ellipse(sx, -h - 6, 3, 5, lamp, R('line'))
          k.rect(sx - 1, -h - 12, sx + 1, -h - 11, R('pole'), R('line'))
        }
        k.rect(-1, -h - 4, 1, -h - 1, R('pole'), R('line'))
      }
      k.wall([[-2, 0], [2, 0]])
    },
  },
  {
    id: 'modern-hydrant',
    name: 'Fire hydrant',
    themes: ['modern'],
    category: 'prop',
    tags: ['hydrant', 'street', 'sidewalk', 'red'],
    roles: {
      body: { label: 'Body', color: 4 },
      light: { label: 'Highlight', color: 12 },
      cap: { label: 'Caps', color: 15 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 8, max: 16, default: 11 },
      { key: 'nozzles', label: 'Side nozzles', type: 'bool', default: true },
      { key: 'shine', label: 'Highlight', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 110, y: 128 },
    hasControl: true,
    generate(k, p) {
      // Tiny prop: flat color blocks without outlines read best at this size.
      const h = p.n('height')
      const s = h / 11
      const bw = h >= 14 ? 2 : 1
      const collar = -Math.round(8 * s)
      k.rect(-bw - 1, -1, bw + 1, 0, R('body')) // base flange
      k.hline(-bw - 1, bw + 1, 0, R('line'))
      k.rect(-bw, collar + 1, bw, -2, R('body')) // barrel
      k.hline(-bw - 1, bw + 1, collar, R('body')) // collar
      k.hline(-bw, bw, collar - 1, R('cap')) // dome
      k.hline(-bw + 1, bw - 1, collar - 2, R('cap'))
      k.vline(0, -h, collar - 2 - (bw > 1 ? 0 : 1), R('line')) // operating nut
      k.vline(bw, collar + 1, -2, R('line')) // shaded side
      if (p.b('nozzles')) {
        const ny = collar + Math.max(2, Math.round(2 * s))
        k.rect(-bw - 2, ny, -bw - 1, ny + 1, R('cap'))
        k.rect(bw + 1, ny, bw + 2, ny + 1, R('cap'))
        k.dot(bw + 2, ny + 1, R('line'))
      }
      if (p.b('shine')) k.vline(-bw, collar + 1, -2, R('light'))
      k.wall([[-bw - 1, 0], [bw + 1, 0]])
    },
  },
  {
    id: 'modern-phonebooth',
    name: 'Phone booth',
    themes: ['modern'],
    category: 'structure',
    tags: ['phone', 'booth', 'telephone', 'street'],
    roles: {
      frame: { label: 'Frame', color: 7 },
      glass: { label: 'Glass', color: 3 },
      glint: { label: 'Glint', color: 11 },
      panel: { label: 'Lower panels', color: 8 },
      sign: { label: 'Sign', color: 15 },
      signText: { label: 'Sign text', color: 1 },
      phone: { label: 'Phone', color: 0 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 34, max: 48, default: 42 },
      {
        key: 'style', label: 'Style', type: 'select', default: 'booth',
        options: [
          { value: 'booth', label: 'Enclosed booth' },
          { value: 'kiosk', label: 'Open kiosk' },
        ],
      },
      { key: 'sign', label: 'PHONE sign', type: 'bool', default: true },
      { key: 'open', label: 'Door open', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 120, y: 118 },
    hasControl: true,
    generate(k, p) {
      const h = p.n('height')
      const hw = 8
      const sign = p.b('sign')
      if (p.s('style') === 'kiosk') {
        // pedestal phone under a hood
        const top = -h + 8
        k.rect(-1, top + 14, 1, 0, R('frame'), R('line'))
        k.rect(-3, -2, 3, 0, R('frame'), R('line'))
        k.poly([[-hw, top], [hw, top], [hw, top + 14], [hw - 2, top + 14], [hw - 2, top + 2], [-hw + 2, top + 2], [-hw + 2, top + 14], [-hw, top + 14]], R('frame'), R('line'))
        k.rect(-hw + 2, top + 2, hw - 2, top + 13, R('panel'), R('line'))
        k.rect(-3, top + 3, 3, top + 11, R('phone'), R('line'))
        k.rect(-2, top + 4, 2, top + 5, R('glint'))
        k.rect(-3, top + 3, -2, top + 9, R('frame'))
        if (sign) {
          k.rect(-hw - 2, top - 8, hw + 2, top, R('sign'), R('line'))
          text(k, 'PHONE', 0, top - 6, R('signText'))
        } else k.rect(-hw, top - 2, hw, top, R('frame'), R('line'))
        k.wall([[-3, 0], [3, 0]])
        return
      }
      const top = -h + (sign ? 10 : 2)
      // roof cap and sign light box
      if (sign) {
        k.rect(-hw - 2, -h, hw + 2, -h + 8, R('sign'), R('line'))
        text(k, 'PHONE', 0, -h + 2, R('signText'))
      }
      k.rect(-hw - 1, top - 2, hw + 1, top, R('frame'), R('line'))
      // shell
      k.rect(-hw, top, hw, 0, R('frame'), R('line'))
      // back wall glass and phone, seen through the door
      const g0 = top + 3
      const rail = -9
      k.rect(-hw + 2, g0, hw - 2, rail, R('glass'), R('line'))
      k.rect(-3, g0 + 8, 2, g0 + 16, R('phone'), R('line'))
      k.rect(-3, g0 + 7, -2, g0 + 13, R('phone'))
      k.hline(-1, 1, g0 + 10, R('frame'))
      k.rect(-hw + 2, rail + 1, hw - 2, -2, R('panel'), R('line'))
      if (p.b('open')) {
        // bifold door folded to the right
        k.rect(hw - 5, top + 1, hw - 1, -1, R('frame'), R('line'))
        k.vline(hw - 3, top + 1, -1, R('line'))
      } else {
        k.vline(0, g0, -2, R('line'))
        k.line([[-hw + 3, g0 + 6], [-hw + 5, g0 + 2]], R('glint'))
        k.line([[3, g0 + 10], [5, g0 + 6]], R('glint'))
        k.hline(-hw + 2, hw - 2, Math.round((g0 + rail) / 2), R('frame'))
      }
      k.hline(-hw, hw, 0, R('line'))
      k.wall([[-hw, 0], [-hw + 2, 0]])
      k.wall([[hw - 2, 0], [hw, 0]])
      k.trigger([[-hw + 3, 0], [hw - 3, 0]])
    },
  },
  {
    id: 'modern-trash',
    name: 'Trash can or dumpster',
    themes: ['modern'],
    category: 'prop',
    tags: ['trash', 'garbage', 'dumpster', 'alley', 'bin'],
    roles: {
      metal: { label: 'Can metal', color: 7 },
      rib: { label: 'Ribs', color: 8 },
      bin: { label: 'Dumpster', color: 2 },
      lid: { label: 'Dumpster lid', color: 0 },
      trash: { label: 'Trash', color: 15 },
      bag: { label: 'Bags', color: 8 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'can',
        options: [
          { value: 'can', label: 'Metal can' },
          { value: 'basket', label: 'Wire basket' },
          { value: 'dumpster', label: 'Dumpster' },
        ],
      },
      { key: 'size', label: 'Size %', type: 'int', min: 60, max: 150, default: 100 },
      { key: 'overflow', label: 'Overflowing', type: 'bool', default: false },
      { key: 'litter', label: 'Litter around', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 60, y: 126 },
    hasControl: true,
    generate(k, p, rng) {
      const s = p.n('size') / 100
      const kind = p.s('kind')
      const over = p.b('overflow')
      let hw: number
      if (kind === 'dumpster') {
        hw = 18 * s
        const h = 20 * s
        const top = -h
        // body tapers slightly toward the bottom
        k.poly([[-hw, top], [hw, top], [hw - 1, -3], [-hw + 1, -3]], R('bin'), R('line'))
        k.hline(-hw, hw, top + 3, R('line'))
        for (let i = 1; i < 4; i++) k.vline(-hw + (2 * hw * i) / 4, top + 4, -4, R('line'))
        // lids: one closed, one propped open or bulging with bags
        if (over) {
          for (let i = 0; i < 4; i++) {
            const bx = rng.range(-hw + 4, hw - 4)
            k.blob(bx, top - 2, rng.range(3, 5), rng.range(2, 3), rng, R('bag'), R('line'), 5, 0.2)
          }
          k.poly([[-hw, top], [0, top], [2, top - 6], [-hw + 2, top - 7]], R('lid'), R('line'))
        } else {
          k.rect(-hw - 1, top - 2, hw + 1, top, R('lid'), R('line'))
          k.vline(0, top - 2, top, R('bin'))
        }
        // wheels
        for (const wx of [-hw + 3, hw - 3]) k.ellipse(wx, -1.5, 1.5, 2, R('line'))
        k.rect(-hw - 3, top + 5, -hw, top + 7, R('bin'), R('line'))
      } else if (kind === 'basket') {
        hw = 5 * s
        const h = 13 * s
        k.poly([[-hw, -h], [hw, -h], [hw - 1, -1], [-hw + 1, -1]], R('bin'), R('line'))
        for (let x = -hw + 2; x < hw - 1; x += 2) k.vline(x, -h + 1, -2, R('line'))
        k.hline(-hw, hw, Math.round(-h * 0.5), R('bin'))
        k.rect(-hw - 1, -h - 1, hw + 1, -h, R('bin'), R('line'))
        k.rect(-hw + 1, -1, hw - 1, 0, R('line'))
        if (over) {
          k.blob(-1, -h - 2, hw * 0.7, 2.5, rng, R('trash'), R('line'), 5, 0.3)
          k.rect(1, -h - 4, 3, -h - 1, R('rib'), R('line'))
        }
      } else {
        hw = 4 * s
        const h = 13 * s
        k.rect(-hw, -h, hw, 0, R('metal'), R('line'))
        for (const f of [-0.5, 0, 0.5]) k.vline(hw * f, -h + 2, -2, R('rib'))
        k.hline(-hw, hw, Math.round(-h * 0.35), R('rib'))
        k.hline(-hw, hw, Math.round(-h * 0.7), R('rib'))
        if (over) {
          k.blob(0, -h - 1.5, hw + 1, 2.5, rng, R('trash'), R('line'), 6, 0.35)
          k.poly([[hw - 1, -h - 1], [hw + 4, -h - 5], [hw + 5, -h - 3], [hw + 1, 0 - h + 1]], R('metal'), R('line'))
        } else {
          k.poly(k.ellipsePts(0, -h, hw + 1, 2.5, 12, Math.PI, Math.PI * 2), R('metal'), R('line'))
          k.hline(-hw - 1, hw + 1, -h, R('line'))
          k.rect(-1, -h - 4, 1, -h - 3, R('metal'), R('line'))
        }
      }
      if (p.b('litter')) {
        k.withPriority('rows', () => {
          for (let i = 0; i < 4; i++) {
            const lx = rng.range(-hw - 8, hw + 8)
            const ly = rng.range(-1, 2)
            k.rect(lx, ly, lx + rng.int(1, 2), ly + 1, R(rng.chance(0.6) ? 'trash' : 'bag'))
          }
        })
      }
      k.wall([[-hw, 0], [hw, 0]])
    },
  },
  {
    id: 'modern-meter',
    name: 'Parking meter',
    themes: ['modern'],
    category: 'prop',
    tags: ['parking', 'meter', 'street', 'sidewalk'],
    roles: {
      pole: { label: 'Pole', color: 8 },
      head: { label: 'Head', color: 7 },
      glass: { label: 'Dial glass', color: 11 },
      flag: { label: 'Expired flag', color: 4 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 14, max: 26, default: 20 },
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'single',
        options: [
          { value: 'single', label: 'Single' },
          { value: 'double', label: 'Double' },
        ],
      },
      { key: 'expired', label: 'Expired', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 96, y: 126 },
    hasControl: true,
    generate(k, p) {
      const h = p.n('height')
      const expired = p.b('expired')
      const head = (cx: number, hy: number) => {
        k.rect(cx - 2, hy - 7, cx + 2, hy, R('head'), R('line'))
        k.poly(k.ellipsePts(cx, hy - 7, 2, 3, 10, Math.PI, Math.PI * 2), R('glass'), R('line'))
        k.hline(cx - 1, cx + 1, hy - 3, R('line'))
        if (expired) k.rect(cx - 1, hy - 9, cx + 1, hy - 8, R('flag'))
      }
      k.rect(-1, -h + 7, 0, 0, R('pole'), R('line'))
      k.hline(-2, 1, 0, R('line'))
      if (p.s('kind') === 'double') {
        k.rect(-4, -h + 7, 4, -h + 8, R('pole'), R('line'))
        head(-3, -h + 7)
        head(3, -h + 7)
      } else head(0, -h + 7)
      k.wall([[-1, 0], [1, 0]])
    },
  },
  {
    id: 'modern-car',
    name: 'Car',
    themes: ['modern'],
    category: 'prop',
    tags: ['car', 'police', 'cruiser', 'taxi', 'vehicle', 'street'],
    roles: {
      paint: { label: 'Paint', color: 1 },
      police: { label: 'Cruiser white', color: 15 },
      taxi: { label: 'Taxi yellow', color: 14 },
      glass: { label: 'Glass', color: 3 },
      chrome: { label: 'Chrome', color: 7 },
      tire: { label: 'Tires', color: 0 },
      head: { label: 'Headlight', color: 14 },
      tail: { label: 'Taillight', color: 4 },
      siren: { label: 'Light bar red', color: 12 },
      siren2: { label: 'Light bar blue', color: 9 },
      badge: { label: 'Door star', color: 14 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      {
        key: 'kind', label: 'Kind', type: 'select', default: 'sedan',
        options: [
          { value: 'sedan', label: 'Sedan' },
          { value: 'police', label: 'Police cruiser' },
          { value: 'taxi', label: 'Taxi' },
          { value: 'wagon', label: 'Station wagon' },
        ],
      },
      { key: 'length', label: 'Length', type: 'int', min: 40, max: 72, default: 58 },
      { key: 'doors', label: 'Four doors', type: 'bool', default: true },
      { key: 'lights', label: 'Lights on', type: 'bool', default: false },
    ],
    defaultPriority: 'baseline',
    perspective: false,
    place: { x: 80, y: 124 },
    hasControl: true,
    generate(k, p) {
      const kind = p.s('kind')
      const L = p.n('length')
      const a = L / 2
      const four = p.b('doors')
      const lights = p.b('lights')
      const wagon = kind === 'wagon'
      const body = kind === 'police' ? R('police') : kind === 'taxi' ? R('taxi') : R('paint')
      const sill = -3
      const belt = -13
      const roof = -22
      const wr = 2.8 // wheel radius in x; y radius is ~1.7x for round wheels
      const wry = 4.7
      const wy = -wry
      const rearW = -a + L * 0.2
      const frontW = a - L * 0.2

      // cabin (greenhouse) and its windows, split by the B pillar
      const cRear = wagon ? -a + 2 : -a * 0.58
      const cRoofR = wagon ? -a + 3 : -a * 0.4
      const cRoofF = a * 0.08
      const cFront = a * 0.36
      k.poly([[cRear, belt], [cRoofR, roof], [cRoofF, roof], [cFront, belt]], body, R('line'))
      const bp = four ? -a * 0.14 : -a * 0.05
      const gTop = roof + 2
      const gy = belt - 1
      const xr = (yy: number) => cRear + ((cRoofR - cRear) * (yy - belt)) / (roof - belt) + 1.5
      const xf = (yy: number) => cFront + ((cRoofF - cFront) * (yy - belt)) / (roof - belt) - 1.5
      k.poly([[xr(gy), gy], [xr(gTop), gTop], [bp - 1, gTop], [bp - 1, gy]], R('glass'), R('line'))
      k.poly([[bp + 1, gy], [bp + 1, gTop], [xf(gTop), gTop], [xf(gy), gy]], R('glass'), R('line'))
      if (wagon) k.vline(-a * 0.52, gTop, gy, R('line'))

      // lower body: square tail, hood sloping gently to the grille
      k.poly([[-a, sill - 1], [-a, belt + 1], [-a + 1, belt], [a - 2, belt + 1], [a, belt + 3], [a, sill - 1], [a - 1, sill], [-a + 1, sill]], body, R('line'))
      if (kind === 'police') {
        // black-and-white: black hood, trunk and fenders
        k.poly([[cFront + 2, belt], [a - 2, belt + 1], [a, belt + 3], [a, sill - 1], [a - 1, sill], [cFront + 2, sill]], R('line'))
        k.poly([[-a, sill - 1], [-a, belt + 1], [-a + 1, belt], [cRear - 1, belt], [cRear - 1, sill], [-a + 1, sill]], R('line'))
      }

      // trim strip or taxi checker band
      if (kind === 'taxi') {
        for (let x = Math.ceil(-a + 1), i = 0; x < a - 1; x++, i++) {
          k.dot(x, -8 + (Math.floor(i / 2) % 2), R('line'))
        }
      } else if (kind !== 'police') k.hline(-a + 1, a - 1, -8, R('chrome'))

      // door seams and handles
      const dFront = cFront - 1
      const dRear = Math.max(cRear + 1, rearW + wr + 2)
      k.vline(dFront, belt, sill - 1, R('line'))
      k.vline(bp, belt, sill - 1, R('line'))
      k.hline(bp + 2, bp + 4, belt + 2, R('chrome'))
      if (four) {
        k.vline(dRear, belt, sill - 1, R('line'))
        k.hline(dRear + 2, dRear + 4, belt + 2, R('chrome'))
      }

      // police lettering between the wheels when it fits, else a door star
      if (kind === 'police') {
        const tw = textLocalWidth(k, 'POLICE') / 2
        const room = (frontW - rearW) / 2 - wr - 2
        if (tw + 1 <= room) {
          k.rect(-tw - 1, belt + 2, tw + 1, belt + 7, R('police'))
          text(k, 'POLICE', 0, belt + 2.5, R('line'))
        } else k.ellipse((bp + dFront) / 2, belt + 5, 1.5, 2.5, R('badge'), R('line'))
      }

      // wheels in dark wells
      for (const wx of [rearW, frontW]) {
        k.poly(k.ellipsePts(wx, wy, wr + 1, wry + 1, 12, Math.PI, Math.PI * 2), R('line'))
        k.ellipse(wx, wy, wr, wry, R('tire'), R('line'))
        k.ellipse(wx, wy, wr * 0.45, wry * 0.45, R('chrome'))
      }

      // bumpers and lamps
      k.rect(a - 1, -6, a + 1, -4, R('chrome'), R('line'))
      k.rect(-a - 1, -6, -a + 1, -4, R('chrome'), R('line'))
      k.rect(a - 1, belt + 3, a, belt + 5, lights ? R('head') : R('chrome'))
      k.rect(-a, belt + 2, -a + 1, belt + 4, lights ? R('siren') : R('tail'))

      // roof extras
      if (kind === 'police') {
        const lb = (cRoofR + cRoofF) / 2
        k.rect(lb - 5, roof - 3, lb, roof - 1, lights ? R('siren') : R('chrome'), R('line'))
        k.rect(lb, roof - 3, lb + 5, roof - 1, lights ? R('siren2') : R('chrome'), R('line'))
      } else if (kind === 'taxi') {
        const mid = (cRoofR + cRoofF) / 2
        const sw = textLocalWidth(k, 'TAXI') / 2 + 2
        k.rect(mid - sw, roof - 7, mid + sw, roof - 1, R('taxi'), R('line'))
        text(k, 'TAXI', mid, roof - 6, R('line'))
      }
      k.wall([[-a, 0], [a, 0]])
    },
  },
  {
    id: 'modern-traffic-light',
    name: 'Traffic signal',
    themes: ['modern'],
    category: 'prop',
    tags: ['traffic', 'signal', 'stoplight', 'intersection', 'street', 'corner'],
    roles: {
      pole: { label: 'Pole', color: 8 },
      housing: { label: 'Housing', color: 8 },
      red: { label: 'Red lamp', color: 12 },
      amber: { label: 'Amber lamp', color: 14 },
      green: { label: 'Green lamp', color: 10 },
      dark: { label: 'Unlit lamps', color: 0 },
      walk: { label: 'Walk signal', color: 12 },
      line: { label: 'Outline', color: 0 },
    },
    params: [
      { key: 'height', label: 'Head clearance', type: 'int', min: 36, max: 80, default: 54 },
      {
        key: 'mount', label: 'Mount', type: 'select', default: 'post',
        options: [
          { value: 'post', label: 'On the post' },
          { value: 'mast', label: 'Mast arm' },
        ],
      },
      {
        key: 'state', label: 'Showing', type: 'select', default: 'red',
        options: [
          { value: 'red', label: 'Red' },
          { value: 'amber', label: 'Amber' },
          { value: 'green', label: 'Green' },
          { value: 'off', label: 'Off' },
        ],
      },
      { key: 'walk', label: 'Walk signal', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 140, y: 140 },
    hasControl: true,
    generate(k, p) {
      const h = p.n('height')
      const state = p.s('state')
      const mast = p.s('mount') === 'mast'
      // pole; the signal head's bottom sits at -h in both mounts (well above a 34-row person)
      const top = mast ? -h - 22 : -h
      k.rect(-2, -3, 2, 0, R('pole'), R('line'))
      k.vline(-1, top, -3, R('pole'))
      k.vline(0, top, -3, R('line'))
      // signal head: three round lamps stacked in a housing
      const head = (cx: number, t0: number) => {
        k.rect(cx - 3, t0, cx + 3, t0 + 19, R('housing'), R('line'))
        const lamps: [string, number][] = [['red', t0 + 2], ['amber', t0 + 8], ['green', t0 + 14]]
        for (const [name, t] of lamps) {
          const c = state === name ? R(name) : R('dark')
          k.vline(cx, t, t + 4, c)
          k.rect(cx - 1, t + 1, cx + 1, t + 3, c)
        }
      }
      if (mast) {
        const reach = Math.max(16, h * 0.4)
        k.line([[0, top], [reach, top - 2]], R('line'))
        k.line([[0, top + 1], [reach, top - 1]], R('pole'))
        k.vline(reach - 3, top, -h - 19, R('line')) // hanger
        head(reach - 3, -h - 19)
      } else head(0, -h - 19)
      if (p.b('walk')) {
        // pedestrian signal box with a lit hand
        const wy = -Math.min(40, h - 4)
        k.rect(-6, wy - 6, -2, wy, R('line'))
        k.rect(-5, wy - 5, -3, wy - 1, R('walk'))
        k.dot(-4, wy - 1, R('line'))
      }
      k.wall([[-2, 0], [2, 0]])
    },
  },
]
