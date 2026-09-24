export const EGA_HEX = [
  '#000000', '#0000AA', '#00AA00', '#00AAAA', '#AA0000', '#AA00AA', '#AA5500', '#AAAAAA',
  '#555555', '#5555FF', '#55FF55', '#55FFFF', '#FF5555', '#FF55FF', '#FFFF55', '#FFFFFF',
] as const

export const EGA_NAMES = [
  'Black', 'Blue', 'Green', 'Cyan', 'Red', 'Magenta', 'Brown', 'Light gray',
  'Dark gray', 'Light blue', 'Light green', 'Light cyan', 'Light red', 'Light magenta', 'Yellow', 'White',
] as const

export const EGA_RGB: ReadonlyArray<readonly [number, number, number]> = EGA_HEX.map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
])

export const EGA = {
  black: 0, blue: 1, green: 2, cyan: 3, red: 4, magenta: 5, brown: 6, lgray: 7,
  dgray: 8, lblue: 9, lgreen: 10, lcyan: 11, lred: 12, lmagenta: 13, yellow: 14, white: 15,
} as const

export const IDENTITY_MAP: readonly number[] = Array.from({ length: 16 }, (_, i) => i)
