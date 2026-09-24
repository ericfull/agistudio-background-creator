/** A color reference: a literal EGA index (0–15) or a named element role. */
export type ColorRef = number | { role: string }
/** A priority reference: literal 0–15, or a symbolic mode resolved at composition. */
export type PriorityRef = number | 'rows' | 'baseline'
export type Pt = [number, number]
export type PenShape = 'circle' | 'square'

/**
 * AGI-style picture commands. Every source of artwork (library elements, hand
 * painting, exploded elements) produces this same command stream.
 */
export type PicCommand =
  | { op: 'visual'; color: ColorRef | null }
  | { op: 'priority'; value: PriorityRef | null }
  | { op: 'pen'; size: number; shape: PenShape; splatter: boolean }
  | { op: 'line'; pts: Pt[] }
  /** X corner: start point, then alternating new-x, new-y values */
  | { op: 'xcorner'; start: Pt; steps: number[] }
  /** Y corner: start point, then alternating new-y, new-x values */
  | { op: 'ycorner'; start: Pt; steps: number[] }
  | { op: 'fill'; pts: Pt[] }
  | { op: 'plot'; pts: Pt[]; textures?: number[] }

export type CommandOp = PicCommand['op']

export function describeCommand(c: PicCommand): string {
  switch (c.op) {
    case 'visual':
      return c.color === null ? 'Visual off' : `Visual ${typeof c.color === 'number' ? c.color : c.color.role}`
    case 'priority':
      return c.value === null ? 'Priority off' : `Priority ${c.value}`
    case 'pen':
      return `Pen ${c.size} ${c.shape}${c.splatter ? ' splatter' : ''}`
    case 'line':
      return `Line ×${c.pts.length}`
    case 'xcorner':
      return `X corner ×${c.steps.length}`
    case 'ycorner':
      return `Y corner ×${c.steps.length}`
    case 'fill':
      return `Fill ×${c.pts.length}`
    case 'plot':
      return `Plot ×${c.pts.length}`
  }
}
