/**
 * AGI pen patterns, following ScummVM's engines/agi/picture.cpp (plotPattern).
 * A pen of size s covers (s + 1) columns by (2s + 1) rows, which looks round
 * once the pixels are stretched 2:1.
 */

const BINARY_LIST = [
  0x8000, 0x4000, 0x2000, 0x1000, 0x800, 0x400, 0x200, 0x100, 0x80, 0x40, 0x20, 0x10, 0x8, 0x4, 0x2, 0x1,
]
const CIRCLE_LIST = [0, 1, 4, 9, 16, 25, 37, 50]
const CIRCLE_DATA = [
  0x8000,
  0xe000, 0xe000, 0xe000,
  0x7000, 0xf800, 0xf800, 0xf800, 0x7000,
  0x3800, 0x7c00, 0xfe00, 0xfe00, 0xfe00, 0x7c00, 0x3800,
  0x1c00, 0x7f00, 0xff80, 0xff80, 0xff80, 0xff80, 0xff80, 0x7f00, 0x1c00,
  0x0e00, 0x3f80, 0x7fc0, 0x7fc0, 0xffe0, 0xffe0, 0xffe0, 0x7fc0, 0x7fc0, 0x3f80, 0x1f00, 0x0e00,
  0x0f80, 0x3fe0, 0x7ff0, 0x7ff0, 0xfff8, 0xfff8, 0xfff8, 0xfff8, 0xfff8, 0x7ff0, 0x7ff0, 0x3fe0, 0x0f80,
  0x07c0, 0x1ff0, 0x3ff8, 0x7ffc, 0x7ffc, 0xfffe, 0xfffe, 0xfffe, 0xfffe, 0xfffe, 0x7ffc, 0x7ffc, 0x3ff8, 0x1ff0, 0x07c0,
]

export type PenState = { size: number; square: boolean; splatter: boolean }

/**
 * Calls `put` for every pixel the pen covers when plotted at (x, y).
 * `texture` seeds the splatter pattern (0–127).
 */
export function plotPattern(
  x: number,
  y: number,
  pen: PenState,
  texture: number,
  put: (x: number, y: number) => void,
): void {
  const size = Math.max(0, Math.min(7, pen.size | 0))
  let circleIdx = CIRCLE_LIST[size]
  // AGI centers the pattern: x uses half-steps because the pen is (size+1) wide.
  const startX = Math.floor((x * 2 - size) / 2)
  let penY = y - size
  const finalY = penY + size * 2 + 1
  const penWidth = (size * 2 + 1) * 2
  let t = (texture | 0x01) & 0xff

  for (; penY < finalY; penY++) {
    const word = CIRCLE_DATA[circleIdx++]
    let penX = startX
    for (let counter = 0; counter <= penWidth; counter += 4) {
      if (pen.square || (BINARY_LIST[counter >> 1] & word) !== 0) {
        let draw = true
        if (pen.splatter) {
          const bit = t & 1
          t = t >> 1
          if (bit) t ^= 0xb8
          draw = (t & 0x03) === 0x02
        }
        if (draw) put(penX, penY)
      }
      penX++
    }
  }
}

/** Deterministic default splatter texture for the nth plotted point. */
export function defaultTexture(n: number): number {
  return (n * 37 + 11) & 0x7f
}
