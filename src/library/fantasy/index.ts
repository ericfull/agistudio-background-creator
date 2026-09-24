import type { ElementDef } from '../types'
import { furniture } from './furniture'
import { interiors } from './interiors'
import { props } from './props'
import { structures } from './structures'

export const fantasy: ElementDef[] = [...structures, ...interiors, ...furniture, ...props]
