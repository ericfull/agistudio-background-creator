import { randomSeed } from '../agi/rng'
import type { Dir, Room, Theme } from '../state/types'
import { THEMES } from '../state/types'
import { generateRoom } from './recipes'

export const OPPOSITE: Record<Dir, Dir> = { n: 's', s: 'n', e: 'w', w: 'e' }
export const DIR_DELTA: Record<Dir, [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] }
const DIRS: Dir[] = ['n', 's', 'e', 'w']

/** Roll a random room for a theme (random theme when omitted). */
export function rollRoom(theme?: Theme, seed = randomSeed()): Room {
  const t = theme ?? THEMES[seed % THEMES.length].id
  return generateRoom({ theme: t, seed })
}

/** Rooms reachable from `start` through links. */
export function connectedRooms(start: Room, rooms: readonly Room[]): Room[] {
  const byId = new Map(rooms.map((r) => [r.id, r]))
  const seen = new Set([start.id])
  const queue = [start]
  while (queue.length) {
    const r = queue.pop()!
    for (const d of DIRS) {
      const id = r.links[d]
      if (id && !seen.has(id) && byId.has(id)) {
        seen.add(id)
        queue.push(byId.get(id)!)
      }
    }
  }
  return rooms.filter((r) => seen.has(r.id))
}

function posOf(r: Room): { x: number; y: number } {
  return r.mapPos ?? { x: 0, y: 0 }
}

/** A connected room already sitting on the map spot next to `room`. */
export function roomAt(room: Room, dir: Dir, rooms: readonly Room[]): Room | undefined {
  const [dx, dy] = DIR_DELTA[dir]
  const p = posOf(room)
  return connectedRooms(room, rooms).find((r) => r.id !== room.id && r.mapPos && r.mapPos.x === p.x + dx && r.mapPos.y === p.y + dy)
}

export interface Link {
  from: string
  dir: Dir
  to: string
}

export type NeighborPlan = { kind: 'link'; links: Link[] } | { kind: 'new'; room: Room; links: Link[] }

const both = (a: string, dir: Dir, b: string): Link[] => [
  { from: a, dir, to: b },
  { from: b, dir: OPPOSITE[dir], to: a },
]

/**
 * Plan the room next to `room` in direction `dir`: link to a connected room
 * already on that map spot, or generate one whose touching edge matches
 * (horizon, paths, sky and ground). Pure: apply with actions.applyNeighbor.
 */
export function planNeighbor(room: Room, dir: Dir, rooms: readonly Room[], seed = randomSeed()): NeighborPlan {
  const existing = roomAt(room, dir, rooms)
  if (existing) return { kind: 'link', links: both(room.id, dir, existing.id) }
  const edge = room.edgeProfile?.edges[dir]
  const next = generateRoom({
    theme: room.theme,
    seed,
    match: room.edgeProfile && edge ? { dir: OPPOSITE[dir], edge, profile: room.edgeProfile } : undefined,
    exits: { [OPPOSITE[dir]]: true },
  })
  const [dx, dy] = DIR_DELTA[dir]
  const p = posOf(room)
  next.mapPos = { x: p.x + dx, y: p.y + dy }
  const links = both(room.id, dir, next.id)
  // join other connected rooms that end up adjacent to the new spot
  for (const other of connectedRooms(room, rooms)) {
    if (other.id === room.id || !other.mapPos) continue
    for (const d of DIRS) {
      const [ox, oy] = DIR_DELTA[d]
      if (other.mapPos.x === next.mapPos.x + ox && other.mapPos.y === next.mapPos.y + oy && !other.links[OPPOSITE[d]] && d !== OPPOSITE[dir]) {
        links.push(...both(next.id, d, other.id))
      }
    }
  }
  return { kind: 'new', room: next, links }
}
