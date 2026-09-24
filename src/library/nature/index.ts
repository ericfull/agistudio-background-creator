import type { ElementDef } from '../types'
import { flora } from './flora'
import { rocks } from './rocks'
import { skies } from './skies'
import { terrain } from './terrain'
import { water } from './water'

export const nature: ElementDef[] = [...skies, ...terrain, ...water, ...flora, ...rocks]
