import { fantasy } from './fantasy'
import { modern } from './modern'
import { nature } from './nature'
import { scifi } from './scifi'
import { spooky } from './spooky'
import type { ElementDef } from './types'

export const ELEMENTS: ElementDef[] = [...nature, ...fantasy, ...scifi, ...modern, ...spooky]

const byId = new Map(ELEMENTS.map((e) => [e.id, e]))

export function getElement(id: string): ElementDef | undefined {
  return byId.get(id)
}
