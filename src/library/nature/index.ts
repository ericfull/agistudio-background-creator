import type { ElementDef } from '../types'
import { flora } from './flora'
import { skies } from './skies'

export const nature: ElementDef[] = [...skies, ...flora]
