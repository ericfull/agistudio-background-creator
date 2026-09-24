import { describe, expect, it } from 'vitest'
import { generateRoom, RECIPES } from '../src/generator/recipes'
import { OPPOSITE } from '../src/generator'
import { renderRoom } from '../src/render/room'
import { THEMES, type Dir } from '../src/state/types'
import { PIC_H, PIC_W } from '../src/agi/constants'

describe('room generator', () => {
  for (const { id: theme } of THEMES) {
    for (const recipe of new Set(RECIPES[theme])) {
      it(`${theme} / ${recipe} builds renderable rooms`, () => {
        for (const seed of [1, 2, 3, 4, 5]) {
          const room = generateRoom({ theme, seed, recipe })
          expect(room.layers.length, `${theme}/${recipe}#${seed}`).toBeGreaterThan(1)
          expect(room.edgeProfile).toBeDefined()
          const { visual } = renderRoom(room, [])
          // not left as a blank white picture
          let white = 0
          for (const v of visual) if (v === 15) white++
          expect(white / visual.length, `${theme}/${recipe}#${seed} mostly blank`).toBeLessThan(0.6)
        }
      })
    }
  }

  it('is deterministic for a seed', () => {
    const a = generateRoom({ theme: 'fantasy', seed: 77 })
    const b = generateRoom({ theme: 'fantasy', seed: 77 })
    const strip = (r: typeof a) => r.layers.map((l) => (l.kind === 'element' ? [l.elementId, l.x, l.y, l.seed, l.params] : l.kind))
    expect(strip(a)).toEqual(strip(b))
  })

  it('makes neighbors whose paths and horizon line up', () => {
    for (const seed of [3, 8, 13, 21]) {
      const a = generateRoom({ theme: 'nature', seed, recipe: 'path', exits: { n: true, s: true, e: true, w: true } })
      for (const dir of ['e', 'w', 'n', 's'] as Dir[]) {
        const edge = a.edgeProfile!.edges[dir]!
        const b = generateRoom({ theme: 'nature', seed: seed + 100, match: { dir: OPPOSITE[dir], edge, profile: a.edgeProfile! }, exits: { [OPPOSITE[dir]]: true } })
        const back = b.edgeProfile!.edges[OPPOSITE[dir]]!
        expect(b.edgeProfile!.horizon).toBe(a.edgeProfile!.horizon)
        expect(back.path, `seed ${seed} dir ${dir}`).toBe(edge.path)
        // the walkable path is really open at the shared edge
        const { priority } = renderRoom(b, [])
        if (dir === 'e') expect(priority[back.path! * PIC_W + 1]).toBeGreaterThanOrEqual(4)
        if (dir === 'n') expect(priority[(PIC_H - 1) * PIC_W + back.path!]).toBeGreaterThanOrEqual(4)
      }
    }
  })
})
