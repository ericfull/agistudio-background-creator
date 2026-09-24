import { CTRL_COND, CTRL_TRIGGER, CTRL_WALL, CTRL_WATER, PIC_H, PIC_W } from '../agi/constants'
import { bandForY, effectivePriority } from '../agi/priority'
import type { ResolvedCel } from '../sprites/render'
import type { Dir } from '../state/types'

export interface WalkEnv {
  priority: Uint8Array
  horizon: number
  priorityBase: number
  /** Conditional walls (control 1) block when true. */
  condBlocks: boolean
}

export interface Ego {
  /** Left edge */
  x: number
  /** Bottom row (baseline) */
  y: number
  w: number
  h: number
}

export type StepResult =
  | { kind: 'moved'; x: number; y: number; trigger: boolean; water: boolean }
  | { kind: 'blocked' }
  | { kind: 'edge'; dir: Dir }

export const LOOP_FOR: Record<Dir, number> = { e: 0, w: 1, s: 2, n: 3 }
export const DELTA: Record<Dir, [number, number]> = { e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1] }

/** Can the ego's baseline sit at (x, y)? Mirrors AGI's control checks. */
export function canStand(env: WalkEnv, x: number, y: number, w: number): boolean {
  if (y <= env.horizon || y >= PIC_H || x < 0 || x + w > PIC_W) return false
  for (let i = 0; i < w; i++) {
    const p = env.priority[y * PIC_W + x + i]
    if (p === CTRL_WALL) return false
    if (p === CTRL_COND && env.condBlocks) return false
  }
  return true
}

export function baselineInfo(env: WalkEnv, x: number, y: number, w: number): { trigger: boolean; water: boolean } {
  let trigger = false
  let water = true
  for (let i = 0; i < w; i++) {
    const p = env.priority[y * PIC_W + x + i]
    if (p === CTRL_TRIGGER) trigger = true
    if (p !== CTRL_WATER) water = false
  }
  return { trigger, water: water && w > 0 }
}

/** Move the ego one step. Leaving the walkable picture reports the edge. */
export function step(env: WalkEnv, ego: Ego, dir: Dir): StepResult {
  const [dx, dy] = DELTA[dir]
  const nx = ego.x + dx
  const ny = ego.y + dy
  if (nx < 0) return { kind: 'edge', dir: 'w' }
  if (nx + ego.w > PIC_W) return { kind: 'edge', dir: 'e' }
  if (ny <= env.horizon) return { kind: 'edge', dir: 'n' }
  if (ny >= PIC_H) return { kind: 'edge', dir: 's' }
  if (!canStand(env, nx, ny, ego.w)) return { kind: 'blocked' }
  return { kind: 'moved', x: nx, y: ny, ...baselineInfo(env, nx, ny, ego.w) }
}

export function egoPriority(env: WalkEnv, y: number): number {
  return bandForY(y, env.priorityBase)
}

/** Draw a cel into a visual buffer, hidden wherever the picture is in front. */
export function drawEgo(visual: Uint8Array, priority: Uint8Array, cel: ResolvedCel, x: number, y: number, pri: number): void {
  const top = y - cel.h + 1
  for (let cy = 0; cy < cel.h; cy++) {
    const py = top + cy
    if (py < 0 || py >= PIC_H) continue
    for (let cx = 0; cx < cel.w; cx++) {
      const px = x + cx
      if (px < 0 || px >= PIC_W) continue
      const v = cel.px[cy * cel.w + cx]
      if (v === 255) continue
      if (pri >= effectivePriority(priority, px, py)) visual[py * PIC_W + px] = v
    }
  }
}

/** Find a free spot for the ego, scanning outward from a preferred point. */
export function findSpawn(env: WalkEnv, w: number, prefX = 80, prefY = 150): { x: number; y: number } | null {
  for (let r = 0; r < 200; r++) {
    for (const [ox, oy] of [[0, r], [0, -r], [r, 0], [-r, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) {
      const x = Math.round(prefX - w / 2 + ox)
      const y = prefY + oy
      if (canStand(env, x, y, w)) return { x, y }
    }
  }
  return null
}

/** Where to enter the next room when walking off an edge. */
export function entryPoint(env: WalkEnv, fromDir: Dir, ego: Ego): { x: number; y: number } | null {
  const pref =
    fromDir === 'e' ? { x: 1 + ego.w / 2, y: ego.y }
    : fromDir === 'w' ? { x: PIC_W - 1 - ego.w / 2, y: ego.y }
    : fromDir === 'n' ? { x: ego.x + ego.w / 2, y: PIC_H - 2 }
    : { x: ego.x + ego.w / 2, y: env.horizon + 2 }
  return findSpawn(env, ego.w, pref.x, pref.y)
}
