import { DEFAULT_PRIORITY_BASE, PIC_H, PIC_W } from './constants'

/**
 * AGI priority band for a row. Rows above the base are band 4; below it the
 * remaining height is split into 10 bands (5–14). With the default base of 48
 * this gives the classic 12-pixel bands.
 */
export function bandForY(y: number, base = DEFAULT_PRIORITY_BASE): number {
  if (y < base) return 4
  const b = Math.floor(((y - base) * 10) / (PIC_H - base)) + 5
  return Math.max(4, Math.min(14, b))
}

/** Precomputed table of bands per row for a given base. */
export function bandTable(base = DEFAULT_PRIORITY_BASE): Uint8Array {
  const t = new Uint8Array(PIC_H)
  for (let y = 0; y < PIC_H; y++) t[y] = bandForY(y, base)
  return t
}

/** First row where a band starts (for drawing guides). */
export function bandStarts(base = DEFAULT_PRIORITY_BASE): { band: number; y: number }[] {
  const out: { band: number; y: number }[] = []
  let prev = -1
  for (let y = 0; y < PIC_H; y++) {
    const b = bandForY(y, base)
    if (b !== prev) out.push({ band: b, y })
    prev = b
  }
  return out
}

/**
 * The effective priority at a pixel. Control values (0–3) don't carry depth,
 * so AGI scans downward to the first real priority below.
 */
export function effectivePriority(priority: Uint8Array, x: number, y: number): number {
  for (let yy = y; yy < PIC_H; yy++) {
    const p = priority[yy * PIC_W + x]
    if (p >= 4) return p
  }
  return 15
}
