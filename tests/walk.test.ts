import { describe, expect, it } from 'vitest'
import { PIC_H, PIC_W } from '../src/agi/constants'
import { bandForY } from '../src/agi/priority'
import { canStand, drawEgo, entryPoint, step, type WalkEnv } from '../src/walk/simulate'

function env(): WalkEnv {
  const priority = new Uint8Array(PIC_W * PIC_H)
  for (let y = 0; y < PIC_H; y++) for (let x = 0; x < PIC_W; x++) priority[y * PIC_W + x] = bandForY(y)
  return { priority, horizon: 36, priorityBase: 48, condBlocks: true }
}
const set = (e: WalkEnv, x0: number, x1: number, y: number, v: number) => {
  for (let x = x0; x <= x1; x++) e.priority[y * PIC_W + x] = v
}

describe('test walk', () => {
  const ego = { x: 50, y: 120, w: 7, h: 30 }

  it('blocks on walls and follows the conditional switch', () => {
    const e = env()
    set(e, 40, 70, 119, 0)
    expect(step(e, ego, 'n').kind).toBe('blocked')
    set(e, 40, 70, 119, 1)
    expect(step(e, ego, 'n').kind).toBe('blocked')
    expect(step({ ...e, condBlocks: false }, ego, 'n').kind).toBe('moved')
  })

  it('reports triggers and water on the baseline', () => {
    const e = env()
    set(e, 52, 52, 121, 2)
    const r = step(e, ego, 's')
    expect(r.kind === 'moved' && r.trigger).toBe(true)
    set(e, 50, 56, 122, 3)
    const w = step(e, { ...ego, y: 121 }, 's')
    expect(w.kind === 'moved' && w.water).toBe(true)
    set(e, 50, 55, 123, 3)
    const partial = step(e, { ...ego, y: 122 }, 's')
    expect(partial.kind === 'moved' && partial.water).toBe(false)
  })

  it('stops at the horizon and reports edges', () => {
    const e = env()
    expect(step(e, { ...ego, y: 37 }, 'n')).toEqual({ kind: 'edge', dir: 'n' })
    expect(step(e, { ...ego, x: 0 }, 'w')).toEqual({ kind: 'edge', dir: 'w' })
    expect(step(e, { ...ego, x: PIC_W - 7 }, 'e')).toEqual({ kind: 'edge', dir: 'e' })
    expect(step(e, { ...ego, y: PIC_H - 1 }, 's')).toEqual({ kind: 'edge', dir: 's' })
    expect(canStand(e, 50, 30, 7)).toBe(false)
    expect(canStand(e, 50, 36, 7)).toBe(false) // AGI keeps objects below the horizon
    expect(canStand(e, 50, 37, 7)).toBe(true)
  })

  it('hides the ego behind things with higher priority', () => {
    const e = env()
    // a "tree" at band 12 covering x 50..52 rows 100..110
    for (let y = 100; y <= 110; y++) set(e, 50, 52, y, 12)
    const visual = new Uint8Array(PIC_W * PIC_H).fill(15)
    const cel = { w: 5, h: 20, px: new Uint8Array(100).fill(4) }
    drawEgo(visual, e.priority, cel, 48, 115, bandForY(115)) // ego band 10 is behind band 12
    expect(visual[105 * PIC_W + 51]).toBe(15)
    expect(visual[105 * PIC_W + 49]).toBe(4)
    const v2 = new Uint8Array(PIC_W * PIC_H).fill(15)
    drawEgo(v2, e.priority, cel, 48, 150, bandForY(150)) // in front
    expect(v2[140 * PIC_W + 51]).toBe(4)
  })

  it('looks below control lines for the depth under them', () => {
    const e = env()
    set(e, 60, 64, 100, 0)
    const visual = new Uint8Array(PIC_W * PIC_H).fill(15)
    const cel = { w: 3, h: 3, px: new Uint8Array(9).fill(1) }
    drawEgo(visual, e.priority, cel, 61, 101, bandForY(101))
    expect(visual[100 * PIC_W + 62]).toBe(1)
  })

  it('draws the character while wading (water is a low priority, not a control line)', () => {
    const e = env()
    for (let y = 90; y < PIC_H; y++) set(e, 0, PIC_W - 1, y, 3)
    const visual = new Uint8Array(PIC_W * PIC_H).fill(15)
    const cel = { w: 4, h: 20, px: new Uint8Array(80).fill(4) }
    drawEgo(visual, e.priority, cel, 40, 120, bandForY(120))
    let drawn = 0
    for (let y = 101; y <= 120; y++) for (let x = 40; x < 44; x++) if (visual[y * PIC_W + x] === 4) drawn++
    expect(drawn).toBe(80)
  })

  it('draws feet standing on a trigger band at the bottom edge', () => {
    const e = env()
    for (let y = 160; y < PIC_H; y++) set(e, 0, PIC_W - 1, y, 2)
    const visual = new Uint8Array(PIC_W * PIC_H).fill(15)
    const cel = { w: 4, h: 20, px: new Uint8Array(80).fill(4) }
    drawEgo(visual, e.priority, cel, 40, 165, bandForY(165))
    let drawn = 0
    for (let y = 146; y <= 165; y++) for (let x = 40; x < 44; x++) if (visual[y * PIC_W + x] === 4) drawn++
    expect(drawn).toBe(80)
  })

  it('enters the next room on the opposite edge', () => {
    const e = env()
    const p = entryPoint(e, 'e', { ...ego, x: PIC_W - 7 })
    expect(p!.x).toBeLessThan(10)
    const q = entryPoint(e, 'n', ego)
    expect(q!.y).toBeGreaterThan(150)
  })
})
