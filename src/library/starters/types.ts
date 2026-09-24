import type { Layer, Room, Theme } from '../../state/types'

/** A hand-built room template. `build` returns room settings plus layers. */
export interface RoomStarter {
  id: string
  name: string
  theme: Theme
  description: string
  build(seed: number): Partial<Room> & { layers: Layer[] }
}
