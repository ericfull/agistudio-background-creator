import { IDENTITY_MAP } from '../agi/palette'
import type { Project } from '../state/types'

export const FILE_KIND = 'agistudio-bg-creator'
export const CURRENT_VERSION = 1

export function serializeProject(p: Project): string {
  return JSON.stringify({ kind: FILE_KIND, ...p }, null, 1)
}

/** Parse and upgrade a saved project. Throws with a readable message on bad input. */
export function parseProject(text: string): Project {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Not a valid JSON file')
  }
  if (!raw || typeof raw !== 'object') throw new Error('Not a project file')
  const o = raw as Record<string, unknown>
  if (o.kind !== undefined && o.kind !== FILE_KIND) throw new Error('This JSON is not an AGIStudio Background Creator project')
  if (!Array.isArray(o.rooms) || o.rooms.length === 0) throw new Error('Project has no rooms')
  return migrate(o)
}

function migrate(o: Record<string, unknown>): Project {
  const version = typeof o.version === 'number' ? o.version : 1
  if (version > CURRENT_VERSION) throw new Error(`Project was saved by a newer version (v${version})`)
  const p = { version: 1, name: String(o.name ?? 'Untitled project'), rooms: o.rooms, views: o.views ?? [] } as Project
  for (const r of p.rooms) {
    r.colorSwap ??= [...IDENTITY_MAP]
    r.links ??= {}
    r.layers ??= []
    r.perspective ??= { far: 0.55, near: 1 }
    r.mood ??= 'day'
  }
  return p
}
