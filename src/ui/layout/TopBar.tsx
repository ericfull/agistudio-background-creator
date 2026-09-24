import { Download, FilePlus2, FolderOpen, Footprints, Image as ImageIcon, Menu, Redo2, Save, Undo2, Users } from 'lucide-react'
import { useRef } from 'react'
import { useStore } from 'zustand'
import { parseProject, serializeProject } from '../../export/project'
import { defaultProject, redo, undo, useApp, type Mode } from '../../state/store'
import { IconButton } from '../common/IconButton'
import { MenuButton } from '../common/Menu'
import { downloadBlob } from '../../export/download'

const MODES: { id: Mode; label: string; icon: typeof ImageIcon; tip: string }[] = [
  { id: 'rooms', label: 'Rooms', icon: ImageIcon, tip: 'Build backgrounds' },
  { id: 'sprites', label: 'Sprites', icon: Users, tip: 'Edit characters and animated props' },
  { id: 'walk', label: 'Test Walk', icon: Footprints, tip: 'Walk a character through the room to test depth and walls' },
]

export function openProjectFile(file: File): void {
  file.text().then((text) => {
    try {
      const project = parseProject(text)
      useApp.setState({ project, activeRoomId: project.rooms[0].id, selectedLayerId: null, activeViewId: project.views[0]?.id ?? null })
      useApp.temporal.getState().clear()
    } catch (err) {
      alert((err as Error).message)
    }
  })
}

export function saveProjectFile(): void {
  const p = useApp.getState().project
  const name = (p.name || 'project').replace(/[^\w-]+/g, '-').toLowerCase()
  downloadBlob(new Blob([serializeProject(p)], { type: 'application/json' }), `${name}.agibg.json`)
}

export function TopBar() {
  const mode = useApp((s) => s.mode)
  const name = useApp((s) => s.project.name)
  const setUi = useApp((s) => s.setUi)
  const canUndo = useStore(useApp.temporal, (t) => t.pastStates.length > 0)
  const canRedo = useStore(useApp.temporal, (t) => t.futureStates.length > 0)
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line bg-panel px-2">
      <input
        ref={fileInput}
        id="open-project-input"
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) openProjectFile(f)
          e.target.value = ''
        }}
      />
      <MenuButton
        icon={Menu}
        tip="Project"
        items={[
          {
            label: 'New project',
            icon: FilePlus2,
            onClick: () => {
              if (!confirm('Start a new project? Unsaved changes in this one will be lost.')) return
              const p = defaultProject()
              useApp.setState({ project: p, activeRoomId: p.rooms[0].id, selectedLayerId: null, activeViewId: null })
              useApp.temporal.getState().clear()
            },
          },
          { label: 'Open…', icon: FolderOpen, shortcut: '⌘O', onClick: () => fileInput.current?.click() },
          { label: 'Save', icon: Save, shortcut: '⌘S', onClick: saveProjectFile },
        ]}
      />
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={name}
          aria-label="Project name"
          data-tip="Project name"
          onChange={(e) => useApp.getState().mutate((d) => void (d.name = e.target.value))}
          className="w-44 border-transparent! bg-transparent! font-semibold hover:border-line! focus:border-accent!"
        />
      </div>
      <div className="flex flex-1 justify-center">
        <nav className="flex rounded-md border border-line bg-bg p-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              data-tip={m.tip}
              onClick={() => setUi({ mode: m.id })}
              className={`flex h-7 items-center gap-1.5 rounded px-3 text-[12px] font-medium ${mode === m.id ? 'bg-accent text-bg' : 'text-muted hover:text-text'}`}
            >
              <m.icon size={14} />
              {m.label}
            </button>
          ))}
        </nav>
      </div>
      <IconButton icon={Undo2} tip="Undo" tipKey="⌘Z" disabled={!canUndo} onClick={undo} />
      <IconButton icon={Redo2} tip="Redo" tipKey="⇧⌘Z" disabled={!canRedo} onClick={redo} />
      <IconButton icon={Save} tip="Save project" tipKey="⌘S" onClick={saveProjectFile} />
      <button
        type="button"
        data-tip="Export PNGs and sprite sheets"
        onClick={() => setUi({ modal: 'export' })}
        className="ml-1 flex h-7 items-center gap-1.5 rounded bg-accent px-3 text-[12px] font-semibold text-bg hover:bg-text"
      >
        <Download size={14} />
        Export
      </button>
    </header>
  )
}
