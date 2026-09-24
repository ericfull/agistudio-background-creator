import { describe, expect, it } from 'vitest'
import { compose } from '../src/agi/compose'
import { PIC_W, PRI_BASELINE, PRI_ROWS, T } from '../src/agi/constants'
import { bandForY, effectivePriority } from '../src/agi/priority'
import { agiLine, Raster, rasterize } from '../src/agi/raster'
import { plotPattern } from '../src/agi/pen'

const at = (buf: Uint8Array, x: number, y: number) => buf[y * PIC_W + x]

describe('priority bands', () => {
  it('matches the classic AGI table with base 48', () => {
    expect(bandForY(0)).toBe(4)
    expect(bandForY(47)).toBe(4)
    expect(bandForY(48)).toBe(5)
    expect(bandForY(59)).toBe(5)
    expect(bandForY(60)).toBe(6)
    expect(bandForY(155)).toBe(13)
    expect(bandForY(156)).toBe(14)
    expect(bandForY(167)).toBe(14)
  })
  it('looks below control pixels for the real priority', () => {
    const p = new Uint8Array(PIC_W * 168).fill(4)
    p[10 * PIC_W + 5] = 0
    p[11 * PIC_W + 5] = 9
    expect(effectivePriority(p, 5, 10)).toBe(9)
  })
})

describe('AGI line', () => {
  const pts = (x1: number, y1: number, x2: number, y2: number) => {
    const out: string[] = []
    agiLine(x1, y1, x2, y2, (x, y) => out.push(`${x},${y}`))
    return out
  }
  it('draws horizontal and vertical lines inclusively', () => {
    expect(pts(2, 3, 5, 3)).toEqual(['2,3', '3,3', '4,3', '5,3'])
    expect(pts(1, 4, 1, 2)).toEqual(['1,2', '1,3', '1,4'])
  })
  it('steps the major axis every pixel with rounding at the half', () => {
    // the minor-axis error starts at half, so it steps on reaching the half (AGI rounding)
    expect(pts(0, 0, 4, 2)).toEqual(['0,0', '1,1', '2,1', '3,2', '4,2'])
    expect(pts(0, 0, 2, 4)).toEqual(['0,0', '1,1', '1,2', '2,3', '2,4'])
  })
  it('is 8-connected', () => {
    const p = pts(3, 7, 40, 29).map((s) => s.split(',').map(Number))
    for (let i = 1; i < p.length; i++) {
      expect(Math.abs(p[i][0] - p[i - 1][0])).toBeLessThanOrEqual(1)
      expect(Math.abs(p[i][1] - p[i - 1][1])).toBeLessThanOrEqual(1)
    }
  })
})

describe('fill', () => {
  it('only spreads into untouched pixels and stops at outlines', () => {
    const r = rasterize([
      { op: 'visual', color: 4 },
      { op: 'line', pts: [[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]] },
      { op: 'visual', color: 2 },
      { op: 'fill', pts: [[15, 15]] },
    ])
    expect(at(r.visual, 15, 15)).toBe(2)
    expect(at(r.visual, 11, 11)).toBe(2)
    expect(at(r.visual, 10, 15)).toBe(4)
    expect(at(r.visual, 9, 15)).toBe(T)
    expect(at(r.visual, 25, 25)).toBe(T)
  })
  it('does nothing on already drawn pixels', () => {
    const r = rasterize([
      { op: 'visual', color: 4 },
      { op: 'line', pts: [[0, 0], [5, 0]] },
      { op: 'visual', color: 1 },
      { op: 'fill', pts: [[2, 0]] },
    ])
    expect(at(r.visual, 2, 0)).toBe(4)
  })
  it('fills the priority screen when visual drawing is off', () => {
    const r = rasterize([
      { op: 'priority', value: 3 },
      { op: 'line', pts: [[0, 5], [159, 5]] },
      { op: 'fill', pts: [[3, 2]] },
    ])
    expect(at(r.priority, 3, 0)).toBe(3)
    expect(at(r.visual, 3, 0)).toBe(T)
    expect(at(r.priority, 3, 6)).toBe(T)
  })
})

describe('pen', () => {
  it('covers (size+1) columns by (2*size+1) rows for a square pen', () => {
    for (const size of [0, 1, 3, 7]) {
      const seen = new Set<string>()
      plotPattern(40, 40, { size, square: true, splatter: false }, 1, (x, y) => seen.add(`${x},${y}`))
      expect(seen.size).toBe((size + 1) * (size * 2 + 1))
    }
  })
  it('makes a round-ish circle pen and a sparse splatter', () => {
    const solid: string[] = []
    const spray: string[] = []
    plotPattern(40, 40, { size: 4, square: false, splatter: false }, 1, (x, y) => solid.push(`${x},${y}`))
    plotPattern(40, 40, { size: 4, square: false, splatter: true }, 21, (x, y) => spray.push(`${x},${y}`))
    expect(solid.length).toBeGreaterThan(20)
    expect(solid.length).toBeLessThan(45)
    expect(spray.length).toBeGreaterThan(0)
    expect(spray.length).toBeLessThan(solid.length)
  })
})

describe('corner lines', () => {
  it('alternates horizontal and vertical segments', () => {
    const r = rasterize([
      { op: 'visual', color: 1 },
      { op: 'xcorner', start: [0, 0], steps: [5, 5, 10] },
    ])
    expect(at(r.visual, 5, 0)).toBe(1)
    expect(at(r.visual, 5, 5)).toBe(1)
    expect(at(r.visual, 10, 5)).toBe(1)
    expect(at(r.visual, 10, 0)).toBe(T)
  })
})

describe('compose', () => {
  const layer = (draw: (r: Raster) => void, defaultPriority: 'rows' | 'baseline' | 'none' | number, anchorY = 100, controlOn = true) => {
    const r = new Raster()
    draw(r)
    return { raster: r, defaultPriority, anchorY, controlOn, moodExempt: false }
  }
  it('starts white with priority 4', () => {
    const out = compose([], { priorityBase: 48 })
    expect(at(out.visual, 0, 0)).toBe(15)
    expect(at(out.priority, 80, 160)).toBe(4)
  })
  it('resolves rows, baseline and fixed priorities', () => {
    const rows = layer((r) => r.run([{ op: 'visual', color: 2 }, { op: 'line', pts: [[0, 130], [10, 130]] }]), 'rows')
    const base = layer((r) => r.run([{ op: 'visual', color: 6 }, { op: 'line', pts: [[20, 60], [20, 100]] }]), 'baseline', 100)
    const fixed = layer((r) => r.run([{ op: 'visual', color: 1 }, { op: 'line', pts: [[30, 10], [31, 10]] }]), 12)
    const out = compose([rows, base, fixed], { priorityBase: 48 })
    expect(at(out.priority, 5, 130)).toBe(bandForY(130))
    expect(at(out.priority, 20, 60)).toBe(bandForY(100))
    expect(at(out.priority, 30, 10)).toBe(12)
  })
  it('uses explicit tags over the layer default', () => {
    const l = layer((r) => r.run([
      { op: 'visual', color: 2 },
      { op: 'priority', value: 'rows' },
      { op: 'line', pts: [[0, 140], [4, 140]] },
    ]), 'baseline', 60)
    expect(l.raster.priority[140 * PIC_W]).toBe(PRI_ROWS)
    const out = compose([l], { priorityBase: 48 })
    expect(at(out.priority, 0, 140)).toBe(bandForY(140))
    expect(PRI_BASELINE).toBe(17)
  })
  it('stamps control pixels after all layers so later art cannot hide walls', () => {
    const wall = layer((r) => r.run([{ op: 'priority', value: 0 }, { op: 'line', pts: [[0, 120], [40, 120]] }]), 'none')
    const cover = layer((r) => r.run([{ op: 'visual', color: 10 }, { op: 'line', pts: [[0, 120], [40, 120]] }]), 'rows')
    const out = compose([wall, cover], { priorityBase: 48 })
    expect(at(out.priority, 10, 120)).toBe(0)
    expect(at(out.visual, 10, 120)).toBe(10)
    const off = compose([{ ...wall, controlOn: false }, cover], { priorityBase: 48 })
    expect(at(off.priority, 10, 120)).toBe(bandForY(120))
  })
  it('applies the mood remap unless the layer is exempt', () => {
    const night = Array.from({ length: 16 }, (_, i) => (i === 14 ? 0 : i))
    const l = layer((r) => r.run([{ op: 'visual', color: 14 }, { op: 'line', pts: [[0, 0], [1, 0]] }]), 'none')
    expect(at(compose([l], { priorityBase: 48, mood: night }).visual, 0, 0)).toBe(0)
    expect(at(compose([{ ...l, moodExempt: true }], { priorityBase: 48, mood: night }).visual, 0, 0)).toBe(14)
  })
})

describe('control clearing and default depth', () => {
  it('lets a later layer clear control drawn earlier (bridge over a river)', () => {
    const river = new Raster().run([{ op: 'visual', color: 1 }, { op: 'priority', value: 3 }, { op: 'line', pts: [[0, 120], [40, 120]] }])
    const deck = new Raster().run([{ op: 'visual', color: 6 }, { op: 'priority', value: 'clear' }, { op: 'line', pts: [[10, 120], [20, 120]] }])
    const L = (r: Raster) => ({ raster: r, defaultPriority: 'rows' as const, anchorY: 120, controlOn: true, moodExempt: false })
    const out = compose([L(river), L(deck)], { priorityBase: 48 })
    expect(at(out.priority, 5, 120)).toBe(3)
    expect(at(out.priority, 15, 120)).toBe(bandForY(120))
    expect(at(out.visual, 15, 120)).toBe(6)
  })
  it('treats the default tag like untouched depth', () => {
    const r = new Raster().run([{ op: 'visual', color: 2 }, { op: 'priority', value: 'default' }, { op: 'line', pts: [[0, 90], [3, 90]] }])
    const out = compose([{ raster: r, defaultPriority: 'baseline', anchorY: 150, controlOn: true, moodExempt: false }], { priorityBase: 48 })
    expect(at(out.priority, 1, 90)).toBe(bandForY(150))
  })
})

describe('soft default depth', () => {
  it('keeps control lines when later artwork in the same element draws over them', () => {
    const r = new Raster().run([
      { op: 'priority', value: 0 },
      { op: 'line', pts: [[0, 100], [20, 100]] },
      { op: 'visual', color: 2 },
      { op: 'priority', value: 'default' },
      { op: 'line', pts: [[0, 100], [20, 100]] },
    ])
    expect(r.priority[100 * PIC_W + 5]).toBe(0)
    expect(r.visual[100 * PIC_W + 5]).toBe(2)
  })
})

describe('fill tool regions', () => {
  it('covers exactly the connected area of one color', async () => {
    const { floodRuns } = await import('../src/agi/region')
    const plane = new Uint8Array(PIC_W * 168).fill(15)
    // a box outline of color 0 from (10,10) to (20,20)
    for (let i = 10; i <= 20; i++) {
      plane[10 * PIC_W + i] = 0
      plane[20 * PIC_W + i] = 0
      plane[i * PIC_W + 10] = 0
      plane[i * PIC_W + 20] = 0
    }
    const inside = floodRuns(plane, 15, 15)
    expect(inside.length).toBe(9)
    expect(inside.every(([a, b]) => a === 11 && b === 19)).toBe(true)
    const outside = floodRuns(plane, 0, 0)
    const count = outside.reduce((n, [a, b]) => n + b - a + 1, 0)
    expect(count).toBe(PIC_W * 168 - 121)
  })
})

describe('moods', () => {
  it('keep foliage (green) distinct from grass (light green) and sky', async () => {
    const { MOODS } = await import('../src/agi/moods')
    for (const [id, m] of Object.entries(MOODS)) {
      expect(m.map[2], `${id}: leaves vs grass`).not.toBe(m.map[10])
      expect(m.map.length).toBe(16)
    }
  })
})
