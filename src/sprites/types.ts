import type { Theme } from '../state/types'

/**
 * Cel pixels: 0–15 are literal EGA colors, 16–31 are color-role slots
 * (index into View.roles), 255 is transparent.
 */
export interface Cel {
  w: number
  h: number
  pixels: number[]
}

export interface Loop {
  name: string
  /** When set, this loop is drawn as a horizontal mirror of another loop. */
  mirrorOf?: number
  cels: Cel[]
}

export interface ViewRole {
  key: string
  label: string
  color: number
}

export interface View {
  id: string
  name: string
  theme: Theme
  kind: 'character' | 'prop'
  roles: ViewRole[]
  colorMap: Record<string, number>
  loops: Loop[]
  fps: number
  builtinId?: string
}

export const ROLE_SLOT_BASE = 16
export const SPRITE_T = 255
