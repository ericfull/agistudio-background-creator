import { PIC_H, PIC_W } from './constants'

/**
 * Horizontal runs [x0, x1, y] covering the 4-connected area of the same value
 * as the pixel at (sx, sy). Used by the Fill tool to fill what you see.
 */
export function floodRuns(plane: Uint8Array, sx: number, sy: number): [number, number, number][] {
  if (sx < 0 || sy < 0 || sx >= PIC_W || sy >= PIC_H) return []
  const target = plane[sy * PIC_W + sx]
  const seen = new Uint8Array(PIC_W * PIC_H)
  const runs: [number, number, number][] = []
  const stack: [number, number][] = [[sx, sy]]
  while (stack.length) {
    const [x0, y] = stack.pop()!
    if (seen[y * PIC_W + x0] || plane[y * PIC_W + x0] !== target) continue
    let a = x0
    let b = x0
    while (a > 0 && !seen[y * PIC_W + a - 1] && plane[y * PIC_W + a - 1] === target) a--
    while (b < PIC_W - 1 && !seen[y * PIC_W + b + 1] && plane[y * PIC_W + b + 1] === target) b++
    for (let x = a; x <= b; x++) seen[y * PIC_W + x] = 1
    runs.push([a, b, y])
    for (const ny of [y - 1, y + 1]) {
      if (ny < 0 || ny >= PIC_H) continue
      for (let x = a; x <= b; x++) {
        const i = ny * PIC_W + x
        if (!seen[i] && plane[i] === target) stack.push([x, ny])
      }
    }
  }
  return runs.sort((p, q) => p[2] - q[2] || p[0] - q[0])
}
