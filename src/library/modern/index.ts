import type { ElementDef } from '../types'
import { buildings } from './buildings'
import { interiors } from './interiors'
import { street } from './street'

export const modern: ElementDef[] = [...street, ...buildings, ...interiors]
