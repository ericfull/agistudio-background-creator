import type { ElementDef } from '../types'
import { buildings } from './buildings'
import { interior } from './interior'
import { outdoor } from './outdoor'
import { props } from './props'

/** Spooky set: haunted manor, graveyard, swamp and crypt pieces. */
export const spooky: ElementDef[] = [...buildings, ...outdoor, ...interior, ...props]
