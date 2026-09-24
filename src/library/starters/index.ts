import { fantasyStarters } from './fantasy'
import { modernStarters } from './modern'
import { natureStarters } from './nature'
import { scifiStarters } from './scifi'
import { spookyStarters } from './spooky'
import type { RoomStarter } from './types'

export const STARTERS: RoomStarter[] = [
  ...natureStarters,
  ...fantasyStarters,
  ...scifiStarters,
  ...modernStarters,
  ...spookyStarters,
]
