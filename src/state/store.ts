import { produce, type Draft } from 'immer'
import { create } from 'zustand'
import { temporal } from 'zundo'
import type { PenShape } from '../agi/commands'
import { CRT_ROW_SCALE } from '../agi/constants'
import { getElement } from '../library'
import { elementLayer, newRoom, uid } from './factory'
import type { Dir, Layer, Project, Room, Theme } from './types'
import type { NeighborPlan } from '../generator'
import type { View } from '../sprites/types'

export type Mode = 'rooms' | 'sprites' | 'walk'
export type Screen = 'visual' | 'priority' | 'control' | 'overlay'
export type Tool = 'select' | 'line' | 'step' | 'fill' | 'pen' | 'picker'
export type PaintTarget = 'visual' | 'priority' | 'control'
/** 0 wall, 1 conditional wall, 2 trigger, 3 water, 4 clear control */
export type ControlBrush = 0 | 1 | 2 | 3 | 4

export interface UiState {
  mode: Mode
  activeRoomId: string
  selectedLayerId: string | null
  screen: Screen
  zoom: number
  zoomFit: boolean
  /** Show pictures with the 4:3 CRT shape (rows 1.2x taller) instead of raw 2:1 pixels. */
  crtAspect: boolean
  /** Zoom that currently fits the window (set by the canvas area). */
  fitZoom: number
  tool: Tool
  guides: { bands: boolean; horizon: boolean; grid: boolean }
  leftOpen: boolean
  rightOpen: boolean
  paintTarget: PaintTarget
  paintColor: number
  paintPriority: number
  paintControl: ControlBrush
  pen: { size: number; shape: PenShape; splatter: boolean }
  libraryTheme: Theme | 'all'
  libraryQuery: string
  trace: { url: string | null; opacity: number; visible: boolean }
  activeViewId: string | null
  spriteLoop: number
  spriteCel: number
  spriteColor: number
  modal: null | 'export' | 'new'
}

export interface AppState extends UiState {
  project: Project
  setUi(patch: Partial<UiState>): void
  mutate(fn: (draft: Draft<Project>) => void): void
  setProject(p: Project): void
}

/** Build a room from element ids, skipping any the library doesn't have. */
function safeLayers(specs: [string, Parameters<typeof elementLayer>[1]?][]): Layer[] {
  return specs.filter(([id]) => getElement(id)).map(([id, opts]) => elementLayer(id, opts))
}

export function defaultProject(): Project {
  const room = newRoom({
    name: 'Meadow',
    theme: 'nature',
    layers: safeLayers([
      ['sky-clear', { y: 62, seed: 3, params: { sun: true } }],
      ['clouds', { x: 40, y: 20, seed: 4 }],
      ['hills', { y: 62, seed: 5 }],
      ['grass-field', { y: 62, seed: 6 }],
      ['path', { y: 62, seed: 7 }],
      ['oak', { x: 32, y: 128, seed: 8 }],
      ['oak', { x: 126, y: 106, seed: 9 }],
    ]),
  })
  return { version: 1, name: 'Untitled project', rooms: [room], views: [] }
}

const initialProject = defaultProject()

export const useApp = create<AppState>()(
  temporal(
    (set) => ({
      project: initialProject,
      mode: 'rooms',
      activeRoomId: initialProject.rooms[0].id,
      selectedLayerId: null,
      screen: 'visual',
      zoom: 3,
      zoomFit: true,
      crtAspect: true,
      fitZoom: 2,
      tool: 'select',
      guides: { bands: false, horizon: false, grid: false },
      leftOpen: true,
      rightOpen: true,
      paintTarget: 'visual',
      paintColor: 0,
      paintPriority: 10,
      paintControl: 0,
      pen: { size: 1, shape: 'circle', splatter: false },
      libraryTheme: 'all',
      libraryQuery: '',
      trace: { url: null, opacity: 0.4, visible: true },
      activeViewId: null,
      spriteLoop: 0,
      spriteCel: 0,
      spriteColor: 0,
      modal: null,
      setUi: (patch) => set(patch),
      mutate: (fn) => set((s) => ({ project: produce(s.project, fn) })),
      setProject: (p) => set({ project: p }),
    }),
    {
      partialize: (s) => ({ project: s.project }),
      equality: (a, b) => a.project === b.project,
      limit: 150,
    },
  ),
)

// ------------------------------------------------------------------ gestures

let gestureStart: Project | null = null

/** Start a drag: intermediate changes won't create undo steps. */
export function beginGesture(): void {
  if (gestureStart) return
  gestureStart = useApp.getState().project
  useApp.temporal.getState().pause()
  // make sure the gesture ends even if the element never sees the release
  if (typeof window !== 'undefined') {
    const end = () => {
      window.removeEventListener('pointerup', end, true)
      window.removeEventListener('pointercancel', end, true)
      window.removeEventListener('blur', end)
      // let the element's own pointerup run first
      setTimeout(endGesture, 0)
    }
    window.addEventListener('pointerup', end, true)
    window.addEventListener('pointercancel', end, true)
    window.addEventListener('blur', end)
  }
}

/** Finish a drag as a single undo step. */
export function endGesture(): void {
  const start = gestureStart
  if (!start) return
  gestureStart = null
  const t = useApp.temporal.getState()
  const final = useApp.getState().project
  if (final === start) {
    t.resume()
    return
  }
  useApp.setState({ project: start })
  t.resume()
  useApp.setState({ project: final })
}

export const undo = () => useApp.temporal.getState().undo()

/** Height of one picture row relative to half a pixel's width (1.2 on a 4:3 CRT, 1 for raw pixels). */
export const useRowScale = () => useApp((s) => (s.crtAspect ? CRT_ROW_SCALE : 1))
export const redo = () => useApp.temporal.getState().redo()

// ------------------------------------------------------------------ selectors

export function activeRoom(s: AppState = useApp.getState()): Room {
  return s.project.rooms.find((r) => r.id === s.activeRoomId) ?? s.project.rooms[0]
}

export function selectedLayer(s: AppState = useApp.getState()): Layer | null {
  const room = activeRoom(s)
  return room.layers.find((l) => l.id === s.selectedLayerId) ?? null
}

export const useActiveRoom = () => useApp((s) => s.project.rooms.find((r) => r.id === s.activeRoomId) ?? s.project.rooms[0])
export const useSelectedLayer = () =>
  useApp((s) => {
    const room = s.project.rooms.find((r) => r.id === s.activeRoomId) ?? s.project.rooms[0]
    return room.layers.find((l) => l.id === s.selectedLayerId) ?? null
  })

// ------------------------------------------------------------------ actions

function draftRoom(d: Draft<Project>, id = useApp.getState().activeRoomId): Draft<Room> {
  return d.rooms.find((r) => r.id === id) ?? d.rooms[0]
}

export const actions = {
  addLayer(layer: Layer, index?: number) {
    useApp.getState().mutate((d) => {
      const room = draftRoom(d)
      if (index === undefined) room.layers.push(layer as Draft<Layer>)
      else room.layers.splice(index, 0, layer as Draft<Layer>)
    })
    useApp.setState({ selectedLayerId: layer.id })
  },

  updateLayer(id: string, fn: (l: Draft<Layer>) => void) {
    useApp.getState().mutate((d) => {
      const l = draftRoom(d).layers.find((x) => x.id === id)
      if (l) fn(l)
    })
  },

  removeLayer(id: string) {
    const room = activeRoom()
    const idx = room.layers.findIndex((l) => l.id === id)
    useApp.getState().mutate((d) => {
      const r = draftRoom(d)
      r.layers = r.layers.filter((l) => l.id !== id)
    })
    const next = room.layers[idx - 1] ?? room.layers[idx + 1]
    useApp.setState({ selectedLayerId: next && next.id !== id ? next.id : null })
  },

  duplicateLayer(id: string) {
    const room = activeRoom()
    const idx = room.layers.findIndex((l) => l.id === id)
    if (idx < 0) return
    const copy = structuredClone(room.layers[idx]) as Layer
    copy.id = uid('layer')
    if (copy.kind === 'element' || copy.kind === 'view') copy.x += 8
    actions.addLayer(copy, idx + 1)
  },

  moveLayer(id: string, delta: number) {
    useApp.getState().mutate((d) => {
      const r = draftRoom(d)
      const i = r.layers.findIndex((l) => l.id === id)
      const j = Math.max(0, Math.min(r.layers.length - 1, i + delta))
      if (i < 0 || i === j) return
      const [l] = r.layers.splice(i, 1)
      r.layers.splice(j, 0, l)
    })
  },

  reorderLayer(id: string, toIndex: number) {
    useApp.getState().mutate((d) => {
      const r = draftRoom(d)
      const i = r.layers.findIndex((l) => l.id === id)
      if (i < 0) return
      const [l] = r.layers.splice(i, 1)
      r.layers.splice(Math.max(0, Math.min(r.layers.length, toIndex)), 0, l)
    })
  },

  updateRoom(fn: (r: Draft<Room>) => void, id?: string) {
    useApp.getState().mutate((d) => fn(draftRoom(d, id)))
  },

  addRoom(room: Room) {
    useApp.getState().mutate((d) => {
      d.rooms.push(room as Draft<Room>)
    })
    useApp.setState({ activeRoomId: room.id, selectedLayerId: null })
  },

  /** Apply a planned neighbor (new room and/or links) as one undo step and go there. */
  applyNeighbor(sourceId: string, dir: Dir, plan: NeighborPlan) {
    useApp.getState().mutate((d) => {
      if (plan.kind === 'new') d.rooms.push(plan.room as Draft<Room>)
      const src = d.rooms.find((r) => r.id === sourceId)
      if (src) src.mapPos ??= { x: 0, y: 0 }
      for (const l of plan.links) {
        const r = d.rooms.find((x) => x.id === l.from)
        if (r) r.links[l.dir] = l.to
      }
    })
    const target = plan.kind === 'new' ? plan.room.id : plan.links.find((l) => l.from === sourceId && l.dir === dir)?.to
    if (target) useApp.setState({ activeRoomId: target, selectedLayerId: null })
  },

  removeRoom(id: string) {
    const s = useApp.getState()
    if (s.project.rooms.length <= 1) return
    s.mutate((d) => {
      d.rooms = d.rooms.filter((r) => r.id !== id)
      for (const r of d.rooms) {
        for (const dir of ['n', 's', 'e', 'w'] as const) if (r.links[dir] === id) delete r.links[dir]
      }
    })
    const next = useApp.getState().project.rooms[0]
    useApp.setState({ activeRoomId: next.id, selectedLayerId: null })
  },

  setActiveRoom(id: string) {
    useApp.setState({ activeRoomId: id, selectedLayerId: null })
  },

  addView(view: View) {
    useApp.getState().mutate((d) => {
      d.views.push(view as Draft<View>)
    })
    useApp.setState({ activeViewId: view.id, spriteLoop: 0, spriteCel: 0 })
  },

  /** The project's copy of a built-in sprite, adding one only if needed. */
  projectCopyOf(builtin: View): View {
    const existing = useApp.getState().project.views.find((v) => v.builtinId && v.builtinId === builtin.builtinId)
    if (existing) return existing
    const copy = structuredClone(builtin)
    copy.id = uid('view')
    useApp.getState().mutate((d) => {
      d.views.push(copy as Draft<View>)
    })
    return copy
  },

  updateView(id: string, fn: (v: Draft<View>) => void) {
    useApp.getState().mutate((d) => {
      const v = d.views.find((x) => x.id === id)
      if (v) fn(v)
    })
  },

  removeView(id: string) {
    useApp.getState().mutate((d) => {
      d.views = d.views.filter((v) => v.id !== id)
      for (const r of d.rooms) r.layers = r.layers.filter((l) => !(l.kind === 'view' && l.viewId === id))
    })
    const first = useApp.getState().project.views[0]
    useApp.setState({ activeViewId: first ? first.id : null })
  },
}

// Handy for debugging in the browser console during development.
if (import.meta.env?.DEV && typeof window !== 'undefined') (window as unknown as { __app: typeof useApp }).__app = useApp
