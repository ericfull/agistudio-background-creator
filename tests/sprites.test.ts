import { describe, expect, it } from 'vitest'
import { BUILTIN_VIEWS } from '../src/sprites/library'
import { CharCanvas, gridSize, resolveLoops } from '../src/sprites/library/ascii'
import { BODIES } from '../src/sprites/library/bodies'
import { composeCharacter, FACINGS, roleTableFor, type PartDef } from '../src/sprites/library/compose'
import { resolveCel } from '../src/sprites/render'
import { ROLE_SLOT_BASE, SPRITE_T } from '../src/sprites/types'

const THEMES = ['fantasy', 'scifi', 'modern', 'spooky', 'nature']

describe('built-in sprite library', () => {
  it('has characters and props', () => {
    const chars = BUILTIN_VIEWS.filter((v) => v.kind === 'character')
    const props = BUILTIN_VIEWS.filter((v) => v.kind === 'prop')
    expect(chars.length).toBeGreaterThanOrEqual(12)
    expect(props.length).toBeGreaterThanOrEqual(20)
    for (const t of ['fantasy', 'scifi', 'modern', 'spooky']) {
      expect(chars.filter((v) => v.theme === t).length, t).toBeGreaterThanOrEqual(3)
    }
  })

  it('has unique, well-formed ids', () => {
    const ids = new Set<string>()
    for (const v of BUILTIN_VIEWS) {
      expect(ids.has(v.id), `duplicate id ${v.id}`).toBe(false)
      ids.add(v.id)
      expect(v.id.startsWith(`builtin-${v.theme}-`), v.id).toBe(true)
      expect(v.builtinId).toBe(v.id)
      expect(THEMES).toContain(v.theme)
      expect(v.colorMap).toEqual({})
      expect(v.fps).toBeGreaterThan(0)
      expect(v.name.length).toBeGreaterThan(0)
    }
  })

  it('gives characters four loops in AGI order, loop 1 mirroring loop 0', () => {
    for (const v of BUILTIN_VIEWS.filter((x) => x.kind === 'character')) {
      expect(v.loops.map((l) => l.name), v.id).toEqual(['right', 'left', 'down', 'up'])
      expect(v.loops[1].mirrorOf, v.id).toBe(0)
      expect(v.loops[0].mirrorOf, v.id).toBeUndefined()
      expect(v.loops[0].cels.length, v.id).toBeGreaterThanOrEqual(4)
      expect(v.loops[2].cels.length, v.id).toBeGreaterThanOrEqual(4)
      expect(v.loops[3].cels.length, v.id).toBeGreaterThanOrEqual(4)
    }
  })

  it('has valid cels: sized, non-empty, same size within a loop', () => {
    for (const v of BUILTIN_VIEWS) {
      expect(v.loops.length, v.id).toBeGreaterThan(0)
      v.loops.forEach((loop, li) => {
        if (loop.mirrorOf !== undefined) {
          expect(v.loops[loop.mirrorOf], `${v.id} loop ${li}`).toBeDefined()
          expect(v.loops[loop.mirrorOf].mirrorOf, `${v.id} loop ${li}`).toBeUndefined()
          return
        }
        expect(loop.cels.length, `${v.id} loop ${li}`).toBeGreaterThan(0)
        const { w, h } = loop.cels[0]
        for (const [ci, cel] of loop.cels.entries()) {
          const where = `${v.id} loop ${li} cel ${ci}`
          expect(cel.w, where).toBe(w)
          expect(cel.h, where).toBe(h)
          expect(cel.w, where).toBeGreaterThan(0)
          expect(cel.h, where).toBeGreaterThan(0)
          expect(cel.pixels.length, where).toBe(cel.w * cel.h)
          expect(cel.pixels.some((p) => p !== SPRITE_T), `${where} is empty`).toBe(true)
        }
      })
    }
  })

  it('only uses EGA colors, transparency and existing role slots', () => {
    for (const v of BUILTIN_VIEWS) {
      for (const r of v.roles) {
        expect(r.color, `${v.id}.${r.key}`).toBeGreaterThanOrEqual(0)
        expect(r.color, `${v.id}.${r.key}`).toBeLessThanOrEqual(15)
        expect(Number.isInteger(r.color)).toBe(true)
      }
      expect(new Set(v.roles.map((r) => r.key)).size, `${v.id} duplicate role keys`).toBe(v.roles.length)
      const used = new Set<number>()
      for (const loop of v.loops) {
        for (const cel of loop.cels) {
          for (const p of cel.pixels) {
            const ok = (p >= 0 && p <= 15) || p === SPRITE_T || (p >= ROLE_SLOT_BASE && p < ROLE_SLOT_BASE + v.roles.length)
            expect(ok, `${v.id} bad pixel ${p}`).toBe(true)
            if (p >= ROLE_SLOT_BASE && p !== SPRITE_T) used.add(p - ROLE_SLOT_BASE)
          }
        }
      }
      // every listed role is actually used, so the recolor panel has no dead entries
      expect(used.size, `${v.id} unused roles`).toBe(v.roles.length)
    }
  })

  it('resolves every cel (including mirrored loops) to EGA colors', () => {
    for (const v of BUILTIN_VIEWS) {
      v.loops.forEach((loop, li) => {
        const n = loop.mirrorOf !== undefined ? v.loops[loop.mirrorOf].cels.length : loop.cels.length
        for (let c = 0; c < n; c++) {
          const cel = resolveCel(v, li, c)!
          expect(cel, `${v.id} ${li}/${c}`).not.toBeNull()
          for (const p of cel.px) expect(p <= 15 || p === SPRITE_T).toBe(true)
        }
      })
    }
  })

  it('gives every loop of a character the same width, so turning never shifts it', () => {
    for (const v of BUILTIN_VIEWS.filter((x) => x.kind === 'character')) {
      const widths = new Set([0, 2, 3].flatMap((li) => v.loops[li].cels.map((c) => c.w)))
      expect([...widths], v.id).toHaveLength(1)
      if (v.id !== 'builtin-spooky-ghost') expect([...widths][0], v.id).toBe(7)
    }
  })

  it('alternates the feet in the down and up walks', () => {
    const feet = (cel: { w: number; h: number; pixels: number[] }) => {
      const cols: number[] = []
      for (let y = cel.h - 3; y < cel.h; y++) {
        for (let x = 0; x < cel.w; x++) if (cel.pixels[y * cel.w + x] !== SPRITE_T) cols.push(y * 100 + x)
      }
      return cols.join(',')
    }
    for (const v of BUILTIN_VIEWS.filter((x) => x.kind === 'character' && x.id !== 'builtin-spooky-ghost')) {
      for (const li of [2, 3]) {
        const cels = v.loops[li].cels
        expect(feet(cels[0]), `${v.id} loop ${li}`).not.toBe(feet(cels[2]))
      }
    }
  })

  it('makes doorways as tall as a walker', () => {
    for (const id of ['builtin-fantasy-door', 'builtin-scifi-hatch']) {
      const v = BUILTIN_VIEWS.find((x) => x.id === id)!
      expect(v.loops[0].cels[0].h, id).toBeGreaterThanOrEqual(36)
    }
  })

  it('keeps walkers standing on their bottom row', () => {
    for (const v of BUILTIN_VIEWS.filter((x) => x.kind === 'character' && x.id !== 'builtin-spooky-ghost')) {
      for (const li of [0, 2, 3]) {
        for (const cel of v.loops[li].cels) {
          const bottom = cel.pixels.slice((cel.h - 1) * cel.w)
          expect(bottom.some((p) => p !== SPRITE_T), `${v.id} loop ${li} floats`).toBe(true)
        }
      }
    }
  })
})

describe('ascii sprite format', () => {
  it('rejects ragged grids and unknown characters', () => {
    expect(() => gridSize(['..', '...'])).toThrow(/ragged/)
    expect(() => gridSize(['.#'])).toThrow(/bad character/)
  })

  it('maps hex digits to colors and letters to role slots in table order', () => {
    const { roles, loops } = resolveLoops(
      [[['a0.', 'Fbb']]],
      {
        b: { key: 'second', label: 'B', color: 2 },
        a: { key: 'first', label: 'A', color: 1 },
      },
      'test',
    )
    expect(roles.map((r) => r.key)).toEqual(['second', 'first'])
    expect(loops[0][0].pixels).toEqual([ROLE_SLOT_BASE + 1, 0, SPRITE_T, 15, ROLE_SLOT_BASE, ROLE_SLOT_BASE])
  })

  it('merges letters that share a role key into one slot', () => {
    const { roles, loops } = resolveLoops(
      [[['ab']]],
      { a: { key: 'suit', label: 'Suit', color: 7 }, b: { key: 'suit', label: 'Suit', color: 7 } },
      'test',
    )
    expect(roles).toHaveLength(1)
    expect(loops[0][0].pixels).toEqual([ROLE_SLOT_BASE, ROLE_SLOT_BASE])
  })

  it('throws on a letter with no role', () => {
    expect(() => resolveLoops([[['z']]], {}, 'test')).toThrow(/no role/)
  })

  it('stamps with erase, under and onlyOver', () => {
    const cv = new CharCanvas()
    cv.stamp(['abc'], 0, 0)
    cv.stamp(['_'], 1, 0)
    expect(cv.crop(0, 0, 3, 1)).toEqual(['a.c'])
    cv.stamp(['xxx'], 0, 0, true)
    expect(cv.crop(0, 0, 3, 1)).toEqual(['axc'])
    cv.stamp(['yyy'], 0, 0, false, 'c')
    expect(cv.crop(0, 0, 3, 1)).toEqual(['axy'])
  })
})

describe('character composition', () => {
  it('builds both base bodies with the full walk cycle', () => {
    for (const body of Object.values(BODIES)) {
      expect(body.facings.right.cels).toHaveLength(6)
      expect(body.facings.down.cels).toHaveLength(4)
      expect(body.facings.up.cels).toHaveLength(4)
      for (const f of FACINGS) {
        const sizes = body.facings[f].cels.map((g) => gridSize(g))
        expect(new Set(sizes.map((s) => `${s.w}x${s.h}`)).size).toBe(1)
      }
    }
  })

  it('draws a head-anchored part on every body and crops loops to shared bounds', () => {
    const hat: PartDef = {
      id: 'test-hat',
      label: 'Test hat',
      slot: 'hat',
      layers: { right: [{ anchor: 'head', at: [0, -2], cels: [['..kkk..', '.kkkkk.']] }] },
    }
    for (const body of Object.values(BODIES)) {
      const plain = composeCharacter(body, []).right
      const hatted = composeCharacter(body, [hat]).right
      expect(hatted[0].length).toBe(plain[0].length + 2)
      expect(hatted[0][0]).toContain('k')
      expect(new Set(hatted.map((g) => g.length)).size).toBe(1)
    }
  })

  it('lets sleeves follow the shirt role unless overridden', () => {
    expect(roleTableFor([], { c: { key: 'robe', color: 5 } }).r.key).toBe('robe')
    expect(roleTableFor([], { c: { key: 'robe' }, r: { key: 'arms', label: 'Arms', color: 8 } }).r.key).toBe('arms')
  })
})
