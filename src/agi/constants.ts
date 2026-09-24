/** Logical AGI picture size. Pixels are twice as wide as they are tall on screen. */
export const PIC_W = 160
export const PIC_H = 168
export const PIC_SIZE = PIC_W * PIC_H

/** Sentinel for "nothing drawn here" in element and layer buffers. */
export const T = 255

/** Symbolic priority tags stored in layer priority buffers, resolved during composition. */
export const PRI_ROWS = 16
export const PRI_BASELINE = 17

/** Control values live in the priority screen (0–3), as in AGI. */
export const CTRL_WALL = 0
export const CTRL_COND = 1
export const CTRL_TRIGGER = 2
export const CTRL_WATER = 3

export const DEFAULT_PRIORITY_BASE = 48
export const DEFAULT_HORIZON = 36
