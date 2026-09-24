import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Eraser,
  FlipHorizontal2,
  Grid3x3,
  Layers,
  Minus,
  PaintBucket,
  Pause,
  Pencil,
  Pipette,
  Play,
  Plus,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EGA_HEX, EGA_NAMES } from '../../agi/palette'
import { BUILTIN_VIEWS } from '../../sprites/library'
import { blankCel, cloneView, floodCel, loopCelCount, mirrorCel, newView, resizeCel } from '../../sprites/edit'
import { roleColor } from '../../sprites/render'
import { ROLE_SLOT_BASE, SPRITE_T, type View } from '../../sprites/types'
import { actions, beginGesture, endGesture, useApp } from '../../state/store'
import { THEMES, type Theme } from '../../state/types'
import { EgaPicker, Swatch } from '../common/EgaPicker'
import { Field, Select, Slider } from '../common/Field'
import { IconButton } from '../common/IconButton'
import { Section } from '../common/Section'
import { SidePanel } from '../common/SidePanel'
import { UI } from '../tokens'
import { CelView, LoopPreview } from './CelView'
import { DND_VIEW } from '../rooms/RoomCanvas'

type SpriteTool = 'pencil' | 'eraser' | 'fill' | 'picker'

function useActiveView(): View | null {
  return useApp((s) => s.project.views.find((v) => v.id === s.activeViewId) ?? null)
}

// ---------------------------------------------------------------- left panel

function SpriteList() {
  const views = useApp((s) => s.project.views)
  const activeId = useApp((s) => s.activeViewId)
  const [theme, setTheme] = useState<Theme | 'all'>('all')
  const builtins = BUILTIN_VIEWS.filter((v) => theme === 'all' || v.theme === theme)
  const thumbLoop = (v: View) => (v.loops.length > 2 ? 2 : 0)
  return (
    <div className="flex h-full flex-col">
      <Section
        id="sprites-project"
        title={`Project sprites · ${views.length}`}
        actions={<IconButton icon={Plus} size="sm" tip="New blank sprite" onClick={() => actions.addView(newView(`Sprite ${views.length + 1}`))} />}
      >
        <div className="grid max-h-64 grid-cols-3 gap-1.5 overflow-y-auto">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              draggable
              onDragStart={(e) => e.dataTransfer.setData(DND_VIEW, v.id)}
              data-tip={v.name}
              onClick={() => useApp.getState().setUi({ activeViewId: v.id, spriteLoop: 0, spriteCel: 0 })}
              className={`flex h-16 items-center justify-center rounded border bg-bg ${v.id === activeId ? 'border-accent' : 'border-line hover:border-muted'}`}
            >
              <CelView view={v} loop={thumbLoop(v)} cel={0} box={52} />
            </button>
          ))}
        </div>
      </Section>
      <Section id="sprites-library" title={`Library · ${builtins.length}`} grow>
        <select className="mb-2 w-full" value={theme} onChange={(e) => setTheme(e.target.value as Theme | 'all')} data-tip="Theme">
          <option value="all">All themes</option>
          {THEMES.filter((t) => t.id !== 'nature').map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-1.5">
          {builtins.map((v) => (
            <button
              key={v.id}
              type="button"
              data-tip={`Add ${v.name} to the project`}
              onClick={() => actions.addView(cloneView(v))}
              className="flex h-16 items-center justify-center rounded border border-line bg-bg hover:border-accent"
            >
              <CelView view={v} loop={thumbLoop(v)} cel={0} box={52} />
            </button>
          ))}
        </div>
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------- editor

function PixelEditor({ view, tool, onion, grid, zoom }: { view: View; tool: SpriteTool; onion: boolean; grid: boolean; zoom: number }) {
  const loopIdx = useApp((s) => s.spriteLoop)
  const celIdx = useApp((s) => s.spriteCel)
  const color = useApp((s) => s.spriteColor)
  const setUi = useApp((s) => s.setUi)
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<{ last: [number, number] } | null>(null)
  const loop = view.loops[loopIdx]
  const mirrored = loop?.mirrorOf !== undefined
  const src = mirrored ? view.loops[loop!.mirrorOf!] : loop
  const cel = src?.cels[celIdx]
  const px = zoom

  useEffect(() => {
    const cv = ref.current
    if (!cv || !cel) return
    const dpr = window.devicePixelRatio || 1
    const W = cel.w * px * 2
    const H = cel.h * px
    cv.width = W * dpr
    cv.height = H * dpr
    cv.style.width = `${W}px`
    cv.style.height = `${H}px`
    const ctx = cv.getContext('2d')!
    ctx.scale(dpr, dpr)
    // transparent checker from UI tones
    for (let y = 0; y < cel.h; y++) {
      for (let x = 0; x < cel.w; x++) {
        ctx.fillStyle = (x + y) % 2 ? UI.bg : UI.panel
        ctx.fillRect(x * px * 2, y * px, px * 2, px)
      }
    }
    const value = (c: typeof cel, x: number, y: number) => {
      const sx = mirrored ? c.w - 1 - x : x
      const v = c.pixels[y * c.w + sx]
      if (v === SPRITE_T) return SPRITE_T
      return v >= ROLE_SLOT_BASE ? roleColor(view, v - ROLE_SLOT_BASE) : v
    }
    if (onion && celIdx > 0) {
      const prev = src!.cels[celIdx - 1]
      ctx.globalAlpha = 0.28
      for (let y = 0; y < Math.min(prev.h, cel.h); y++)
        for (let x = 0; x < Math.min(prev.w, cel.w); x++) {
          const v = value(prev, x, y)
          if (v === SPRITE_T) continue
          ctx.fillStyle = EGA_HEX[v]
          ctx.fillRect(x * px * 2, y * px, px * 2, px)
        }
      ctx.globalAlpha = 1
    }
    for (let y = 0; y < cel.h; y++) {
      for (let x = 0; x < cel.w; x++) {
        const v = value(cel, x, y)
        if (v === SPRITE_T) continue
        ctx.fillStyle = EGA_HEX[v]
        ctx.fillRect(x * px * 2, y * px, px * 2, px)
      }
    }
    if (grid && px >= 6) {
      ctx.strokeStyle = UI.line
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = 1; x < cel.w; x++) {
        ctx.moveTo(x * px * 2 + 0.5, 0)
        ctx.lineTo(x * px * 2 + 0.5, H)
      }
      for (let y = 1; y < cel.h; y++) {
        ctx.moveTo(0, y * px + 0.5)
        ctx.lineTo(W, y * px + 0.5)
      }
      ctx.stroke()
    }
  }, [view, cel, celIdx, src, mirrored, onion, grid, px])

  if (!loop || !cel) return null

  const at = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect()
    return [Math.floor((e.clientX - r.left) / (px * 2)), Math.floor((e.clientY - r.top) / px)]
  }
  const setPixels = (pts: [number, number][], v: number) => {
    actions.updateView(view.id, (d) => {
      const c = d.loops[loopIdx].cels[celIdx]
      for (const [x, y] of pts) if (x >= 0 && y >= 0 && x < c.w && y < c.h) c.pixels[y * c.w + x] = v
    })
  }
  const line = (a: [number, number], b: [number, number]): [number, number][] => {
    const out: [number, number][] = []
    const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1)
    for (let i = 0; i <= n; i++) out.push([Math.round(a[0] + ((b[0] - a[0]) * i) / n), Math.round(a[1] + ((b[1] - a[1]) * i) / n)])
    return out
  }
  const down = (e: React.PointerEvent) => {
    if (mirrored) return
    const p = at(e)
    if (p[0] < 0 || p[1] < 0 || p[0] >= cel.w || p[1] >= cel.h) return
    if (tool === 'picker') {
      setUi({ spriteColor: cel.pixels[p[1] * cel.w + p[0]] })
      return
    }
    if (tool === 'fill') {
      actions.updateView(view.id, (d) => {
        const c = d.loops[loopIdx].cels[celIdx]
        c.pixels = floodCel(c, p[0], p[1], color)
      })
      return
    }
    beginGesture()
    setPixels([p], tool === 'eraser' ? SPRITE_T : color)
    drawing.current = { last: p }
    ref.current!.setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const p = at(e)
    setPixels(line(drawing.current.last, p), tool === 'eraser' ? SPRITE_T : color)
    drawing.current.last = p
  }
  const up = () => {
    if (!drawing.current) return
    drawing.current = null
    endGesture()
  }
  return (
    <canvas
      ref={ref}
      className="pixel shadow-panel"
      style={{ cursor: mirrored ? 'not-allowed' : tool === 'picker' ? 'copy' : 'crosshair' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    />
  )
}

function SpriteCenter() {
  const view = useActiveView()
  const color = useApp((s) => s.spriteColor)
  const setUi = useApp((s) => s.setUi)
  const [tool, setTool] = useState<SpriteTool>('pencil')
  const [onion, setOnion] = useState(true)
  const [grid, setGrid] = useState(true)
  const [zoom, setZoom] = useState(10)

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || e.metaKey || e.ctrlKey) return
      const map: Record<string, SpriteTool> = { b: 'pencil', e: 'eraser', f: 'fill', i: 'picker' }
      if (map[e.key]) setTool(map[e.key])
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  if (!view) {
    return <div className="flex flex-1 items-center justify-center" />
  }
  const tools: { id: SpriteTool; icon: typeof Pencil; tip: string; key: string }[] = [
    { id: 'pencil', icon: Pencil, tip: 'Pencil', key: 'B' },
    { id: 'eraser', icon: Eraser, tip: 'Eraser (transparent)', key: 'E' },
    { id: 'fill', icon: PaintBucket, tip: 'Fill', key: 'F' },
    { id: 'picker', icon: Pipette, tip: 'Pick color', key: 'I' },
  ]
  const colorTip =
    color === SPRITE_T ? 'Transparent' : color >= ROLE_SLOT_BASE ? `Role: ${view.roles[color - ROLE_SLOT_BASE]?.label ?? '?'}` : EGA_NAMES[color]
  const shown = color === SPRITE_T ? 0 : color >= ROLE_SLOT_BASE ? roleColor(view, color - ROLE_SLOT_BASE) : color
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-1 px-7">
        <div className="flex items-center gap-0.5 rounded-md border border-line bg-panel p-0.5 shadow-panel">
          {tools.map((t) => (
            <IconButton key={t.id} icon={t.icon} tip={t.tip} tipKey={t.key} active={tool === t.id} onClick={() => setTool(t.id)} />
          ))}
          <div className="mx-1 h-5 w-px bg-line" />
          <Swatch color={shown} size={20} tip={`Drawing with: ${colorTip}`} />
          <div className="w-1" />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-line bg-panel p-1 shadow-panel">
          {EGA_HEX.map((_, i) => (
            <Swatch key={i} color={i} size={16} selected={color === i} onClick={() => setUi({ spriteColor: i })} />
          ))}
          {view.roles.length > 0 && <div className="mx-1 h-5 w-px bg-line" />}
          {view.roles.map((r, k) => (
            <button
              key={r.key}
              type="button"
              data-tip={`Role: ${r.label} (recolorable)`}
              onClick={() => setUi({ spriteColor: ROLE_SLOT_BASE + k })}
              className={`h-4 w-4 rounded-sm border ${color === ROLE_SLOT_BASE + k ? 'border-accent outline outline-1 outline-accent' : 'border-line'}`}
              style={{ background: EGA_HEX[roleColor(view, k)] }}
            />
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 rounded-md border border-line bg-panel p-0.5 shadow-panel">
          <IconButton icon={Layers} tip="Onion skin (show previous cel)" active={onion} onClick={() => setOnion(!onion)} />
          <IconButton icon={Grid3x3} tip="Pixel grid" active={grid} onClick={() => setGrid(!grid)} />
          <div className="mx-1 h-5 w-px bg-line" />
          <IconButton icon={Minus} tip="Zoom out" disabled={zoom <= 3} onClick={() => setZoom(zoom - 1)} />
          <span className="w-8 text-center text-[11px] text-muted">{zoom}×</span>
          <IconButton icon={Plus} tip="Zoom in" disabled={zoom >= 20} onClick={() => setZoom(zoom + 1)} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-auto">
        <div className="m-auto p-6">
          <PixelEditor view={view} tool={tool} onion={onion} grid={grid} zoom={zoom} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- right panel

/** Number field that only applies a valid value on Enter or blur. */
function SizeInput({ value, max, label, onCommit }: { value: number; max: number; label: string; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const commit = () => {
    const n = Math.round(Number(text))
    if (Number.isFinite(n) && n >= 1 && n <= max && n !== value) onCommit(n)
    else setText(String(value))
  }
  return (
    <input
      type="number"
      className="w-12"
      min={1}
      max={max}
      value={text}
      aria-label={label}
      data-tip={label}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') setText(String(value))
      }}
    />
  )
}

function SpriteInspector() {
  const view = useActiveView()
  const loopIdx = useApp((s) => s.spriteLoop)
  const celIdx = useApp((s) => s.spriteCel)
  const setUi = useApp((s) => s.setUi)
  const [playing, setPlaying] = useState(true)
  const loop = view?.loops[loopIdx]
  const count = useMemo(() => (view && loop ? loopCelCount(view, loop) : 0), [view, loop])
  if (!view || !loop) return null
  const up = (fn: (v: View) => void) => actions.updateView(view.id, fn)
  const mirrored = loop.mirrorOf !== undefined
  const cel = (mirrored ? view.loops[loop.mirrorOf!] : loop).cels[celIdx]

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Section id="sprite-props" title="Sprite">
        <div className="flex flex-col gap-0.5">
          <Field label="Name">
            <input type="text" className="min-w-0 flex-1" value={view.name} onChange={(e) => up((v) => void (v.name = e.target.value))} />
            <IconButton icon={Trash2} size="sm" danger tip="Delete sprite" onClick={() => actions.removeView(view.id)} />
          </Field>
          <Select label="Kind" value={view.kind} options={[{ value: 'character', label: 'Character' }, { value: 'prop', label: 'Prop' }]} onChange={(k) => up((v) => void (v.kind = k))} />
          <Slider label="Speed" tip="Frames per second" min={1} max={20} value={view.fps} onChange={(n) => up((v) => void (v.fps = n))} onStart={beginGesture} onEnd={endGesture} />
          <div className="mt-1 flex justify-center rounded border border-line bg-bg p-2">
            <LoopPreview view={view} loop={loopIdx} box={96} playing={playing} />
          </div>
          <div className="flex justify-center">
            <IconButton icon={playing ? Pause : Play} tip={playing ? 'Pause preview' : 'Play preview'} onClick={() => setPlaying(!playing)} />
          </div>
        </div>
      </Section>
      {view.roles.length > 0 && (
        <Section id="sprite-colors" title="Colors">
          <div className="grid grid-cols-2 gap-x-2">
            {view.roles.map((r) => (
              <div key={r.key} className="flex h-7 items-center justify-between gap-1">
                <span className="truncate text-[11px] text-muted">{r.label}</span>
                <EgaPicker value={view.colorMap[r.key] ?? r.color} tip={r.label} onChange={(c) => up((v) => void (v.colorMap[r.key] = c))} />
              </div>
            ))}
          </div>
        </Section>
      )}
      <Section
        id="sprite-loops"
        title={`Loops · ${view.loops.length}`}
        actions={
          <IconButton
            icon={Plus}
            size="sm"
            tip="Add loop"
            onClick={() => {
              const c = cel ?? blankCel(9, 32)
              up((v) => void v.loops.push({ name: `loop ${v.loops.length}`, cels: [blankCel(c.w, c.h)] }))
            }}
          />
        }
      >
        <div className="flex flex-col">
          {view.loops.map((l, i) => (
            <div
              key={i}
              onClick={() => setUi({ spriteLoop: i, spriteCel: 0 })}
              className={`group flex h-7 items-center gap-1 rounded px-1.5 ${i === loopIdx ? 'bg-line shadow-[inset_2px_0_0_var(--color-accent)]' : 'hover:bg-line'}`}
            >
              <span className="w-4 text-[11px] text-muted">{i}</span>
              <input
                type="text"
                className="min-w-0 flex-1 border-transparent! bg-transparent! px-0!"
                value={l.name}
                onChange={(e) => up((v) => void (v.loops[i].name = e.target.value))}
              />
              {l.mirrorOf !== undefined && (
                <span className="text-[10px] text-accent" data-tip={`Mirrors loop ${l.mirrorOf}`}>
                  <FlipHorizontal2 size={12} />
                </span>
              )}
              <span className="opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <IconButton
                  icon={FlipHorizontal2}
                  size="sm"
                  tip={l.mirrorOf !== undefined ? 'Stop mirroring (copy cels flipped)' : 'Mirror loop 0 into this loop'}
                  disabled={i === 0 && l.mirrorOf === undefined}
                  onClick={() =>
                    up((v) => {
                      const L = v.loops[i]
                      if (L.mirrorOf !== undefined) {
                        L.cels = v.loops[L.mirrorOf].cels.map(mirrorCel)
                        delete L.mirrorOf
                      } else {
                        L.mirrorOf = 0
                        L.cels = []
                      }
                    })
                  }
                />
                {view.loops.length > 1 && (
                  <IconButton
                    icon={Trash2}
                    size="sm"
                    danger
                    tip="Delete loop"
                    onClick={() => {
                      up((v) => {
                        const src = v.loops[i]
                        for (const L of v.loops) {
                          if (L.mirrorOf === i) {
                            L.cels = src.cels.map(mirrorCel)
                            delete L.mirrorOf
                          }
                        }
                        v.loops.splice(i, 1)
                        for (const L of v.loops) if (L.mirrorOf !== undefined && L.mirrorOf > i) L.mirrorOf -= 1
                      })
                      setUi({ spriteLoop: 0, spriteCel: 0 })
                    }}
                  />
                )}
              </span>
            </div>
          ))}
        </div>
      </Section>
      <Section
        id="sprite-cels"
        title={`Cels · ${count}`}
        actions={
          !mirrored && (
            <>
              <IconButton icon={ArrowLeft} size="sm" tip="Move cel earlier" disabled={celIdx === 0} onClick={() => {
                up((v) => {
                  const c = v.loops[loopIdx].cels
                  ;[c[celIdx - 1], c[celIdx]] = [c[celIdx], c[celIdx - 1]]
                })
                setUi({ spriteCel: celIdx - 1 })
              }} />
              <IconButton icon={ArrowRight} size="sm" tip="Move cel later" disabled={celIdx >= count - 1} onClick={() => {
                up((v) => {
                  const c = v.loops[loopIdx].cels
                  ;[c[celIdx + 1], c[celIdx]] = [c[celIdx], c[celIdx + 1]]
                })
                setUi({ spriteCel: celIdx + 1 })
              }} />
              <IconButton icon={Copy} size="sm" tip="Duplicate cel" onClick={() => {
                up((v) => {
                  const c = v.loops[loopIdx].cels[celIdx]
                  v.loops[loopIdx].cels.splice(celIdx + 1, 0, { w: c.w, h: c.h, pixels: [...c.pixels] })
                })
                setUi({ spriteCel: celIdx + 1 })
              }} />
              <IconButton icon={Plus} size="sm" tip="New blank cel" onClick={() => {
                up((v) => void v.loops[loopIdx].cels.splice(celIdx + 1, 0, blankCel(cel?.w ?? 9, cel?.h ?? 32)))
                setUi({ spriteCel: celIdx + 1 })
              }} />
              <IconButton icon={Trash2} size="sm" danger tip="Delete cel" disabled={count <= 1} onClick={() => {
                up((v) => void v.loops[loopIdx].cels.splice(celIdx, 1))
                setUi({ spriteCel: Math.max(0, celIdx - 1) })
              }} />
            </>
          )
        }
      >
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              data-tip={`Cel ${i}`}
              onClick={() => setUi({ spriteCel: i })}
              className={`flex h-14 w-11 items-center justify-center rounded border bg-bg ${i === celIdx ? 'border-accent' : 'border-line hover:border-muted'}`}
            >
              <CelView view={view} loop={loopIdx} cel={i} box={40} />
            </button>
          ))}
        </div>
        {cel && !mirrored && (
          <Field label="Size" tip="Width × height of every cel in this loop (keeps the feet in place). Press Enter to apply.">
            <SizeInput value={cel.w} max={160} label="Width" onCommit={(w) => up((v) => void (v.loops[loopIdx].cels = v.loops[loopIdx].cels.map((c) => resizeCel(c, w, c.h))))} />
            <span className="text-muted">×</span>
            <SizeInput value={cel.h} max={168} label="Height" onCommit={(h) => up((v) => void (v.loops[loopIdx].cels = v.loops[loopIdx].cels.map((c) => resizeCel(c, c.w, h))))} />
          </Field>
        )}
      </Section>
    </div>
  )
}

export function SpritesWorkspace() {
  const leftOpen = useApp((s) => s.leftOpen)
  const rightOpen = useApp((s) => s.rightOpen)
  const setUi = useApp((s) => s.setUi)
  const views = useApp((s) => s.project.views)
  const activeId = useApp((s) => s.activeViewId)
  useEffect(() => {
    if (!activeId && views.length) setUi({ activeViewId: views[0].id })
  }, [activeId, views, setUi])
  return (
    <div className="flex min-h-0 flex-1 pt-2">
      <SidePanel side="left" open={leftOpen} onToggle={() => setUi({ leftOpen: !leftOpen })} tip={leftOpen ? 'Hide sprites' : 'Show sprites'} tipKey="[">
        <SpriteList />
      </SidePanel>
      <SpriteCenter />
      <SidePanel side="right" open={rightOpen} onToggle={() => setUi({ rightOpen: !rightOpen })} tip={rightOpen ? 'Hide inspector' : 'Show inspector'} tipKey="]">
        <SpriteInspector />
      </SidePanel>
    </div>
  )
}
