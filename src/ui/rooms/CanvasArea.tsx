import {
  Brush,
  Droplet,
  Eye,
  EyeOff,
  Grid3x3,
  Image as ImageIcon,
  Maximize,
  ImagePlus,
  Minus,
  MousePointer2,
  PaintBucket,
  Pipette,
  Plus,
  Rows3,
  Slash,
  SplitSquareHorizontal,
  Sunset,
  Waypoints,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { EGA_NAMES } from '../../agi/palette'
import { bandForY } from '../../agi/priority'
import { useApp, type Screen, type Tool } from '../../state/store'
import { EgaGrid, Swatch } from '../common/EgaPicker'
import { Segmented } from '../common/Field'
import { IconButton } from '../common/IconButton'
import { RoomCanvas, useHover } from './RoomCanvas'

const TOOLS: { id: Tool; icon: typeof Brush; tip: string; key: string }[] = [
  { id: 'select', icon: MousePointer2, tip: 'Select and move (Alt-click to pick what is underneath)', key: 'V' },
  { id: 'line', icon: Slash, tip: 'Line — click points, double-click or Enter to finish', key: 'L' },
  { id: 'step', icon: Waypoints, tip: 'Step line — horizontal and vertical steps, like AGI corner lines', key: 'K' },
  { id: 'fill', icon: PaintBucket, tip: 'Fill the one-color area you click (as seen in this layer and below)', key: 'F' },
  { id: 'pen', icon: Brush, tip: 'Pen — AGI brush plots; drag to paint', key: 'B' },
  { id: 'picker', icon: Pipette, tip: 'Pick a color or priority from the picture', key: 'I' },
]

const CONTROL_NAMES = ['Wall', 'Conditional wall', 'Trigger', 'Water', 'Clear control']
const CONTROL_SWATCH = [15, 9, 10, 11, 8]

function Popover({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-30" onPointerDown={onClose} />
      <div className="absolute top-9 left-0 z-40 rounded border border-line bg-panel p-2 shadow-modal">{children}</div>
    </>
  )
}

function PaintOptions() {
  const s = useApp(
    useShallow((st) => ({
      paintTarget: st.paintTarget,
      paintColor: st.paintColor,
      paintPriority: st.paintPriority,
      paintControl: st.paintControl,
      pen: st.pen,
      tool: st.tool,
      setUi: st.setUi,
    })),
  )
  const [open, setOpen] = useState(false)
  const swatch = s.paintTarget === 'visual' ? s.paintColor : s.paintTarget === 'priority' ? s.paintPriority : CONTROL_SWATCH[s.paintControl]
  const tip =
    s.paintTarget === 'visual'
      ? `Paint color: ${EGA_NAMES[s.paintColor]}`
      : s.paintTarget === 'priority'
        ? `Priority ${s.paintPriority}`
        : `Control: ${CONTROL_NAMES[s.paintControl]}`
  return (
    <div className="relative flex items-center gap-1">
      <Swatch color={swatch} size={20} tip={tip} onClick={() => setOpen(!open)} />
      {open && (
        <Popover onClose={() => setOpen(false)}>
          <div className="flex w-[220px] flex-col gap-2">
            <Segmented
              value={s.paintTarget}
              onChange={(v) => s.setUi({ paintTarget: v })}
              options={[
                { value: 'visual', label: 'Visual', tip: 'Paint on the visual screen' },
                { value: 'priority', label: 'Priority', tip: 'Paint depth on the priority screen' },
                { value: 'control', label: 'Control', tip: 'Paint walls, triggers and water' },
              ]}
            />
            {s.paintTarget === 'visual' && <EgaGrid value={s.paintColor} onPick={(c) => s.setUi({ paintColor: c })} size={22} />}
            {s.paintTarget === 'priority' && (
              <div className="grid grid-cols-6 gap-1">
                {Array.from({ length: 12 }, (_, i) => i + 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    data-tip={`Priority ${p}`}
                    onClick={() => s.setUi({ paintPriority: p })}
                    className={`h-6 rounded-sm border text-[11px] ${p === s.paintPriority ? 'border-accent text-accent' : 'border-line text-text'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
            {s.paintTarget === 'control' && (
              <div className="grid grid-cols-2 gap-1">
                {CONTROL_NAMES.map((n, i) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => s.setUi({ paintControl: i as 0 | 1 | 2 | 3 | 4 })}
                    data-tip={i === 4 ? 'Erase walls, triggers and water drawn by layers below' : undefined}
                    className={`flex h-7 items-center gap-1.5 rounded-sm border px-1.5 text-[11px] ${i === s.paintControl ? 'border-accent' : 'border-line'}`}
                  >
                    <Swatch color={CONTROL_SWATCH[i]} size={12} tip={n} />
                    {n}
                  </button>
                ))}
              </div>
            )}
            {s.tool === 'pen' && (
              <div className="flex flex-col gap-1 border-t border-line pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-10 text-[11px] text-muted">Size</span>
                  <input type="range" min={0} max={7} value={s.pen.size} className="flex-1" onChange={(e) => s.setUi({ pen: { ...s.pen, size: Number(e.target.value) } })} />
                  <span className="w-4 text-right">{s.pen.size}</span>
                </div>
                <Segmented
                  value={`${s.pen.shape}${s.pen.splatter ? '-s' : ''}`}
                  onChange={(v) => s.setUi({ pen: { ...s.pen, shape: v.startsWith('square') ? 'square' : 'circle', splatter: v.endsWith('-s') } })}
                  options={[
                    { value: 'circle', label: 'Circle', tip: 'Solid circle pen' },
                    { value: 'square', label: 'Square', tip: 'Solid square pen' },
                    { value: 'circle-s', label: 'Spray', tip: 'Circle splatter pen' },
                    { value: 'square-s', label: 'Spray □', tip: 'Square splatter pen' },
                  ]}
                />
              </div>
            )}
          </div>
        </Popover>
      )}
    </div>
  )
}

function TraceButton() {
  const trace = useApp((s) => s.trace)
  const setUi = useApp((s) => s.setUi)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          if (trace.url) URL.revokeObjectURL(trace.url)
          setUi({ trace: { ...trace, url: URL.createObjectURL(f), visible: true } })
          e.target.value = ''
        }}
      />
      <IconButton icon={ImagePlus} tip="Tracing image (reference only, never exported)" active={!!trace.url && trace.visible} onClick={() => (trace.url ? setOpen(!open) : input.current?.click())} />
      {open && trace.url && (
        <Popover onClose={() => setOpen(false)}>
          <div className="flex w-48 items-center gap-1">
            <IconButton icon={trace.visible ? Eye : EyeOff} size="sm" tip={trace.visible ? 'Hide tracing image' : 'Show tracing image'} onClick={() => setUi({ trace: { ...trace, visible: !trace.visible } })} />
            <input type="range" className="flex-1" min={0.05} max={1} step={0.05} value={trace.opacity} data-tip="Opacity" onChange={(e) => setUi({ trace: { ...trace, opacity: Number(e.target.value) } })} />
            <IconButton icon={ImageIcon} size="sm" tip="Choose another image" onClick={() => input.current?.click()} />
            <IconButton
              icon={X}
              size="sm"
              tip="Remove tracing image"
              onClick={() => {
                URL.revokeObjectURL(trace.url!)
                setUi({ trace: { ...trace, url: null } })
                setOpen(false)
              }}
            />
          </div>
        </Popover>
      )}
    </div>
  )
}

function StatusBar() {
  const hover = useHover((h) => h.hover)
  const priorityBase = useApp((s) => (s.project.rooms.find((r) => r.id === s.activeRoomId) ?? s.project.rooms[0]).priorityBase)
  const horizon = useApp((s) => (s.project.rooms.find((r) => r.id === s.activeRoomId) ?? s.project.rooms[0]).horizon)
  if (!hover) return <div className="h-6" />
  const p = hover.priority
  const ctrl = p < 4 ? CONTROL_NAMES[p] : null

  return (
    <div className="flex h-6 items-center gap-3 text-[11px] text-muted">
      <span>
        {hover.x}, {hover.y}
      </span>
      <span className="flex items-center gap-1">
        <Swatch color={hover.visual} size={10} />
        {EGA_NAMES[hover.visual]}
      </span>
      <span>{ctrl ? <span className="text-accent">{ctrl}</span> : `Priority ${p}`}</span>
      <span>Band {bandForY(hover.y, priorityBase)}</span>
      {hover.y <= horizon && <span>Above horizon</span>}
    </div>
  )
}

/** Largest zoom (in half steps) that fits the picture in a box. */
export function useFitZoom(pad = 56, extraH = 24) {
  const ref = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(2)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth - pad
      const h = el.clientHeight - pad - extraH
      const z = Math.floor(Math.min(w / 320, h / 168) * 2) / 2
      setFit(Math.max(0.5, Math.min(6, z)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [pad, extraH])
  return [ref, fit] as const
}

export function CanvasArea() {
  const s = useApp(
    useShallow((st) => ({ tool: st.tool, screen: st.screen, guides: st.guides, zoom: st.zoom, zoomFit: st.zoomFit, setUi: st.setUi })),
  )
  const [areaRef, fit] = useFitZoom()
  useEffect(() => {
    useApp.getState().setUi({ fitZoom: fit })
  }, [fit])
  const zoom = s.zoomFit ? fit : s.zoom
  const setZoom = (z: number) => s.setUi({ zoom: Math.max(0.5, Math.min(6, z)), zoomFit: false })
  const toggleGuide = (k: keyof typeof s.guides) => s.setUi({ guides: { ...s.guides, [k]: !s.guides[k] } })
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-1 px-7">
        <div className="flex items-center gap-0.5 rounded-md border border-line bg-panel p-0.5 shadow-panel">
          {TOOLS.map((t) => (
            <IconButton key={t.id} icon={t.icon} tip={t.tip} tipKey={t.key} active={s.tool === t.id} onClick={() => s.setUi({ tool: t.id })} />
          ))}
          <div className="mx-1 h-5 w-px bg-line" />
          <PaintOptions />
          <div className="w-1" />
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 rounded-md border border-line bg-panel p-0.5 shadow-panel">
          {(
            [
              { id: 'visual', icon: ImageIcon, tip: 'Visual screen', key: '1' },
              { id: 'priority', icon: Rows3, tip: 'Priority screen (depth)', key: '2' },
              { id: 'control', icon: Droplet, tip: 'Control screen (walls, triggers, water)', key: '3' },
              { id: 'overlay', icon: SplitSquareHorizontal, tip: 'Visual and priority blended', key: '4' },
            ] as { id: Screen; icon: typeof Brush; tip: string; key: string }[]
          ).map((o) => (
            <IconButton key={o.id} icon={o.icon} tip={o.tip} tipKey={o.key} active={s.screen === o.id} onClick={() => s.setUi({ screen: o.id })} />
          ))}
          <div className="mx-1 h-5 w-px bg-line" />
          <IconButton icon={Sunset} tip="Horizon guide" active={s.guides.horizon} onClick={() => toggleGuide('horizon')} />
          <IconButton icon={Rows3} tip="Priority band guides" active={s.guides.bands} onClick={() => toggleGuide('bands')} />
          <IconButton icon={Grid3x3} tip="Grid" tipKey="G" active={s.guides.grid} onClick={() => toggleGuide('grid')} />
          <TraceButton />
          <div className="mx-1 h-5 w-px bg-line" />
          <IconButton icon={Minus} tip="Zoom out" tipKey="−" disabled={zoom <= 0.5} onClick={() => setZoom(zoom - 0.5)} />
          <span className="w-8 text-center text-[11px] text-muted" data-tip="Zoom">
            {zoom}×
          </span>
          <IconButton icon={Plus} tip="Zoom in" tipKey="+" disabled={zoom >= 6} onClick={() => setZoom(zoom + 0.5)} />
          <IconButton icon={Maximize} tip="Fit to window" tipKey="0" active={s.zoomFit} onClick={() => s.setUi({ zoomFit: !s.zoomFit, zoom })} />
        </div>
      </div>
      <div ref={areaRef} className="flex min-h-0 flex-1 overflow-auto">
        <div className="m-auto p-6">
          <RoomCanvas zoom={zoom} />
          <StatusBar />
        </div>
      </div>
    </div>
  )
}
