import type { ColorRef, PicCommand } from '../agi/commands'
import { mulberry32 } from '../agi/rng'
import { Kit, type KitCtx } from '../kit/kit'
import type { ElementLayer, Room } from '../state/types'
import { makeP, type ElementDef } from './types'

/** Size multiplier at a row when the room's perspective is on. */
export function perspectiveScale(room: Pick<Room, 'horizon' | 'perspective'>, y: number): number {
  const { far, near } = room.perspective
  const t = Math.max(0, Math.min(1, (y - room.horizon) / (167 - room.horizon)))
  return far + (near - far) * t
}

export function elementCtx(def: ElementDef, layer: ElementLayer, room: Room): KitCtx {
  const persp = (layer.perspective ?? def.perspective) ? perspectiveScale(room, layer.y) : 1
  return {
    x: layer.x,
    y: layer.y,
    scale: def.span === 'full' ? 1 : layer.scale * persp,
    flip: layer.flipX,
    full: def.span === 'full',
    horizon: room.horizon,
    priorityBase: room.priorityBase,
  }
}

export function runElement(def: ElementDef, layer: ElementLayer, room: Room): PicCommand[] {
  const kit = new Kit(elementCtx(def, layer, room))
  def.generate(kit, makeP(def.params, layer.params), mulberry32(layer.seed))
  return kit.cmds
}

export function roleResolver(def: ElementDef, colorMap: Record<string, number>): (c: ColorRef) => number {
  return (c) => {
    if (typeof c === 'number') return c
    return colorMap[c.role] ?? def.roles[c.role]?.color ?? 0
  }
}

/** Replace role references with literal colors (used by Explode). */
export function resolveRoles(cmds: readonly PicCommand[], resolve: (c: ColorRef) => number): PicCommand[] {
  return cmds.map((c) => (c.op === 'visual' && c.color !== null && typeof c.color !== 'number' ? { ...c, color: resolve(c.color) } : c))
}
