import type { MoodId } from '../state/types'
import { IDENTITY_MAP } from './palette'

/** 16-entry EGA remaps applied after composition. Index = source color. */
export const MOODS: Record<MoodId, { label: string; map: readonly number[] }> = {
  day: { label: 'Day', map: IDENTITY_MAP },
  //            0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15
  dusk: { label: 'Dusk', map: [0, 5, 2, 1, 4, 5, 6, 8, 8, 13, 2, 12, 12, 13, 14, 7] },
  night: { label: 'Night', map: [0, 0, 1, 1, 4, 1, 8, 8, 0, 1, 2, 9, 4, 5, 14, 7] },
  storm: { label: 'Storm', map: [0, 8, 2, 8, 4, 8, 6, 8, 0, 8, 2, 7, 4, 5, 7, 7] },
  autumn: { label: 'Autumn', map: [0, 1, 6, 3, 4, 5, 6, 7, 8, 9, 14, 11, 12, 13, 14, 15] },
  winter: { label: 'Winter', map: [0, 9, 2, 11, 4, 5, 6, 7, 8, 11, 15, 15, 12, 13, 14, 15] },
  haunted: { label: 'Haunted', map: [0, 5, 8, 5, 4, 5, 8, 8, 0, 5, 2, 13, 4, 5, 10, 10] },
}

export const MOOD_IDS = Object.keys(MOODS) as MoodId[]
