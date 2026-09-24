import { get, set } from 'idb-keyval'
import { parseProject, serializeProject } from '../export/project'
import { useApp } from './store'

const KEY = 'agistudio-bg-creator/autosave'

export async function loadAutosave(): Promise<boolean> {
  try {
    const text = await get<string>(KEY)
    if (!text) return false
    const project = parseProject(text)
    useApp.setState({
      project,
      activeRoomId: project.rooms[0].id,
      selectedLayerId: null,
      activeViewId: project.views[0]?.id ?? null,
    })
    useApp.temporal.getState().clear()
    return true
  } catch {
    return false
  }
}

/** Saves the project to IndexedDB shortly after each change, and when the tab is hidden. */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let dirty = false
  const save = () => {
    clearTimeout(timer)
    if (!dirty) return
    dirty = false
    set(KEY, serializeProject(useApp.getState().project)).catch(() => {})
  }
  const unsub = useApp.subscribe((s, prev) => {
    if (s.project === prev.project) return
    dirty = true
    clearTimeout(timer)
    timer = setTimeout(save, 600)
  })
  const onHide = () => document.visibilityState === 'hidden' && save()
  document.addEventListener('visibilitychange', onHide)
  window.addEventListener('pagehide', save)
  return () => {
    save()
    document.removeEventListener('visibilitychange', onHide)
    window.removeEventListener('pagehide', save)
    unsub()
  }
}

// UI conveniences kept per browser
const UI_KEY = 'agistudio-bg-creator/ui'
export function loadUiPrefs(): void {
  try {
    const raw = localStorage.getItem(UI_KEY)
    if (!raw) return
    const v = JSON.parse(raw)
    useApp.setState({
      leftOpen: v.leftOpen ?? true,
      rightOpen: v.rightOpen ?? true,
      zoom: v.zoom ?? 3,
      zoomFit: v.zoomFit ?? true,
      crtAspect: v.crtAspect ?? true,
      libraryTheme: v.libraryTheme ?? 'all',
    })
  } catch {
    /* storage unavailable */
  }
}

export function startUiPrefs(): () => void {
  return useApp.subscribe((s, p) => {
    if (s.leftOpen === p.leftOpen && s.rightOpen === p.rightOpen && s.zoom === p.zoom && s.zoomFit === p.zoomFit && s.crtAspect === p.crtAspect && s.libraryTheme === p.libraryTheme) return
    try {
      localStorage.setItem(UI_KEY, JSON.stringify({ leftOpen: s.leftOpen, rightOpen: s.rightOpen, zoom: s.zoom, zoomFit: s.zoomFit, crtAspect: s.crtAspect, libraryTheme: s.libraryTheme }))
    } catch {
      /* storage unavailable */
    }
  })
}
