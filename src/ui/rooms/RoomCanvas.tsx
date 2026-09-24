import { useCallback, useEffect, useRef, useState } from 'react'
import { create } from 'zustand'
import { IDENTITY_MAP } from '../../agi/palette'
import { floodRuns } from '../../agi/region'
import type { PicCommand, Pt } from '../../agi/commands'
import type { Composed } from '../../agi/compose'
import { PIC_H, PIC_W, T } from '../../agi/constants'
import { bandStarts } from '../../agi/priority'
import { getElement } from '../../library'
import { paintScreen } from '../../render/draw'
import { layerRaster, renderRoom } from '../../render/room'
import { elementLayer, viewLayer } from '../../state/factory'
import { actions, activeRoom, beginGesture, endGesture, useActiveRoom, useApp } from '../../state/store'
import type { Layer, Room } from '../../state/types'
import type { View } from '../../sprites/types'
import { UI } from '../tokens'
import { appendToLayer, ensurePaintLayer, stateCommands, translateCommands } from './paint'

export const DND_ELEMENT = 'application/x-agi-element'
export const DND_VIEW = 'application/x-agi-view'

export interface HoverInfo {
  x: number
  y: number
  visual: number
  priority: number
}

/** Pointer info for the status bar, kept out of the main store so hovering doesn't re-render the workspace. */
export const useHover = create<{ hover: HoverInfo | null }>(() => ({ hover: null }))
const setHover = (hover: HoverInfo | null) => useHover.setState({ hover })

/** The room as painted, without mood or color swap (what paint colors refer to). */
function rawComposite(room: Room, views: readonly View[], hide?: Set<string>) {
  return renderRoom({ ...room, mood: 'day', colorSwap: [...IDENTITY_MAP] }, views, { hide })
}

type Drag =
  | { kind: 'move'; id: string; sx: number; sy: number; ox: number; oy: number; orig?: PicCommand[]; full: boolean }
  | { kind: 'scale'; id: string; ax: number; ay: number; d0: number; s0: number }
  | { kind: 'pen'; id: string; last: Pt }

function hitLayers(room: Room, views: readonly View[], x: number, y: number): Layer[] {
  const out: Layer[] = []
  if (x < 0 || y < 0 || x >= PIC_W || y >= PIC_H) return out
  const i = y * PIC_W + x
  for (let k = room.layers.length - 1; k >= 0; k--) {
    const l = room.layers[k]
    if (!l.visible || l.locked) continue
    const r = layerRaster(l, room, views)
    if (r.visual[i] !== T || r.priority[i] !== T) out.push(l)
  }
  return out
}

function isFull(l: Layer): boolean {
  return l.kind === 'element' && getElement(l.elementId)?.span === 'full'
}

export function RoomCanvas({ zoom }: { zoom: number }) {
  const room = useActiveRoom()
  const views = useApp((s) => s.project.views)
  const screen = useApp((s) => s.screen)
  const tool = useApp((s) => s.tool)
  const guides = useApp((s) => s.guides)
  const selectedId = useApp((s) => s.selectedLayerId)
  const trace = useApp((s) => s.trace)

  const picRef = useRef<HTMLCanvasElement>(null)
  const ovRef = useRef<HTMLCanvasElement>(null)
  const composed = useRef<Composed | null>(null)
  const drag = useRef<Drag | null>(null)
  const lastDown = useRef<{ x: number; y: number; t: number } | null>(null)
  const [pending, setPending] = useState<{ kind: 'line' | 'step'; pts: Pt[]; horizontalFirst?: boolean } | null>(null)
  const [cursor, setCursor] = useState<Pt | null>(null)

  const W = PIC_W * 2 * zoom
  const H = PIC_H * zoom

  // picture
  useEffect(() => {
    const c = renderRoom(room, views)
    composed.current = c
    const ctx = picRef.current?.getContext('2d')
    if (!ctx) return
    const img = ctx.createImageData(PIC_W, PIC_H)
    paintScreen(img, c, screen)
    ctx.putImageData(img, 0, 0)
  }, [room, views, screen])

  // overlay: guides, selection, previews
  useEffect(() => {
    const cv = ovRef.current
    if (!cv) return
    const dpr = window.devicePixelRatio || 1
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
    }
    const ctx = cv.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)
    const sx = 2 * zoom
    const sy = zoom
    ctx.lineWidth = 1

    if (guides.grid) {
      ctx.strokeStyle = UI.text
      ctx.globalAlpha = 0.14
      ctx.beginPath()
      for (let x = 10; x < PIC_W; x += 10) {
        ctx.moveTo(x * sx + 0.5, 0)
        ctx.lineTo(x * sx + 0.5, H)
      }
      for (let y = 10; y < PIC_H; y += 10) {
        ctx.moveTo(0, y * sy + 0.5)
        ctx.lineTo(W, y * sy + 0.5)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }
    if (guides.bands) {
      ctx.font = '10px Inter, sans-serif'
      for (const { band, y } of bandStarts(room.priorityBase)) {
        if (y === 0) continue
        ctx.strokeStyle = UI.text
        ctx.globalAlpha = 0.45
        ctx.beginPath()
        ctx.moveTo(0, y * sy + 0.5)
        ctx.lineTo(W, y * sy + 0.5)
        ctx.stroke()
        ctx.globalAlpha = 0.9
        ctx.fillStyle = UI.shadow
        ctx.fillRect(2, y * sy + 2, 16, 12)
        ctx.fillStyle = UI.text
        ctx.fillText(String(band), 4, y * sy + 11)
        ctx.globalAlpha = 1
      }
    }
    if (guides.horizon) {
      ctx.strokeStyle = UI.accent
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(0, room.horizon * sy + 0.5)
      ctx.lineTo(W, room.horizon * sy + 0.5)
      ctx.stroke()
      ctx.setLineDash([])
    }

    const sel = room.layers.find((l) => l.id === selectedId)
    if (sel && sel.visible) {
      const r = layerRaster(sel, room, views)
      if (r.bbox.x1 >= 0) {
        const x = r.bbox.x0 * sx
        const y = r.bbox.y0 * sy
        const w = (r.bbox.x1 - r.bbox.x0 + 1) * sx
        const h = (r.bbox.y1 - r.bbox.y0 + 1) * sy
        ctx.strokeStyle = UI.shadow
        ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1)
        ctx.strokeStyle = UI.accent
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
        if (sel.kind === 'element' && !isFull(sel) && !sel.locked) {
          ctx.fillStyle = UI.accent
          ctx.fillRect(x + w - 4, y + h - 4, 8, 8)
          ctx.strokeStyle = UI.shadow
          ctx.strokeRect(x + w - 4.5, y + h - 4.5, 9, 9)
        }
      }
      if (sel.kind === 'element' || sel.kind === 'view') {
        const ax = (sel.kind === 'element' && isFull(sel) ? PIC_W / 2 : sel.x) * sx
        const ay = sel.y * sy
        ctx.strokeStyle = UI.accent
        ctx.beginPath()
        ctx.moveTo(ax - 5, ay + sy / 2)
        ctx.lineTo(ax + 5, ay + sy / 2)
        ctx.moveTo(ax, ay - 4)
        ctx.lineTo(ax, ay + 5)
        ctx.stroke()
      }
    }

    if (pending && pending.pts.length) {
      const pts = [...pending.pts]
      if (cursor) pts.push(snapStep(pending, cursor))
      ctx.strokeStyle = UI.accent
      ctx.beginPath()
      pts.forEach(([px, py], i) => {
        const cx = px * sx + sx / 2
        const cy = py * sy + sy / 2
        if (i === 0) ctx.moveTo(cx, cy)
        else ctx.lineTo(cx, cy)
      })
      ctx.stroke()
    }
  }, [room, views, selectedId, guides, zoom, pending, pending ? cursor : null, W, H])

  const toLogical = useCallback(
    (e: { clientX: number; clientY: number }): Pt => {
      const rect = ovRef.current!.getBoundingClientRect()
      return [Math.floor((e.clientX - rect.left) / (2 * zoom)), Math.floor((e.clientY - rect.top) / zoom)]
    },
    [zoom],
  )

  const pendingRef = useRef(pending)
  pendingRef.current = pending

  const commitPending = useCallback(() => {
    const p = pendingRef.current
    pendingRef.current = null
    setPending(null)
    if (!p || p.pts.length < 2) return
    const layer = ensurePaintLayer()
    let cmd: PicCommand
    if (p.kind === 'line') cmd = { op: 'line', pts: p.pts }
    else {
      const steps: number[] = []
      let horizontal = !!p.horizontalFirst
      for (let i = 1; i < p.pts.length; i++) {
        steps.push(horizontal ? p.pts[i][0] : p.pts[i][1])
        horizontal = !horizontal
      }
      cmd = { op: p.horizontalFirst ? 'xcorner' : 'ycorner', start: p.pts[0], steps }
    }
    appendToLayer(layer.id, [...stateCommands(layer.commands), cmd])
  }, [])

  // finish or cancel a pending line with the keyboard; switching tools commits it
  useEffect(() => {
    if (!pending) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Enter') commitPending()
      if (e.key === 'Escape') setPending(null)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [pending, commitPending])
  useEffect(() => {
    if (tool !== 'line' && tool !== 'step') commitPending()
  }, [tool, commitPending])

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return
    const [x, y] = toLogical(e)
    const s = useApp.getState()
    const cx = Math.max(0, Math.min(PIC_W - 1, x))
    const cy = Math.max(0, Math.min(PIC_H - 1, y))

    if (tool === 'select') {
      const sel = room.layers.find((l) => l.id === s.selectedLayerId)
      // scale handle
      if (sel && sel.kind === 'element' && !isFull(sel) && !sel.locked) {
        const r = layerRaster(sel, room, views)
        if (r.bbox.x1 >= 0) {
          const hx = (r.bbox.x1 + 1) * 2 * zoom
          const hy = (r.bbox.y1 + 1) * zoom
          const rect = ovRef.current!.getBoundingClientRect()
          const px = e.clientX - rect.left
          const py = e.clientY - rect.top
          if (Math.abs(px - hx) <= 8 && Math.abs(py - hy) <= 8) {
            const d0 = Math.hypot((x - sel.x) * 2, y - sel.y) || 1
            drag.current = { kind: 'scale', id: sel.id, ax: sel.x, ay: sel.y, d0, s0: sel.scale }
            beginGesture()
            ovRef.current!.setPointerCapture(e.pointerId)
            return
          }
        }
      }
      const hits = hitLayers(room, views, x, y)
      let target: Layer | undefined
      if (e.altKey && hits.length) {
        const i = hits.findIndex((l) => l.id === s.selectedLayerId)
        target = hits[(i + 1) % hits.length]
      } else {
        // prefer objects over full-width skies, grounds and fog
        target = hits.find((l) => !isFull(l)) ?? hits[0]
      }
      if (!target) {
        s.setUi({ selectedLayerId: null })
        return
      }
      const wasSelected = target.id === s.selectedLayerId
      s.setUi({ selectedLayerId: target.id })
      // a full-width layer only drags once it is already selected, so near-misses don't move the ground
      if (isFull(target) && !wasSelected && !e.altKey) return
      if (target.kind === 'paint') {
        drag.current = { kind: 'move', id: target.id, sx: x, sy: y, ox: 0, oy: 0, orig: target.commands, full: false }
      } else {
        drag.current = { kind: 'move', id: target.id, sx: x, sy: y, ox: target.x, oy: target.y, full: isFull(target) }
      }
      beginGesture()
      ovRef.current!.setPointerCapture(e.pointerId)
      return
    }

    if (tool === 'picker') {
      const c = rawComposite(room, views)
      const i = cy * PIC_W + cx
      if (s.screen === 'priority' || s.screen === 'control') {
        const p = c.priority[i]
        if (p < 4) s.setUi({ paintControl: p as 0 | 1 | 2 | 3, paintTarget: 'control' })
        else s.setUi({ paintPriority: p, paintTarget: 'priority' })
      } else s.setUi({ paintColor: c.visual[i], paintTarget: 'visual' })
      return
    }

    if (tool === 'fill') {
      const layer = ensurePaintLayer()
      const r = activeRoom()
      const idx = r.layers.findIndex((l) => l.id === layer.id)
      const hide = new Set(r.layers.slice(idx + 1).map((l) => l.id))
      const c = rawComposite(r, views, hide)
      const plane = s.paintTarget === 'visual' ? c.visual : c.priority
      const runs = floodRuns(plane, cx, cy)
      appendToLayer(layer.id, [...stateCommands(layer.commands), ...runs.map(([a, b, ry]): PicCommand => ({ op: 'line', pts: [[a, ry], [b, ry]] }))])
      return
    }

    if (tool === 'pen') {
      const layer = ensurePaintLayer()
      beginGesture()
      appendToLayer(layer.id, [...stateCommands(layer.commands, true), { op: 'plot', pts: [[cx, cy]] }])
      drag.current = { kind: 'pen', id: layer.id, last: [cx, cy] }
      ovRef.current!.setPointerCapture(e.pointerId)
      return
    }

    if (tool === 'line' || tool === 'step') {
      const now = performance.now()
      const last = lastDown.current
      lastDown.current = { x: cx, y: cy, t: now }
      // the second click of a double-click finishes the line instead of adding a point
      if (last && now - last.t < 350 && last.x === cx && last.y === cy) return
      setPending((p) => {
        if (!p) return { kind: tool, pts: [[cx, cy]] }
        if (p.kind === 'step' && p.pts.length === 1) {
          const [px, py] = p.pts[0]
          const horizontalFirst = Math.abs(cx - px) * 2 >= Math.abs(cy - py)
          const next: Pt = horizontalFirst ? [cx, py] : [px, cy]
          return { ...p, horizontalFirst, pts: [...p.pts, next] }
        }
        return { ...p, pts: [...p.pts, snapStep(p, [cx, cy])] }
      })
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const [x, y] = toLogical(e)
    const inside = x >= 0 && y >= 0 && x < PIC_W && y < PIC_H
    if (pendingRef.current) setCursor(inside ? [x, y] : null)
    const c = composed.current
    setHover(inside && c ? { x, y, visual: c.visual[y * PIC_W + x], priority: c.priority[y * PIC_W + x] } : null)
    const d = drag.current
    if (!d) return
    if (d.kind === 'move') {
      const dx = x - d.sx
      const dy = y - d.sy
      actions.updateLayer(d.id, (l) => {
        if (l.kind === 'paint' && d.orig) l.commands = translateCommands(d.orig, dx, dy) as typeof l.commands
        else if (l.kind === 'element' || l.kind === 'view') {
          if (!d.full) l.x = d.ox + dx
          l.y = Math.max(0, Math.min(PIC_H - 1, d.oy + dy))
        }
      })
    } else if (d.kind === 'scale') {
      const dist = Math.hypot((x - d.ax) * 2, y - d.ay)
      const s = Math.max(0.2, Math.min(4, Math.round(d.s0 * (dist / d.d0) * 20) / 20))
      actions.updateLayer(d.id, (l) => {
        if (l.kind === 'element') l.scale = s
      })
    } else if (d.kind === 'pen') {
      const p: Pt = [Math.max(0, Math.min(PIC_W - 1, x)), Math.max(0, Math.min(PIC_H - 1, y))]
      if (p[0] === d.last[0] && p[1] === d.last[1]) return
      d.last = p
      actions.updateLayer(d.id, (l) => {
        if (l.kind !== 'paint') return
        const last = l.commands[l.commands.length - 1]
        if (last && last.op === 'plot') last.pts.push(p)
      })
    }
  }

  const onPointerUp = () => {
    if (drag.current) {
      drag.current = null
      endGesture()
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const [x, y] = toLogical(e)
    const elementId = e.dataTransfer.getData(DND_ELEMENT)
    const viewId = e.dataTransfer.getData(DND_VIEW)
    const cy = Math.max(0, Math.min(PIC_H - 1, y))
    if (elementId) {
      const def = getElement(elementId)
      if (!def) return
      actions.addLayer(elementLayer(elementId, def.span === 'full' ? { y: cy } : { x, y: cy }))
      useApp.getState().setUi({ tool: 'select' })
    } else if (viewId) {
      const v = views.find((vv) => vv.id === viewId)
      actions.addLayer(viewLayer(viewId, x, cy, v?.name ?? 'Sprite'))
      useApp.getState().setUi({ tool: 'select' })
    }
  }

  const cursorStyle = tool === 'select' ? 'default' : tool === 'picker' ? 'copy' : 'crosshair'

  return (
    <div className="relative shrink-0 shadow-panel" style={{ width: W, height: H }}>
      <canvas ref={picRef} width={PIC_W} height={PIC_H} className="pixel absolute inset-0" style={{ width: W, height: H }} />
      {trace.url && trace.visible && (
        <img src={trace.url} alt="" draggable={false} className="pointer-events-none absolute inset-0 object-fill" style={{ width: W, height: H, opacity: trace.opacity }} />
      )}
      <canvas
        ref={ovRef}
        className="absolute inset-0 touch-none"
        style={{ width: W, height: H, cursor: cursorStyle }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          setCursor(null)
          setHover(null)
        }}
        onDoubleClick={() => (tool === 'line' || tool === 'step') && commitPending()}
        onContextMenu={(e) => {
          e.preventDefault()
          commitPending()
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(DND_ELEMENT) || e.dataTransfer.types.includes(DND_VIEW)) e.preventDefault()
        }}
        onDrop={onDrop}
      />
    </div>
  )
}

function snapStep(p: { kind: 'line' | 'step'; pts: Pt[]; horizontalFirst?: boolean }, pt: Pt): Pt {
  if (p.kind !== 'step' || !p.pts.length) return pt
  const last = p.pts[p.pts.length - 1]
  if (p.pts.length === 1) {
    const horizontal = Math.abs(pt[0] - last[0]) * 2 >= Math.abs(pt[1] - last[1])
    return horizontal ? [pt[0], last[1]] : [last[0], pt[1]]
  }
  // segments alternate starting with the first direction
  const segIndex = p.pts.length - 1
  const horizontal = segIndex % 2 === 0 ? !!p.horizontalFirst : !p.horizontalFirst
  return horizontal ? [pt[0], last[1]] : [last[0], pt[1]]
}
