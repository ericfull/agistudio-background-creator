import type { PicCommand } from '../agi/commands'
import type { View } from '../sprites/types'

export type Theme = 'nature' | 'fantasy' | 'scifi' | 'modern' | 'spooky'
export const THEMES: { id: Theme; label: string }[] = [
  { id: 'nature', label: 'Nature' },
  { id: 'fantasy', label: 'Fantasy' },
  { id: 'scifi', label: 'Sci-fi' },
  { id: 'modern', label: 'Modern' },
  { id: 'spooky', label: 'Spooky' },
]

/** How a layer's drawn pixels get their depth. */
export type PriorityMode = 'rows' | 'baseline' | 'none' | number
export type ParamValue = number | string | boolean
export type Dir = 'n' | 's' | 'e' | 'w'

interface LayerBase {
  id: string
  name: string
  visible: boolean
  locked: boolean
  /** Skip the room's mood remap (e.g. lit windows at night). */
  moodExempt?: boolean
}

export interface ElementLayer extends LayerBase {
  kind: 'element'
  elementId: string
  params: Record<string, ParamValue>
  seed: number
  x: number
  y: number
  scale: number
  flipX: boolean
  colorMap: Record<string, number>
  priority: PriorityMode | 'auto'
  controlOn: boolean
  /** Override the element's own perspective setting. */
  perspective?: boolean
}

export interface PaintLayer extends LayerBase {
  kind: 'paint'
  commands: PicCommand[]
  /** Depth for visual pixels drawn without an explicit priority. */
  priority: PriorityMode
  /** Baseline row used when priority is 'baseline'. */
  baseY: number
}

export interface ViewLayer extends LayerBase {
  kind: 'view'
  viewId: string
  loop: number
  cel: number
  x: number
  y: number
  priority: 'baseline' | number
  /** Control line drawn along the base of the sprite, like AGI add.to.pic margins. */
  margin: null | 0 | 1 | 2 | 3
  animate: boolean
  /** Optional 16-entry recolor applied to this stamp (set by baking a color swap). */
  recolor?: number[]
}

export type Layer = ElementLayer | PaintLayer | ViewLayer

export interface EdgeInfo {
  /** Center of a path crossing this edge (x for n/s, y for e/w). */
  path?: number
  pathWidth?: number
  river?: number
  riverWidth?: number
  /** Edge is blocked (wall, cliff, water) */
  blocked?: boolean
}

export interface LookSpec {
  id: string
  params: Record<string, ParamValue>
  colorMap: Record<string, number>
}

export interface EdgeProfile {
  horizon: number
  ground: string
  recipe: string
  edges: Partial<Record<Dir, EdgeInfo>>
  /** Sky, backdrop and ground reused by neighbors so rooms continue seamlessly. */
  look?: { sky?: LookSpec; backdrop?: LookSpec; ground?: LookSpec }
}

export type MoodId = 'day' | 'dusk' | 'night' | 'storm' | 'autumn' | 'winter' | 'haunted'

export interface Room {
  id: string
  name: string
  theme: Theme
  priorityBase: number
  horizon: number
  perspective: { far: number; near: number }
  mood: MoodId
  colorSwap: number[]
  /** Color of pixels nothing was drawn on (AGI pictures start white). */
  background?: number
  layers: Layer[]
  links: Partial<Record<Dir, string>>
  edgeProfile?: EdgeProfile
  mapPos?: { x: number; y: number }
}

export interface Project {
  version: 1
  name: string
  rooms: Room[]
  views: View[]
}
