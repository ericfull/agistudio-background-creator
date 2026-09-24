export type Rng = {
  /** float in [0, 1) */
  next(): number
  /** integer in [min, max] inclusive */
  int(min: number, max: number): number
  /** float in [min, max) */
  range(min: number, max: number): number
  pick<T>(items: readonly T[]): T
  chance(p: number): boolean
  /** derive an independent stream */
  fork(salt: number): Rng
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    range: (min, max) => min + next() * (max - min),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    fork: (salt) => mulberry32((seed * 2654435761 + salt * 40503 + 1) >>> 0),
  }
  return rng
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff)
}
