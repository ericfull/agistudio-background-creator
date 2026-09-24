import type { ColorRef } from '../../agi/commands'
import type { Kit } from '../../kit/kit'

export const W = 159
export type Pt2 = [number, number]

/** Local x for an absolute picture column (inverse of k.X). */
export function absX(k: Kit, ax: number): number {
  const { x, scale, flip, full } = k.ctx
  if (full) return flip ? W - ax : ax
  return (flip ? x - ax : ax - x) / scale
}

/** Local y for an absolute picture row (inverse of k.Y). */
export function absY(k: Kit, ay: number): number {
  const { y, scale, full } = k.ctx
  return full ? ay : (ay - y) / scale
}

/** One screen pixel in local units (so details stay 1px wide at any scale). */
export function px(k: Kit): number {
  return 1 / k.sc
}

// 3x5 pixel font for signs, plates and neon. '#' = lit pixel.
const G: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  "'": ['#', '#', '.', '.', '.'],
  '.': ['.', '.', '.', '.', '#'],
  '!': ['#', '#', '#', '.', '#'],
  '-': ['...', '...', '###', '...', '...'],
  '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
  ' ': ['..', '..', '..', '..', '..'],
}

function glyph(ch: string): string[] {
  return G[ch] ?? G[' ']
}

/** Width of a string in font pixels (before any size multiplier). */
export function textWidth(s: string): number {
  let w = 0
  const chars = [...s.toUpperCase()]
  chars.forEach((ch, i) => {
    w += glyph(ch)[0].length + (i < chars.length - 1 ? 1 : 0)
  })
  return w
}

/**
 * Crisp pixel text centered on local x `cx` with its top at local `top`.
 * Pixels snap to whole screen pixels (u = rounded scale) and the text always
 * reads left to right, even when the element is flipped. `tall` doubles the
 * rows for neon-style lettering.
 */
export function text(k: Kit, s: string, cx: number, top: number, color: ColorRef, tall = false): void {
  const u = Math.max(1, Math.round(k.sc))
  const vy = tall ? 2 : 1
  const w = textWidth(s) * u
  const ax0 = Math.round(k.X(cx)) - Math.floor(w / 2)
  const ay0 = Math.round(k.Y(top))
  let gx = 0
  for (const ch of s.toUpperCase()) {
    const g = glyph(ch)
    g.forEach((row, gy) => {
      let i = 0
      while (i < row.length) {
        if (row[i] !== '#') {
          i++
          continue
        }
        let j = i
        while (j + 1 < row.length && row[j + 1] === '#') j++
        for (let d = 0; d < u * vy; d++) {
          const yy = ay0 + gy * u * vy + d
          k.hline(absX(k, ax0 + (gx + i) * u), absX(k, ax0 + (gx + j + 1) * u - 1), absY(k, yy), color)
        }
        i = j + 1
      }
    })
    gx += g[0].length + 1
  }
}

/** Screen-pixel height of text drawn with `text()`. */
export function textHeight(k: Kit, tall = false): number {
  return 5 * Math.max(1, Math.round(k.sc)) * (tall ? 2 : 1)
}

/** Local-unit width of text drawn with `text()`. */
export function textLocalWidth(k: Kit, s: string): number {
  return (textWidth(s) * Math.max(1, Math.round(k.sc))) / k.sc
}

/** A simple framed window pane: frame outline, glass fill, optional center mullion. */
export function pane(
  k: Kit,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  glass: ColorRef,
  frame: ColorRef,
  mullion = false,
): void {
  k.rect(x0, y0, x1, y1, glass, frame)
  if (mullion && k.S(x1 - x0) >= 6) k.vline((x0 + x1) / 2, y0, y1, frame)
}
