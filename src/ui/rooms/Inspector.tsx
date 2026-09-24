import {
  ArrowDown,
  ArrowUp,
  Copy,
  Dices,
  Eye,
  EyeOff,
  FlipHorizontal2,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  RotateCcw,
  Scissors,
  Stamp,
  Trash2,
} from 'lucide-react'
import type { Draft } from 'immer'
import { useState } from 'react'
import { describeCommand } from '../../agi/commands'
import { EGA_NAMES, IDENTITY_MAP } from '../../agi/palette'
import { MOOD_IDS, MOODS } from '../../agi/moods'
import { randomSeed } from '../../agi/rng'
import { getElement } from '../../library'
import { paintLayer } from '../../state/factory'
import { actions, beginGesture, endGesture, useActiveRoom, useApp, useSelectedLayer } from '../../state/store'
import { THEMES, type ElementLayer, type Layer, type MoodId, type PaintLayer, type PriorityMode, type Room, type Theme, type ViewLayer } from '../../state/types'
import { EgaPicker } from '../common/EgaPicker'
import { Field, Select, Slider, Toggle } from '../common/Field'
import { IconButton } from '../common/IconButton'
import { Section } from '../common/Section'
import { explodeLayer } from './paint'
import { loopCelCount } from '../../sprites/edit'
import { RoomsSection } from './RoomsSection'

const PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'rows', label: 'Floor' },
  { value: 'baseline', label: 'Standing' },
  { value: 'none', label: 'None' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 4), label: `Fixed ${i + 4}` })),
]

function parsePriority(v: string): PriorityMode {
  return v === 'rows' || v === 'baseline' || v === 'none' ? v : Number(v)
}

const gesture = { onStart: beginGesture, onEnd: endGesture }

/** Apply the room's color swap to every layer's own colors and reset the swap. */
function bakeColorSwap(r: Draft<Room>): void {
  const swap = r.colorSwap
  for (const l of r.layers) {
    if (l.kind === 'element') {
      const def = getElement(l.elementId)
      if (!def) continue
      for (const [key, role] of Object.entries(def.roles)) l.colorMap[key] = swap[l.colorMap[key] ?? role.color]
    } else if (l.kind === 'paint') {
      for (const c of l.commands) if (c.op === 'visual' && typeof c.color === 'number') c.color = swap[c.color]
    } else {
      const prev = l.recolor ?? IDENTITY_MAP
      l.recolor = prev.map((c) => swap[c])
    }
  }
  r.background = swap[r.background ?? 15]
  r.colorSwap = [...IDENTITY_MAP]
}

function LayerHeader({ layer }: { layer: Layer }) {
  return (
    <div className="mb-1 flex items-center gap-1">
      <input
        type="text"
        className="min-w-0 flex-1"
        value={layer.name}
        aria-label="Layer name"
        data-tip="Layer name"
        onChange={(e) => actions.updateLayer(layer.id, (l) => void (l.name = e.target.value))}
      />
      <IconButton icon={Copy} size="sm" tip="Duplicate" tipKey="⌘D" onClick={() => actions.duplicateLayer(layer.id)} />
      {layer.kind === 'element' && <IconButton icon={Scissors} size="sm" tip="Explode into editable paint commands" onClick={() => explodeLayer(layer)} />}
      <IconButton icon={Trash2} size="sm" danger tip="Delete layer" tipKey="Del" onClick={() => actions.removeLayer(layer.id)} />
    </div>
  )
}

function ElementInspector({ layer }: { layer: ElementLayer }) {
  const def = getElement(layer.elementId)
  const up = (fn: (l: ElementLayer) => void) => actions.updateLayer(layer.id, (l) => fn(l as ElementLayer))
  if (!def) return <div className="text-danger">Missing element {layer.elementId}</div>
  const full = def.span === 'full'
  return (
    <div className="flex flex-col gap-0.5">
      <LayerHeader layer={layer} />
      {def.params.map((spec) => {
        const v = layer.params[spec.key] ?? spec.default
        if (spec.type === 'int')
          return (
            <Slider key={spec.key} label={spec.label} min={spec.min} max={spec.max} step={spec.step ?? 1} value={Number(v)} onChange={(n) => up((l) => void (l.params[spec.key] = n))} {...gesture} />
          )
        if (spec.type === 'select')
          return <Select key={spec.key} label={spec.label} value={String(v)} options={spec.options} onChange={(s) => up((l) => void (l.params[spec.key] = s))} />
        return <Toggle key={spec.key} label={spec.label} value={Boolean(v)} onChange={(b) => up((l) => void (l.params[spec.key] = b))} />
      })}
      <Field label="Variation" tip="Random seed that shapes this element">
        <input type="number" className="w-20" value={layer.seed} onChange={(e) => up((l) => void (l.seed = Number(e.target.value) | 0))} />
        <IconButton icon={Dices} size="sm" tip="New variation" tipKey="R" onClick={() => up((l) => void (l.seed = randomSeed()))} />
      </Field>
      <div className="my-1 border-t border-line" />
      {!full && (
        <Field label="Position">
          <input type="number" className="w-14" value={layer.x} aria-label="X" data-tip="X" onChange={(e) => up((l) => void (l.x = Number(e.target.value) | 0))} />
          <input type="number" className="w-14" value={layer.y} aria-label="Y" data-tip="Y (the row it stands on)" onChange={(e) => up((l) => void (l.y = Number(e.target.value) | 0))} />
          <IconButton icon={FlipHorizontal2} size="sm" active={layer.flipX} tip="Flip horizontally" tipKey="H" onClick={() => up((l) => void (l.flipX = !l.flipX))} />
        </Field>
      )}
      {full && <Slider label="Row" min={0} max={167} value={layer.y} onChange={(n) => up((l) => void (l.y = n))} tip="The row this element is anchored to" {...gesture} />}
      {!full && <Slider label="Scale" min={0.2} max={4} step={0.05} value={layer.scale} onChange={(n) => up((l) => void (l.scale = n))} {...gesture} />}
      {!full && (
        <Toggle
          label="Perspective"
          tip="Shrink toward the horizon (room's far/near scale)"
          value={layer.perspective ?? def.perspective}
          onChange={(b) => up((l) => void (l.perspective = b))}
        />
      )}
      {full && (
        <Toggle label="Mirror" value={layer.flipX} onChange={(b) => up((l) => void (l.flipX = b))} />
      )}
      <Select
        label="Depth"
        tip="Depth: Floor takes the band of each row; Standing puts the whole element at the band of its base; Fixed uses one priority"
        value={layer.priority === 'auto' ? 'auto' : String(layer.priority)}
        options={[{ value: 'auto', label: `Auto · ${PRIORITY_OPTIONS.find((o) => o.value === String(def.defaultPriority))?.label ?? def.defaultPriority}` }, ...PRIORITY_OPTIONS]}
        onChange={(v) => up((l) => void (l.priority = v === 'auto' ? 'auto' : parsePriority(v)))}
      />
      {def.hasControl && (
        <Toggle label="Walls" value={layer.controlOn} tip="Draw this element's walls, triggers and water on the control screen" onChange={(b) => up((l) => void (l.controlOn = b))} />
      )}
      <Toggle label="Ignore mood" value={!!layer.moodExempt} tip="Keep original colors when the room's mood changes (e.g. lit windows at night)" onChange={(b) => up((l) => void (l.moodExempt = b))} />
      <div className="my-1 border-t border-line" />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted">Colors</span>
        {Object.keys(layer.colorMap).length > 0 && (
          <IconButton icon={RotateCcw} size="sm" tip="Reset colors" onClick={() => up((l) => void (l.colorMap = {}))} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-2">
        {Object.entries(def.roles).map(([key, role]) => (
          <div key={key} className="flex h-7 items-center justify-between gap-1">
            <span className="truncate text-[11px] text-muted">{role.label}</span>
            <EgaPicker value={layer.colorMap[key] ?? role.color} tip={role.label} onChange={(c) => up((l) => void (l.colorMap[key] = c))} />
          </div>
        ))}
      </div>
    </div>
  )
}

function PaintInspector({ layer }: { layer: PaintLayer }) {
  const up = (fn: (l: PaintLayer) => void) => actions.updateLayer(layer.id, (l) => fn(l as PaintLayer))
  const [showCmds, setShowCmds] = useState(false)
  return (
    <div className="flex flex-col gap-0.5">
      <LayerHeader layer={layer} />
      <Select
        label="Depth"
        tip="Priority for pixels drawn without an explicit priority"
        value={String(layer.priority)}
        options={PRIORITY_OPTIONS}
        onChange={(v) => up((l) => void (l.priority = parsePriority(v)))}
      />
      {layer.priority === 'baseline' && <Slider label="Base row" min={0} max={167} value={layer.baseY} onChange={(n) => up((l) => void (l.baseY = n))} {...gesture} />}
      <Toggle label="Ignore mood" value={!!layer.moodExempt} onChange={(b) => up((l) => void (l.moodExempt = b))} />
      <button type="button" className="mt-1 text-left text-[11px] text-muted hover:text-text" onClick={() => setShowCmds(!showCmds)}>
        {showCmds ? '▾' : '▸'} Commands · {layer.commands.length}
      </button>
      {showCmds && (
        <div className="max-h-56 overflow-y-auto rounded border border-line">
          {layer.commands.map((c, i) => (
            <div key={i} className="group flex h-6 items-center gap-1 border-b border-line px-1 last:border-0">
              <span className="w-6 text-right text-[10px] text-muted">{i + 1}</span>
              <span className="flex-1 truncate text-[11px]">{describeCommand(c)}</span>
              <span className="opacity-0 group-hover:opacity-100">
                <IconButton icon={Trash2} size="sm" tip="Delete command" onClick={() => up((l) => void l.commands.splice(i, 1))} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ViewInspector({ layer }: { layer: ViewLayer }) {
  const views = useApp((s) => s.project.views)
  const view = views.find((v) => v.id === layer.viewId)
  const up = (fn: (l: ViewLayer) => void) => actions.updateLayer(layer.id, (l) => fn(l as ViewLayer))
  return (
    <div className="flex flex-col gap-0.5">
      <LayerHeader layer={layer} />
      <Select label="Sprite" value={layer.viewId} options={views.map((v) => ({ value: v.id, label: v.name }))} onChange={(v) => up((l) => void (l.viewId = v))} />
      {view && (
        <>
          <Slider label="Loop" min={0} max={Math.max(0, view.loops.length - 1)} value={layer.loop} onChange={(n) => up((l) => void (l.loop = n))} {...gesture} />
          <Slider label="Cel" min={0} max={Math.max(0, (view.loops[layer.loop] ? loopCelCount(view, view.loops[layer.loop]) : 1) - 1)} value={layer.cel} onChange={(n) => up((l) => void (l.cel = n))} {...gesture} />
        </>
      )}
      <Field label="Position">
        <input type="number" className="w-14" value={layer.x} aria-label="X" data-tip="Left edge" onChange={(e) => up((l) => void (l.x = Number(e.target.value) | 0))} />
        <input type="number" className="w-14" value={layer.y} aria-label="Y" data-tip="Bottom row" onChange={(e) => up((l) => void (l.y = Number(e.target.value) | 0))} />
      </Field>
      <Select
        label="Depth"
        value={String(layer.priority)}
        options={PRIORITY_OPTIONS.filter((o) => o.value !== 'rows' && o.value !== 'none')}
        onChange={(v) => up((l) => void (l.priority = v === 'baseline' ? 'baseline' : Number(v)))}
      />
      <Select
        label="Base line"
        tip="Control line drawn under the sprite, like AGI add.to.pic margins"
        value={layer.margin === null ? 'none' : String(layer.margin)}
        options={[
          { value: 'none', label: 'None' },
          { value: '0', label: 'Wall' },
          { value: '1', label: 'Conditional wall' },
          { value: '2', label: 'Trigger' },
          { value: '3', label: 'Water' },
        ]}
        onChange={(v) => up((l) => void (l.margin = v === 'none' ? null : (Number(v) as 0 | 1 | 2 | 3)))}
      />
      <Toggle label="Animate" value={layer.animate} tip="Play this sprite's animation in Test Walk" onChange={(b) => up((l) => void (l.animate = b))} />
    </div>
  )
}

function LayersSection() {
  const room = useActiveRoom()
  const selectedId = useApp((s) => s.selectedLayerId)
  const setUi = useApp((s) => s.setUi)
  const [dragId, setDragId] = useState<string | null>(null)
  const layers = [...room.layers].reverse()
  return (
    <Section
      id="layers"
      title={`Layers · ${room.layers.length}`}
      actions={
        <>
          <IconButton icon={ArrowUp} size="sm" tip="Bring forward" tipKey="⌘]" disabled={!selectedId} onClick={() => selectedId && actions.moveLayer(selectedId, 1)} />
          <IconButton icon={ArrowDown} size="sm" tip="Send backward" tipKey="⌘[" disabled={!selectedId} onClick={() => selectedId && actions.moveLayer(selectedId, -1)} />
          <IconButton icon={Plus} size="sm" tip="New paint layer" onClick={() => actions.addLayer(paintLayer('Paint'))} />
        </>
      }
    >
      <div className="flex max-h-[42vh] flex-col overflow-y-auto">
        {layers.map((l) => {
          const index = room.layers.indexOf(l)
          return (
            <div
              key={l.id}
              draggable
              onDragStart={(e) => {
                setDragId(l.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', l.id)
              }}
              onDragOver={(e) => dragId && e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId && dragId !== l.id) actions.reorderLayer(dragId, index)
                setDragId(null)
              }}
              onDragEnd={() => setDragId(null)}
              onClick={() => setUi({ selectedLayerId: l.id })}
              className={`group flex h-7 cursor-default items-center gap-1 rounded px-1 ${l.id === selectedId ? 'bg-line shadow-[inset_2px_0_0_var(--color-accent)]' : 'hover:bg-line'} ${dragId === l.id ? 'text-muted' : ''}`}
            >
              <button
                type="button"
                className="text-muted hover:text-text"
                data-tip={l.visible ? 'Hide' : 'Show'}
                aria-label={l.visible ? 'Hide layer' : 'Show layer'}
                onClick={(e) => {
                  e.stopPropagation()
                  actions.updateLayer(l.id, (x) => void (x.visible = !x.visible))
                }}
              >
                {l.visible ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
              <span className={`flex-1 truncate text-[12px] ${l.visible ? '' : 'text-muted'}`}>
                {l.kind === 'paint' && <Pencil size={10} className="mr-1 inline text-muted" />}
                {l.name}
              </span>
              <button
                type="button"
                className={`${l.locked ? 'text-accent' : 'text-muted opacity-0 group-hover:opacity-100'} hover:text-text`}
                data-tip={l.locked ? 'Unlock' : 'Lock'}
                aria-label={l.locked ? 'Unlock layer' : 'Lock layer'}
                onClick={(e) => {
                  e.stopPropagation()
                  actions.updateLayer(l.id, (x) => void (x.locked = !x.locked))
                }}
              >
                {l.locked ? <Lock size={12} /> : <LockOpen size={12} />}
              </button>
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function RoomSection() {
  const room = useActiveRoom()
  const up = actions.updateRoom
  const swapped = room.colorSwap.some((c, i) => c !== i)
  return (
    <Section id="room" title="Room" defaultOpen={false}>
      <div className="flex flex-col gap-0.5">
        <Field label="Name">
          <input type="text" className="min-w-0 flex-1" value={room.name} onChange={(e) => up((r) => void (r.name = e.target.value))} />
        </Field>
        <Select label="Theme" value={room.theme} options={THEMES.map((t) => ({ value: t.id, label: t.label }))} onChange={(v) => up((r) => void (r.theme = v as Theme))} />
        <Field label="Background" tip="Color where nothing is drawn (AGI pictures start white)">
          <EgaPicker value={room.background ?? 15} tip="Background" onChange={(c) => up((r) => void (r.background = c))} />
        </Field>
        <Select label="Mood" tip="Recolors the whole room" value={room.mood} options={MOOD_IDS.map((m) => ({ value: m, label: MOODS[m].label }))} onChange={(v) => up((r) => void (r.mood = v as MoodId))} />
        <Slider label="Horizon" tip="Characters can't walk above this row" min={0} max={160} value={room.horizon} onChange={(n) => up((r) => void (r.horizon = n))} {...gesture} />
        <Slider label="Priority base" tip="Row where depth band 5 starts; bands below split the rest of the picture" min={0} max={150} value={room.priorityBase} onChange={(n) => up((r) => void (r.priorityBase = n))} {...gesture} />
        <Slider label="Far scale" tip="Size of perspective elements at the horizon" min={0.2} max={1.5} step={0.05} value={room.perspective.far} onChange={(n) => up((r) => void (r.perspective.far = n))} {...gesture} />
        <Slider label="Near scale" tip="Size of perspective elements at the bottom edge" min={0.4} max={2} step={0.05} value={room.perspective.near} onChange={(n) => up((r) => void (r.perspective.near = n))} {...gesture} />
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[11px] text-muted" data-tip="Swap any color for another across the whole room">
            Color swap
          </span>
          {swapped && (
            <span className="flex">
              <IconButton icon={Stamp} size="sm" tip="Bake the swap into each layer's colors, then reset it" onClick={() => up(bakeColorSwap)} />
              <IconButton icon={RotateCcw} size="sm" tip="Reset color swap" onClick={() => up((r) => void (r.colorSwap = [...IDENTITY_MAP]))} />
            </span>
          )}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {room.colorSwap.map((to, from) => (
            <EgaPicker key={from} value={to} tip={`${EGA_NAMES[from]} →`} onChange={(c) => up((r) => void (r.colorSwap[from] = c))} />
          ))}
        </div>
      </div>
    </Section>
  )
}

export function Inspector() {
  const layer = useSelectedLayer()
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {layer && (
        <Section id="layer" title={layer.kind === 'element' ? 'Element' : layer.kind === 'paint' ? 'Paint layer' : 'Sprite'}>
          <div className="pr-1">
            {layer.kind === 'element' && <ElementInspector layer={layer} />}
            {layer.kind === 'paint' && <PaintInspector layer={layer} />}
            {layer.kind === 'view' && <ViewInspector layer={layer} />}
          </div>
        </Section>
      )}
      <LayersSection />
      <RoomSection />
      <RoomsSection />
    </div>
  )
}
