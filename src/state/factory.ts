import { DEFAULT_HORIZON, DEFAULT_PRIORITY_BASE } from '../agi/constants'
import { IDENTITY_MAP } from '../agi/palette'
import { randomSeed } from '../agi/rng'
import { getElement } from '../library'
import { defaultParams } from '../library/types'
import type { ElementLayer, PaintLayer, ParamValue, PriorityMode, Room, Theme, ViewLayer } from './types'

let counter = 0
export function uid(prefix = 'id'): string {
  counter = (counter + 1) % 1e6
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function newRoom(partial: Partial<Room> = {}): Room {
  return {
    id: uid('room'),
    name: 'New room',
    theme: 'nature' as Theme,
    priorityBase: DEFAULT_PRIORITY_BASE,
    horizon: DEFAULT_HORIZON,
    perspective: { far: 0.55, near: 1 },
    mood: 'day',
    colorSwap: [...IDENTITY_MAP],
    layers: [],
    links: {},
    ...partial,
  }
}

export interface ElementLayerOpts {
  x?: number
  y?: number
  params?: Record<string, ParamValue>
  seed?: number
  scale?: number
  flipX?: boolean
  colorMap?: Record<string, number>
  name?: string
  priority?: PriorityMode | 'auto'
  controlOn?: boolean
  moodExempt?: boolean
}

export function elementLayer(elementId: string, opts: ElementLayerOpts = {}): ElementLayer {
  const def = getElement(elementId)
  if (!def) throw new Error(`Unknown element ${elementId}`)
  return {
    id: uid('layer'),
    kind: 'element',
    name: opts.name ?? def.name,
    visible: true,
    locked: false,
    moodExempt: opts.moodExempt,
    elementId,
    params: { ...defaultParams(def), ...(opts.params ?? {}) },
    seed: opts.seed ?? randomSeed(),
    x: opts.x ?? def.place.x,
    y: opts.y ?? def.place.y,
    scale: opts.scale ?? 1,
    flipX: opts.flipX ?? false,
    colorMap: opts.colorMap ?? {},
    priority: opts.priority ?? 'auto',
    controlOn: opts.controlOn ?? true,
  }
}

export function paintLayer(name = 'Paint'): PaintLayer {
  return { id: uid('layer'), kind: 'paint', name, visible: true, locked: false, commands: [], priority: 'none', baseY: 120 }
}

export function viewLayer(viewId: string, x: number, y: number, name = 'Sprite'): ViewLayer {
  return {
    id: uid('layer'), kind: 'view', name, visible: true, locked: false,
    viewId, loop: 0, cel: 0, x, y, priority: 'baseline', margin: null, animate: false,
  }
}
