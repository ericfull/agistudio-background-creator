import type { Rng } from '../agi/rng'
import type { Kit } from '../kit/kit'
import type { ParamValue, PriorityMode, Theme } from '../state/types'

export type Category =
  | 'sky'
  | 'backdrop'
  | 'ground'
  | 'water'
  | 'flora'
  | 'rock'
  | 'structure'
  | 'interior'
  | 'furniture'
  | 'prop'

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'sky', label: 'Skies' },
  { id: 'backdrop', label: 'Backdrops' },
  { id: 'ground', label: 'Ground' },
  { id: 'water', label: 'Water' },
  { id: 'flora', label: 'Plants' },
  { id: 'rock', label: 'Rocks' },
  { id: 'structure', label: 'Structures' },
  { id: 'interior', label: 'Room shells' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'prop', label: 'Props' },
]

export type ParamSpec =
  | { key: string; label: string; type: 'int'; min: number; max: number; step?: number; default: number }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[]; default: string }
  | { key: string; label: string; type: 'bool'; default: boolean }

export interface RoleSpec {
  label: string
  color: number
}

/** Typed access to an element's parameter values inside generate(). */
export interface P {
  n(key: string): number
  s(key: string): string
  b(key: string): boolean
}

export interface ElementDef {
  id: string
  name: string
  themes: Theme[]
  category: Category
  tags?: string[]
  roles: Record<string, RoleSpec>
  params: ParamSpec[]
  defaultPriority: PriorityMode
  /** Scales with depth when the room's perspective is on. */
  perspective: boolean
  /**
   * 'full' elements span the picture width: local x runs 0–159 from the left
   * edge and only the anchor row can move.
   */
  span?: 'full'
  /** Default anchor: the bottom-center point the element stands on. */
  place: { x: number; y: number }
  hasControl?: boolean
  generate(k: Kit, p: P, rng: Rng): void
}

export function makeP(defs: readonly ParamSpec[], values: Record<string, ParamValue>): P {
  const get = (key: string): ParamValue => {
    if (key in values) return values[key]
    const d = defs.find((s) => s.key === key)
    if (!d) throw new Error(`Unknown param ${key}`)
    return d.default
  }
  return {
    n: (key) => Number(get(key)),
    s: (key) => String(get(key)),
    b: (key) => Boolean(get(key)),
  }
}

export function defaultParams(def: ElementDef): Record<string, ParamValue> {
  return Object.fromEntries(def.params.map((s) => [s.key, s.default]))
}
