import { PIC_H, PIC_SIZE, PIC_W } from '../agi/constants'
import { EGA_RGB } from '../agi/palette'
import type { Composed } from '../agi/compose'
import type { Screen } from '../state/store'

/** Fill an ImageData (160x168) for a given screen view. */
export function paintScreen(img: ImageData, c: Composed, screen: Screen): void {
  const d = img.data
  for (let i = 0; i < PIC_SIZE; i++) {
    const v = c.visual[i] & 15
    const p = c.priority[i]
    let r: number, g: number, b: number
    if (screen === 'visual') {
      ;[r, g, b] = EGA_RGB[v]
    } else if (screen === 'priority') {
      ;[r, g, b] = EGA_RGB[p & 15]
    } else if (screen === 'control') {
      if (p < 4) {
        ;[r, g, b] = EGA_RGB[p === 0 ? 15 : p === 1 ? 9 : p === 2 ? 10 : 11]
      } else {
        const [vr, vg, vb] = EGA_RGB[v]
        // dim the picture toward the UI background so control lines stand out
        r = 15 + (vr - 15) * 0.3
        g = 26 + (vg - 26) * 0.3
        b = 48 + (vb - 48) * 0.3
      }
    } else {
      const [vr, vg, vb] = EGA_RGB[v]
      const [pr, pg, pb] = EGA_RGB[p & 15]
      r = (vr + pr) / 2
      g = (vg + pg) / 2
      b = (vb + pb) / 2
    }
    const o = i * 4
    d[o] = r
    d[o + 1] = g
    d[o + 2] = b
    d[o + 3] = 255
  }
}

export function makeImage(): ImageData {
  return new ImageData(PIC_W, PIC_H)
}

/** Draw a 160x168 picture into a canvas with wide pixels (2x horizontally) at a zoom. */
export function blitWide(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement | OffscreenCanvas, zoom: number): void {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(src as CanvasImageSource, 0, 0, PIC_W * 2 * zoom, PIC_H * zoom)
}
