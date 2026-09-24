import { compose, type ComposeLayer, type Composed, type LayerRaster } from '../agi/compose'
import { PIC_H, PIC_SIZE, PIC_W, PRI_BASELINE, T } from '../agi/constants'
import { MOODS } from '../agi/moods'
import { Raster } from '../agi/raster'
import { getElement } from '../library'
import { roleResolver, runElement } from '../library/run'
import { resolveCel } from '../sprites/render'
import type { View } from '../sprites/types'
import type { ElementLayer, Layer, Room, ViewLayer } from '../state/types'

type Entry = { key: string; dep: unknown; raster: LayerRaster }
const cache = new WeakMap<Layer, Entry>()

/** Room settings an element's drawing depends on (so unrelated slider moves don't redraw it). */
function roomKey(layer: ElementLayer, room: Room): string {
  const def = getElement(layer.elementId)
  const persp = layer.perspective ?? def?.perspective ?? false
  // every element may read horizon and priority base through its kit context
  return persp ? `${room.horizon}|${room.priorityBase}|${room.perspective.far}|${room.perspective.near}` : `${room.horizon}|${room.priorityBase}`
}

function emptyRaster(): LayerRaster {
  return {
    visual: new Uint8Array(PIC_SIZE).fill(T),
    priority: new Uint8Array(PIC_SIZE).fill(T),
    bbox: { x0: PIC_W, y0: PIC_H, x1: -1, y1: -1 },
  }
}

function rasterElement(layer: ElementLayer, room: Room): LayerRaster {
  const def = getElement(layer.elementId)
  if (!def) return emptyRaster()
  const cmds = runElement(def, layer, room)
  const r = new Raster(roleResolver(def, layer.colorMap)).run(cmds)
  return { visual: r.visual, priority: r.priority, bbox: r.bbox }
}

export function rasterView(layer: ViewLayer, view: View | undefined, frame = 0): LayerRaster {
  const out = emptyRaster()
  if (!view) return out
  const cel = resolveCel(view, layer.loop, layer.cel + frame)
  if (!cel) return out
  const pri = layer.priority === 'baseline' ? PRI_BASELINE : layer.priority
  const top = layer.y - cel.h + 1
  const b = out.bbox
  const mark = (x: number, y: number) => {
    if (x < b.x0) b.x0 = x
    if (x > b.x1) b.x1 = x
    if (y < b.y0) b.y0 = y
    if (y > b.y1) b.y1 = y
  }
  for (let cy = 0; cy < cel.h; cy++) {
    for (let cx = 0; cx < cel.w; cx++) {
      const v = cel.px[cy * cel.w + cx]
      if (v === T) continue
      const x = layer.x + cx
      const y = top + cy
      if (x < 0 || y < 0 || x >= PIC_W || y >= PIC_H) continue
      out.visual[y * PIC_W + x] = layer.recolor ? layer.recolor[v] : v
      out.priority[y * PIC_W + x] = pri
      mark(x, y)
    }
  }
  if (layer.margin !== null && layer.y >= 0 && layer.y < PIC_H) {
    for (let cx = 0; cx < cel.w; cx++) {
      const x = layer.x + cx
      if (x < 0 || x >= PIC_W) continue
      out.priority[layer.y * PIC_W + x] = layer.margin
      mark(x, layer.y)
    }
  }
  return out
}

export function layerRaster(layer: Layer, room: Room, views: readonly View[]): LayerRaster {
  const view = layer.kind === 'view' ? views.find((v) => v.id === layer.viewId) : undefined
  const key = layer.kind === 'element' ? roomKey(layer, room) : ''
  const hit = cache.get(layer)
  if (hit && hit.key === key && hit.dep === view) return hit.raster
  let raster: LayerRaster
  if (layer.kind === 'element') raster = rasterElement(layer, room)
  else if (layer.kind === 'view') raster = rasterView(layer, view)
  else {
    const r = new Raster().run(layer.commands)
    raster = { visual: r.visual, priority: r.priority, bbox: r.bbox }
  }
  cache.set(layer, { key, dep: view, raster })
  return raster
}

export function composeLayer(layer: Layer, raster: LayerRaster): ComposeLayer {
  if (layer.kind === 'element') {
    const def = getElement(layer.elementId)
    const dp = layer.priority === 'auto' ? (def?.defaultPriority ?? 'baseline') : layer.priority
    return { raster, defaultPriority: dp, anchorY: layer.y, controlOn: layer.controlOn, moodExempt: !!layer.moodExempt }
  }
  if (layer.kind === 'view') {
    return { raster, defaultPriority: 'none', anchorY: layer.y, controlOn: true, moodExempt: !!layer.moodExempt }
  }
  return { raster, defaultPriority: layer.priority, anchorY: layer.baseY, controlOn: true, moodExempt: !!layer.moodExempt }
}

export interface RenderOpts {
  /** Replace a layer's raster (e.g. an animated sprite frame) */
  override?: Map<string, LayerRaster>
  /** Layers to leave out */
  hide?: Set<string>
}

export function renderRoom(room: Room, views: readonly View[], opts: RenderOpts = {}): Composed {
  const layers: ComposeLayer[] = []
  for (const layer of room.layers) {
    if (!layer.visible || opts.hide?.has(layer.id)) continue
    const raster = opts.override?.get(layer.id) ?? layerRaster(layer, room, views)
    layers.push(composeLayer(layer, raster))
  }
  return compose(layers, {
    priorityBase: room.priorityBase,
    mood: MOODS[room.mood]?.map,
    colorSwap: room.colorSwap,
    background: room.background,
  })
}
