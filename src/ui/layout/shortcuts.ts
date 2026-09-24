import { useEffect } from 'react'
import { randomSeed } from '../../agi/rng'
import { actions, redo, selectedLayer, undo, useApp, type Screen, type Tool } from '../../state/store'
import { saveProjectFile } from './TopBar'

const TOOL_KEYS: Record<string, Tool> = { v: 'select', l: 'line', k: 'step', f: 'fill', b: 'pen', i: 'picker' }
const SCREEN_KEYS: Record<string, Screen> = { '1': 'visual', '2': 'priority', '3': 'control', '4': 'overlay' }

function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null
  if (!t) return false
  return t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA' || t.isContentEditable
}

export function useShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useApp.getState()
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        if (typing(e)) return
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && key === 'y') {
        e.preventDefault()
        redo()
        return
      }
      if (mod && key === 's') {
        e.preventDefault()
        saveProjectFile()
        return
      }
      if (mod && key === 'o') {
        e.preventDefault()
        document.getElementById('open-project-input')?.click()
        return
      }
      if (typing(e) || s.modal) return
      if (e.key === '[' && !mod) {
        s.setUi({ leftOpen: !s.leftOpen })
        return
      }
      if (e.key === ']' && !mod) {
        s.setUi({ rightOpen: !s.rightOpen })
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        const anyOpen = s.leftOpen || s.rightOpen
        s.setUi({ leftOpen: !anyOpen, rightOpen: !anyOpen })
        return
      }
      if (s.mode !== 'rooms') return
      if (!mod && TOOL_KEYS[key]) {
        s.setUi({ tool: TOOL_KEYS[key] })
        return
      }
      if (!mod && SCREEN_KEYS[key]) {
        s.setUi({ screen: SCREEN_KEYS[key] })
        return
      }
      const zoom = s.zoomFit ? s.fitZoom : s.zoom
      if (!mod && (key === '=' || key === '+')) return s.setUi({ zoom: Math.min(6, zoom + 0.5), zoomFit: false })
      if (!mod && key === '-') return s.setUi({ zoom: Math.max(0.5, zoom - 0.5), zoomFit: false })
      if (!mod && key === '0') return s.setUi({ zoomFit: true })
      if (!mod && key === 'g') return s.setUi({ guides: { ...s.guides, grid: !s.guides.grid } })
      const layer = selectedLayer(s)
      if (!layer) return
      if (key === 'escape') return s.setUi({ selectedLayerId: null })
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        actions.removeLayer(layer.id)
        return
      }
      if (mod && key === 'd') {
        e.preventDefault()
        actions.duplicateLayer(layer.id)
        return
      }
      if (mod && e.key === ']') return actions.moveLayer(layer.id, 1)
      if (mod && e.key === '[') return actions.moveLayer(layer.id, -1)
      if (layer.locked) return
      if (!mod && key === 'h' && layer.kind === 'element') return actions.updateLayer(layer.id, (l) => void (l.kind === 'element' && (l.flipX = !l.flipX)))
      if (!mod && key === 'r' && layer.kind === 'element') return actions.updateLayer(layer.id, (l) => void (l.kind === 'element' && (l.seed = randomSeed())))
      const step = e.shiftKey ? 5 : 1
      const nudge: Record<string, [number, number]> = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }
      const d = nudge[key]
      if (d && (layer.kind === 'element' || layer.kind === 'view')) {
        e.preventDefault()
        actions.updateLayer(layer.id, (l) => {
          if (l.kind === 'element' || l.kind === 'view') {
            l.x += d[0]
            l.y = Math.max(0, Math.min(167, l.y + d[1]))
          }
        })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
