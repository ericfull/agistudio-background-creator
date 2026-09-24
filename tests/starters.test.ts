import { describe, expect, it } from 'vitest'
import { PIC_H, PIC_W } from '../src/agi/constants'
import { getElement } from '../src/library'
import { STARTERS } from '../src/library/starters'
import { renderRoom } from '../src/render/room'
import { newRoom } from '../src/state/factory'
import { THEMES } from '../src/state/types'

describe('room starters', () => {
  it('have unique, well-formed ids and metadata', () => {
    const ids = new Set<string>()
    for (const s of STARTERS) {
      expect(ids.has(s.id), `duplicate ${s.id}`).toBe(false)
      ids.add(s.id)
      expect(s.id.startsWith(`starter-${s.theme}-`), s.id).toBe(true)
      expect(s.name.length).toBeGreaterThan(0)
      expect(s.description.length, s.id).toBeGreaterThan(0)
      expect(s.description.length, `${s.id} description should be one short sentence`).toBeLessThan(120)
    }
  })

  it('cover every theme', () => {
    for (const { id } of THEMES) {
      expect(STARTERS.filter((s) => s.theme === id).length, id).toBeGreaterThanOrEqual(4)
    }
  })

  for (const starter of STARTERS) {
    it(`${starter.id} builds and renders for several seeds`, () => {
      for (const seed of [1, 2, 3, 4, 5]) {
        const built = starter.build(seed)
        const tag = `${starter.id}#${seed}`
        expect(built.layers.length, tag).toBeGreaterThanOrEqual(3)
        for (const l of built.layers) {
          if (l.kind === 'element') expect(getElement(l.elementId), `${tag} ${l.elementId}`).toBeDefined()
        }
        const room = newRoom({ ...built })
        expect(room.horizon, tag).toBeGreaterThanOrEqual(0)
        expect(room.horizon, tag).toBeLessThanOrEqual(PIC_H - 1)
        if (built.theme) expect(built.theme, tag).toBe(starter.theme)

        const { visual, priority } = renderRoom(room, [])
        let white = 0
        for (const v of visual) if (v === 15) white++
        expect(white / (PIC_W * PIC_H), `${tag} mostly blank`).toBeLessThan(0.4)
        // something below the horizon must be walkable (not all wall)
        let walls = 0
        let below = 0
        for (let y = room.horizon + 1; y < PIC_H; y++) {
          for (let x = 0; x < PIC_W; x++) {
            below++
            if (priority[y * PIC_W + x] === 0) walls++
          }
        }
        expect(walls / below, `${tag} walled in`).toBeLessThan(0.2)
      }
    })
  }

  it('keep the same structure across seeds and are deterministic', () => {
    for (const s of STARTERS) {
      const strip = (seed: number) =>
        s.build(seed).layers.map((l) => (l.kind === 'element' ? [l.elementId, l.seed, l.x, l.y, l.params] : [l.kind, l.name]))
      expect(strip(7), s.id).toEqual(strip(7))
      const a = s.build(1).layers.map((l) => (l.kind === 'element' ? l.elementId : l.kind))
      const b = s.build(2).layers.map((l) => (l.kind === 'element' ? l.elementId : l.kind))
      expect(a, s.id).toEqual(b)
    }
  })
})
