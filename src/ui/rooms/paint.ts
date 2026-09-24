import type { PicCommand, PriorityRef, Pt } from '../../agi/commands'
import { getElement } from '../../library'
import { resolveRoles, roleResolver, runElement } from '../../library/run'
import { paintLayer, uid } from '../../state/factory'
import { actions, activeRoom, selectedLayer, useApp } from '../../state/store'
import type { ElementLayer, PaintLayer } from '../../state/types'

/** Current visual/priority/pen state at the end of a command list. */
function endState(cmds: readonly PicCommand[]) {
  let visual: number | null = null
  let priority: PriorityRef | null = null
  let pen = ''
  for (const c of cmds) {
    if (c.op === 'visual') visual = typeof c.color === 'number' ? c.color : c.color === null ? null : -1
    if (c.op === 'priority') priority = c.value
    if (c.op === 'pen') pen = `${c.size}${c.shape}${c.splatter}`
  }
  return { visual, priority, pen }
}

/** State commands needed so the next drawing uses the current paint settings. */
export function stateCommands(cmds: readonly PicCommand[], withPen = false): PicCommand[] {
  const s = useApp.getState()
  const cur = endState(cmds)
  const out: PicCommand[] = []
  const wantVisual = s.paintTarget === 'visual' ? s.paintColor : null
  const wantPriority: PriorityRef | null =
    s.paintTarget === 'priority' ? s.paintPriority : s.paintTarget === 'control' ? (s.paintControl === 4 ? 'clear' : s.paintControl) : null
  if (cur.visual !== wantVisual) out.push({ op: 'visual', color: wantVisual })
  if (cur.priority !== wantPriority) out.push({ op: 'priority', value: wantPriority })
  if (withPen) {
    const { size, shape, splatter } = s.pen
    if (cur.pen !== `${size}${shape}${splatter}`) out.push({ op: 'pen', size, shape, splatter })
  }
  return out
}

/** The paint layer to draw into: the selected one, or a new one on top. */
export function ensurePaintLayer(): PaintLayer {
  const sel = selectedLayer()
  if (sel && sel.kind === 'paint' && !sel.locked) return sel
  const layer = paintLayer('Paint')
  actions.addLayer(layer)
  return layer
}

export function appendToLayer(id: string, cmds: PicCommand[]): void {
  if (!cmds.length) return
  actions.updateLayer(id, (l) => {
    if (l.kind === 'paint') l.commands.push(...(cmds as typeof l.commands))
  })
}

export function translateCommands(cmds: readonly PicCommand[], dx: number, dy: number): PicCommand[] {
  const mv = (p: Pt): Pt => [p[0] + dx, p[1] + dy]
  return cmds.map((c) => {
    switch (c.op) {
      case 'line':
      case 'fill':
      case 'plot':
        return { ...c, pts: c.pts.map(mv) }
      case 'xcorner':
        return { ...c, start: mv(c.start), steps: c.steps.map((v, i) => v + (i % 2 === 0 ? dx : dy)) }
      case 'ycorner':
        return { ...c, start: mv(c.start), steps: c.steps.map((v, i) => v + (i % 2 === 0 ? dy : dx)) }
      default:
        return c
    }
  })
}

/** Turn an element into a hand-editable paint layer with the same pixels. */
export function explodeLayer(layer: ElementLayer): void {
  const def = getElement(layer.elementId)
  if (!def) return
  const room = activeRoom()
  let cmds = resolveRoles(runElement(def, layer, room), roleResolver(def, layer.colorMap))
  if (!layer.controlOn) {
    // drop control drawing: remove priority 0–3 sections
    const out: PicCommand[] = []
    let ctrl = false
    for (const c of cmds) {
      if (c.op === 'priority') ctrl = typeof c.value === 'number' && c.value < 4
      if (!ctrl || c.op === 'priority' || c.op === 'visual' || c.op === 'pen') out.push(c)
    }
    cmds = out
  }
  const dp = layer.priority === 'auto' ? def.defaultPriority : layer.priority
  const idx = room.layers.findIndex((l) => l.id === layer.id)
  const paint: PaintLayer = {
    id: uid('layer'),
    kind: 'paint',
    name: `${layer.name} (paint)`,
    visible: layer.visible,
    locked: false,
    moodExempt: layer.moodExempt,
    commands: cmds,
    priority: dp,
    baseY: layer.y,
  }
  actions.updateRoom((r) => {
    r.layers.splice(idx, 1, paint as (typeof r.layers)[number])
  })
  useApp.setState({ selectedLayerId: paint.id })
}
