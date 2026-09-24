import type { ColorRef, PicCommand, PriorityRef } from './commands'
import { PIC_H, PIC_SIZE, PIC_W, PRI_BASELINE, PRI_CLEAR, PRI_DEFAULT, PRI_ROWS, T } from './constants'
import { defaultTexture, plotPattern, type PenState } from './pen'

export type ColorResolver = (c: ColorRef) => number

const LIMIT = 4000
const clampCoord = (v: number) => Math.max(-LIMIT, Math.min(LIMIT, Math.round(v)))

export function encodePriority(p: PriorityRef): number {
  if (p === 'rows') return PRI_ROWS
  if (p === 'baseline') return PRI_BASELINE
  if (p === 'clear') return PRI_CLEAR
  if (p === 'default') return PRI_DEFAULT
  return Math.max(0, Math.min(15, p | 0))
}

/** Walks the pixels of an AGI line (ScummVM PictureMgr::drawLine). */
export function agiLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  put: (x: number, y: number) => void,
): void {
  x1 = clampCoord(x1)
  y1 = clampCoord(y1)
  x2 = clampCoord(x2)
  y2 = clampCoord(y2)
  if (x1 === x2) {
    const [a, b] = y1 < y2 ? [y1, y2] : [y2, y1]
    for (let y = a; y <= b; y++) put(x1, y)
    return
  }
  if (y1 === y2) {
    const [a, b] = x1 < x2 ? [x1, x2] : [x2, x1]
    for (let x = a; x <= b; x++) put(x, y1)
    return
  }
  let x = x1
  let y = y1
  let stepY = 1
  let deltaY = y2 - y1
  if (deltaY < 0) {
    stepY = -1
    deltaY = -deltaY
  }
  let stepX = 1
  let deltaX = x2 - x1
  if (deltaX < 0) {
    stepX = -1
    deltaX = -deltaX
  }
  let i: number, detdelta: number, errorX: number, errorY: number
  if (deltaY > deltaX) {
    i = deltaY
    detdelta = deltaY
    errorX = Math.floor(deltaY / 2)
    errorY = 0
  } else {
    i = deltaX
    detdelta = deltaX
    errorX = 0
    errorY = Math.floor(deltaX / 2)
  }
  put(x, y)
  do {
    errorY += deltaY
    if (errorY >= detdelta) {
      errorY -= detdelta
      y += stepY
    }
    errorX += deltaX
    if (errorX >= detdelta) {
      errorX -= detdelta
      x += stepX
    }
    put(x, y)
    i--
  } while (i > 0)
}

export type BBox = { x0: number; y0: number; x1: number; y1: number }

/**
 * AGI picture rasterizer. Draws into a visual and a priority buffer that start
 * as "untouched" (T). Lines and fills follow the original engine's rules;
 * a fill only spreads into untouched pixels, so outlines contain it.
 */
export class Raster {
  readonly visual = new Uint8Array(PIC_SIZE).fill(T)
  readonly priority = new Uint8Array(PIC_SIZE).fill(T)
  visOn = false
  visColor = 0
  priOn = false
  priValue = 0
  pen: PenState = { size: 0, square: false, splatter: false }
  bbox: BBox = { x0: PIC_W, y0: PIC_H, x1: -1, y1: -1 }
  private plotCount = 0

  constructor(private resolveColor: ColorResolver = (c) => (typeof c === 'number' ? c : 0)) {}

  get empty(): boolean {
    return this.bbox.x1 < 0
  }

  put(x: number, y: number): void {
    if (x < 0 || y < 0 || x >= PIC_W || y >= PIC_H) return
    const i = y * PIC_W + x
    let wrote = false
    if (this.visOn) {
      this.visual[i] = this.visColor
      wrote = true
    }
    if (this.priOn) {
      // 'default' is a soft write: it never erases control (or 'clear') drawn earlier
      const cur = this.priority[i]
      if (this.priValue !== PRI_DEFAULT || (cur > 3 && cur !== PRI_CLEAR)) this.priority[i] = this.priValue
      wrote = true
    }
    if (wrote) {
      const b = this.bbox
      if (x < b.x0) b.x0 = x
      if (x > b.x1) b.x1 = x
      if (y < b.y0) b.y0 = y
      if (y > b.y1) b.y1 = y
    }
  }

  /** AGI line algorithm (ScummVM PictureMgr::drawLine), without endpoint clipping. */
  line(x1: number, y1: number, x2: number, y2: number): void {
    agiLine(x1, y1, x2, y2, this.putFn)
  }

  private putFn = (x: number, y: number) => this.put(x, y)

  private canFill(i: number): boolean {
    if (this.visOn) return this.visual[i] === T
    if (this.priOn) return this.priority[i] === T
    return false
  }

  /** 4-connected flood fill of untouched pixels, like AGI's fill. */
  fill(sx: number, sy: number): void {
    sx = Math.round(sx)
    sy = Math.round(sy)
    if (!this.visOn && !this.priOn) return
    if (sx < 0 || sy < 0 || sx >= PIC_W || sy >= PIC_H) return
    if (!this.canFill(sy * PIC_W + sx)) return
    const stack: number[] = [sx, sy]
    while (stack.length) {
      const y = stack.pop()!
      let x = stack.pop()!
      let i = y * PIC_W + x
      if (!this.canFill(i)) continue
      while (x > 0 && this.canFill(i - 1)) {
        x--
        i--
      }
      let spanUp = false
      let spanDown = false
      while (x < PIC_W && this.canFill(y * PIC_W + x)) {
        this.put(x, y)
        if (y > 0) {
          const up = this.canFill((y - 1) * PIC_W + x)
          if (up && !spanUp) {
            stack.push(x, y - 1)
            spanUp = true
          } else if (!up) spanUp = false
        }
        if (y < PIC_H - 1) {
          const down = this.canFill((y + 1) * PIC_W + x)
          if (down && !spanDown) {
            stack.push(x, y + 1)
            spanDown = true
          } else if (!down) spanDown = false
        }
        x++
      }
    }
  }

  plot(x: number, y: number, texture?: number): void {
    const tex = texture ?? defaultTexture(this.plotCount)
    this.plotCount++
    plotPattern(clampCoord(x), clampCoord(y), this.pen, tex, (px, py) => this.put(px, py))
  }

  exec(c: PicCommand): void {
    switch (c.op) {
      case 'visual':
        if (c.color === null) this.visOn = false
        else {
          this.visOn = true
          this.visColor = this.resolveColor(c.color) & 0x0f
        }
        break
      case 'priority':
        if (c.value === null) this.priOn = false
        else {
          this.priOn = true
          this.priValue = encodePriority(c.value)
        }
        break
      case 'pen':
        this.pen = { size: c.size, square: c.shape === 'square', splatter: c.splatter }
        break
      case 'line':
        if (c.pts.length === 1) this.put(Math.round(c.pts[0][0]), Math.round(c.pts[0][1]))
        for (let k = 1; k < c.pts.length; k++) {
          const [ax, ay] = c.pts[k - 1]
          const [bx, by] = c.pts[k]
          this.line(ax, ay, bx, by)
        }
        break
      case 'xcorner':
      case 'ycorner': {
        let [x, y] = c.start
        x = Math.round(x)
        y = Math.round(y)
        this.put(x, y)
        let horizontal = c.op === 'xcorner'
        for (const v of c.steps) {
          const n = Math.round(v)
          if (horizontal) {
            this.line(x, y, n, y)
            x = n
          } else {
            this.line(x, y, x, n)
            y = n
          }
          horizontal = !horizontal
        }
        break
      }
      case 'fill':
        for (const [x, y] of c.pts) this.fill(x, y)
        break
      case 'plot':
        c.pts.forEach(([x, y], k) => this.plot(x, y, c.textures?.[k]))
        break
    }
  }

  run(cmds: readonly PicCommand[]): this {
    for (const c of cmds) this.exec(c)
    return this
  }
}

export function rasterize(cmds: readonly PicCommand[], resolveColor?: ColorResolver): Raster {
  return new Raster(resolveColor).run(cmds)
}
