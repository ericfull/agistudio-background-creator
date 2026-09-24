/**
 * Built-in sprite library: walking characters (base body + part overlays)
 * and props. See ascii.ts for the pixel-art format and compose.ts for how
 * characters are assembled.
 */
import type { View } from '../types'
import { CHARACTER_VIEWS } from './characters'
import { PROP_VIEWS } from './props'

export const BUILTIN_VIEWS: View[] = [...CHARACTER_VIEWS, ...PROP_VIEWS]

export function getBuiltinView(id: string): View | undefined {
  return BUILTIN_VIEWS.find((v) => v.id === id)
}

// Building blocks for a character creator.
export { BODIES } from './bodies'
export { CHARACTER_DEFS } from './characters'
export { characterView, STANDARD_ROLES } from './compose'
export type { BodyDef, BodyId, CharacterDef, Facing, PartDef, PartLayer, PartSlot } from './compose'
export { PARTS } from './parts'
