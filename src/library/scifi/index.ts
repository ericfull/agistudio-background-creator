import type { ElementDef } from '../types'
import { doors } from './doors'
import { machines } from './machines'
import { planet } from './planet'
import { props } from './props'
import { shells } from './shells'
import { ships } from './ship'

export const scifi: ElementDef[] = [...shells, ...doors, ...machines, ...props, ...ships, ...planet]
