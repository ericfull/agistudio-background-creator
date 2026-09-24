import { PIC_H, PIC_W } from '../agi/constants'
import { EGA_RGB } from '../agi/palette'
import { drawText } from './font8'

export type ExportScreen = 'visual' | 'priority' | 'control'

export interface PictureOptions {
  screen: ExportScreen
  /** 'native' = 160x168, 'wide' = 2:1 pixels, 'aspect' = wide plus 4:3 vertical stretch */
  shape: 'native' | 'wide' | 'aspect'
  scale: number
  /** Add the mock status bar and input line (320x200 frame). */
  frame: boolean
  scanlines: boolean
}

export const SIZE_PRESETS: { id: string; name: string; shape: PictureOptions['shape']; scale: number }[] = [
  { id: 'native', name: 'Native', shape: 'native', scale: 1 },
  { id: 'wide1', name: 'Wide', shape: 'wide', scale: 1 },
  { id: 'wide2', name: 'Wide ×2', shape: 'wide', scale: 2 },
  { id: 'wide3', name: 'Wide ×3', shape: 'wide', scale: 3 },
  { id: 'wide4', name: 'Wide ×4', shape: 'wide', scale: 4 },
  { id: 'aspect2', name: '4:3 ×2', shape: 'aspect', scale: 2 },
  { id: 'aspect4', name: '4:3 ×4', shape: 'aspect', scale: 4 },
]

/** Output size of a preset, with or without the 320×200 game frame. */
export function presetSize(p: (typeof SIZE_PRESETS)[number], frame: boolean): { w: number; h: number } {
  const baseW = frame ? 320 : p.shape === 'native' ? 160 : 320
  const baseH = frame ? 200 : 168
  return { w: Math.round(baseW * p.scale), h: Math.round(baseH * p.scale * (p.shape === 'aspect' ? 1.2 : 1)) }
}

/** Map the chosen screen to EGA indices (control: walls etc. on white). */
export function screenIndices(visual: Uint8Array, priority: Uint8Array, screen: ExportScreen): Uint8Array {
  if (screen === 'visual') return visual
  if (screen === 'priority') return priority.map((p) => p & 15)
  return priority.map((p) => (p < 4 ? p : 15))
}

/** Build the 320-wide index buffer (with frame) or the plain picture. */
function source(indices: Uint8Array, frame: boolean): { buf: Uint8Array; w: number; h: number; wideAlready: boolean } {
  if (!frame) return { buf: indices, w: PIC_W, h: PIC_H, wideAlready: false }
  const w = 320
  const h = 200
  const buf = new Uint8Array(w * h)
  // status line: black text on white, like AGI
  buf.fill(15, 0, w * 8)
  drawText(buf, w, ' Score:0 of 158', 0, 0, 0)
  drawText(buf, w, 'Sound:on ', w - 9 * 8, 0, 0)
  for (let y = 0; y < PIC_H; y++) for (let x = 0; x < PIC_W; x++) {
    const v = indices[y * PIC_W + x]
    buf[(y + 8) * w + x * 2] = v
    buf[(y + 8) * w + x * 2 + 1] = v
  }
  drawText(buf, w, '>_', 0, 176, 15)
  return { buf, w, h, wideAlready: true }
}

/** Render to RGBA pixels at the final export size. */
export function renderPicture(indices: Uint8Array, o: PictureOptions): { w: number; h: number; rgba: Uint8ClampedArray } {
  const src = source(indices, o.frame)
  const xs = (src.wideAlready || o.shape === 'native' ? 1 : 2) * o.scale
  const ys = o.shape === 'aspect' ? 1.2 * o.scale : o.scale
  const w = Math.round(src.w * xs)
  const h = Math.round(src.h * ys)
  const rgba = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(src.h - 1, Math.floor(y / ys))
    const dark = o.scanlines && o.scale >= 2 && y % 2 === 1
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.w - 1, Math.floor(x / xs))
      const [r, g, b] = EGA_RGB[src.buf[sy * src.w + sx] & 15]
      const k = (y * w + x) * 4
      const f = dark ? 0.72 : 1
      rgba[k] = r * f
      rgba[k + 1] = g * f
      rgba[k + 2] = b * f
      rgba[k + 3] = 255
    }
  }
  return { w, h, rgba }
}

export function rgbaToCanvas(w: number, h: number, rgba: Uint8ClampedArray): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h
  const img = new ImageData(w, h)
  img.data.set(rgba)
  cv.getContext("2d")!.putImageData(img, 0, 0)
  return cv
}

export function canvasToBlob(cv: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('PNG encoding failed'))), 'image/png'))
}
