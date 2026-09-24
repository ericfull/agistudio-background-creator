import { describe, expect, it } from 'vitest'
import { PIC_H, PIC_W, T } from '../src/agi/constants'
import { Raster } from '../src/agi/raster'
import { ELEMENTS } from '../src/library'
import { roleResolver, runElement } from '../src/library/run'
import type { ElementDef } from '../src/library/types'
import { elementLayer, newRoom } from '../src/state/factory'
import type { ParamValue } from '../src/state/types'

function variants(def: ElementDef): Record<string, ParamValue>[] {
  const out: Record<string, ParamValue>[] = [{}]
  for (const s of def.params) {
    if (s.type === 'int') out.push({ [s.key]: s.min }, { [s.key]: s.max })
    else if (s.type === 'select') for (const o of s.options) out.push({ [s.key]: o.value })
    else out.push({ [s.key]: !s.default })
  }
  // everything at minimum and at maximum together
  out.push(Object.fromEntries(def.params.filter((s) => s.type === 'int').map((s) => [s.key, (s as { min: number }).min])))
  out.push(Object.fromEntries(def.params.filter((s) => s.type === 'int').map((s) => [s.key, (s as { max: number }).max])))
  return out
}

function render(def: ElementDef, seed: number, params: Record<string, ParamValue>, flipX = false, scale = 1) {
  const room = newRoom()
  const layer = elementLayer(def.id, { seed, params, flipX, scale })
  const cmds = runElement(def, layer, room)
  const r = new Raster(roleResolver(def, {})).run(cmds)
  return { cmds, r }
}

describe('element library', () => {
  it('has unique ids and valid metadata', () => {
    const ids = new Set<string>()
    for (const def of ELEMENTS) {
      expect(ids.has(def.id), `duplicate id ${def.id}`).toBe(false)
      ids.add(def.id)
      expect(def.themes.length).toBeGreaterThan(0)
      for (const [role, spec] of Object.entries(def.roles)) {
        expect(spec.color, `${def.id}.${role}`).toBeGreaterThanOrEqual(0)
        expect(spec.color, `${def.id}.${role}`).toBeLessThanOrEqual(15)
      }
      for (const s of def.params) {
        if (s.type === 'int') {
          expect(s.default).toBeGreaterThanOrEqual(s.min)
          expect(s.default).toBeLessThanOrEqual(s.max)
        }
        if (s.type === 'select') expect(s.options.map((o) => o.value)).toContain(s.default)
      }
    }
  })

  for (const def of ELEMENTS) {
    describe(def.id, () => {
      it('renders across seeds and parameter extremes without errors', () => {
        for (const params of variants(def)) {
          for (const seed of [1, 2, 99]) {
            const { r } = render(def, seed, params)
            expect(r.empty, `${def.id} empty with ${JSON.stringify(params)}`).toBe(false)
          }
        }
      })

      it('is deterministic for a seed', () => {
        const a = render(def, 42, {})
        const b = render(def, 42, {})
        expect(Buffer.from(a.r.visual).equals(Buffer.from(b.r.visual))).toBe(true)
        expect(JSON.stringify(a.cmds)).toBe(JSON.stringify(b.cmds))
      })

      it('only references declared roles and EGA colors', () => {
        for (const params of variants(def)) {
          const { cmds } = render(def, 3, params, true, 1.4)
          for (const c of cmds) {
            if (c.op === 'visual' && c.color !== null) {
              if (typeof c.color === 'number') expect(c.color).toBeGreaterThanOrEqual(0)
              else expect(Object.keys(def.roles), `${def.id} uses undeclared role ${c.color.role}`).toContain(c.color.role)
            }
            if (c.op === 'priority' && typeof c.value === 'number') {
              expect(c.value).toBeGreaterThanOrEqual(0)
              expect(c.value).toBeLessThanOrEqual(15)
            }
          }
        }
      })

      it('does not leak fills across the picture', () => {
        if (def.span === 'full') return
        for (const params of variants(def)) {
          const { r } = render(def, 5, params)
          let n = 0
          for (let i = 0; i < PIC_W * PIC_H; i++) if (r.visual[i] !== T) n++
          const cover = n / (PIC_W * PIC_H)
          expect(cover, `${def.id} covers ${(cover * 100).toFixed(0)}% with ${JSON.stringify(params)}`).toBeLessThan(0.85)
        }
      })
    })
  }
})
