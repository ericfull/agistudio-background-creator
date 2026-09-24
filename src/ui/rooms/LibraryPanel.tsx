import { Dices, Search } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { ELEMENTS } from '../../library'
import { STARTERS } from '../../library/starters'
import { CATEGORIES, type ElementDef } from '../../library/types'
import { elementThumb, roomThumb } from '../../render/thumbs'
import { elementLayer, newRoom } from '../../state/factory'
import { actions, useApp } from '../../state/store'
import { THEMES, type Theme } from '../../state/types'
import { Segmented } from '../common/Field'
import { IconButton } from '../common/IconButton'
import { Section } from '../common/Section'
import { DND_ELEMENT, DND_VIEW } from './RoomCanvas'
import { BUILTIN_VIEWS } from '../../sprites/library'
import type { View } from '../../sprites/types'
import { CelView } from '../sprites/CelView'
import { viewLayer } from '../../state/factory'
import { rollRoom } from '../../generator'

const TILE_W = 120
const TILE_H = 72

function useVisible<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true)
        io.disconnect()
      }
    })
    io.observe(el)
    return () => io.disconnect()
  }, [visible])
  return [ref, visible]
}

const ElementTile = memo(function ElementTile({ def }: { def: ElementDef }) {
  const [ref, visible] = useVisible<HTMLButtonElement>()
  const url = useMemo(() => (visible ? elementThumb(def.id, TILE_W * 2, TILE_H * 2) : null), [visible, def.id])
  return (
    <button
      ref={ref}
      type="button"
      draggable
      data-tip={def.name}
      aria-label={def.name}
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_ELEMENT, def.id)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      onClick={() => {
        actions.addLayer(elementLayer(def.id))
        useApp.getState().setUi({ tool: 'select' })
      }}
      className="flex items-center justify-center overflow-hidden rounded border border-line bg-bg hover:border-accent"
      style={{ height: TILE_H }}
    >
      {url && <img src={url} alt="" draggable={false} className="pixel h-full w-full object-contain" style={{ imageRendering: 'pixelated' }} />}
    </button>
  )
})

function StarterTile({ id }: { id: string }) {
  const starter = STARTERS.find((s) => s.id === id)!
  const [ref, visible] = useVisible<HTMLButtonElement>()
  const url = useMemo(() => {
    if (!visible) return null
    try {
      return roomThumb(newRoom({ ...starter.build(11) }), [], TILE_W * 2, Math.round(TILE_W * 1.05))
    } catch {
      return null
    }
  }, [visible, starter])
  return (
    <button
      ref={ref}
      type="button"
      data-tip={`${starter.name} — ${starter.description}`}
      aria-label={starter.name}
      onClick={() => {
        const seed = Math.floor(Math.random() * 1e9)
        actions.addRoom(newRoom({ name: starter.name, theme: starter.theme, ...starter.build(seed) }))
      }}
      className="overflow-hidden rounded border border-line bg-bg hover:border-accent"
    >
      {url && <img src={url} alt="" draggable={false} className="block w-full" style={{ imageRendering: 'pixelated' }} />}
    </button>
  )
}

export function LibraryPanel() {
  const theme = useApp((s) => s.libraryTheme)
  const query = useApp((s) => s.libraryQuery)
  const setUi = useApp((s) => s.setUi)
  const [tab, setTab] = useState<'elements' | 'starters' | 'sprites'>('elements')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ELEMENTS.filter((e) => (theme === 'all' || e.themes.includes(theme)) && (!q || e.name.toLowerCase().includes(q) || e.tags?.some((t) => t.includes(q)) || e.id.includes(q)))
  }, [theme, query])

  const starters = STARTERS.filter((s) => theme === 'all' || s.theme === theme)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-2 border-b border-line p-2">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'elements', label: 'Elements', tip: 'Ready-made elements to place in the room' },
            { value: 'starters', label: 'Rooms', tip: 'Ready-made rooms to start from' },
            { value: 'sprites', label: 'Sprites', tip: 'Stamp sprites into the picture (AGI add-to-picture)' },
          ]}
        />
        <div className="flex items-center gap-1">
          <select className="w-[92px] shrink-0" value={theme} onChange={(e) => setUi({ libraryTheme: e.target.value as Theme | 'all' })} data-tip="Theme">
            <option value="all">All</option>
            {THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="relative min-w-0 flex-1">
            <Search size={12} className="pointer-events-none absolute top-1/2 left-1.5 -translate-y-1/2 text-muted" />
            <input
              type="text"
              className="w-full pl-5"
              value={query}
              onChange={(e) => setUi({ libraryQuery: e.target.value })}
              aria-label="Search elements"
              data-tip="Search by name or tag"
            />
          </div>
          <IconButton
            icon={Dices}
            tip={`Roll a random ${theme === 'all' ? '' : THEMES.find((t) => t.id === theme)?.label + ' '}room`}
            onClick={() => actions.addRoom(rollRoom(theme === 'all' ? undefined : theme))}
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === 'elements' ? (
          CATEGORIES.map((cat) => {
            const items = filtered.filter((e) => e.category === cat.id)
            if (!items.length) return null
            return (
              <Section key={cat.id} id={`lib-${cat.id}`} title={`${cat.label} · ${items.length}`}>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((def) => (
                    <ElementTile key={def.id} def={def} />
                  ))}
                </div>
              </Section>
            )
          })
        ) : tab === 'starters' ? (
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {starters.map((s) => (
              <StarterTile key={s.id} id={s.id} />
            ))}
          </div>
        ) : (
          <SpriteStamps theme={theme} />
        )}
      </div>
    </div>
  )
}

function stamp(view: View, x = 72, y = 140) {
  const views = useApp.getState().project.views
  const target = views.find((v) => v.id === view.id) ?? actions.projectCopyOf(view)
  actions.addLayer(viewLayer(target.id, x, y, target.name))
  useApp.getState().setUi({ tool: 'select' })
}

function SpriteTile({ view, builtin }: { view: View; builtin: boolean }) {
  const thumbLoop = view.loops.length > 2 ? 2 : 0
  return (
    <button
      type="button"
      draggable={!builtin}
      onDragStart={(e) => e.dataTransfer.setData(DND_VIEW, view.id)}
      data-tip={builtin ? `${view.name} (adds a copy to the project)` : view.name}
      onClick={() => stamp(view)}
      className="flex h-16 items-center justify-center rounded border border-line bg-bg hover:border-accent"
    >
      <CelView view={view} loop={thumbLoop} cel={0} box={52} />
    </button>
  )
}

function SpriteStamps({ theme }: { theme: Theme | 'all' }) {
  const views = useApp((s) => s.project.views)
  const builtins = BUILTIN_VIEWS.filter((v) => theme === 'all' || v.theme === theme)
  return (
    <>
      {views.length > 0 && (
        <Section id="lib-project-sprites" title={`Project · ${views.length}`}>
          <div className="grid grid-cols-3 gap-1.5">
            {views.map((v) => (
              <SpriteTile key={v.id} view={v} builtin={false} />
            ))}
          </div>
        </Section>
      )}
      <Section id="lib-builtin-sprites" title={`Library · ${builtins.length}`}>
        <div className="grid grid-cols-3 gap-1.5">
          {builtins.map((v) => (
            <SpriteTile key={v.id} view={v} builtin />
          ))}
        </div>
      </Section>
    </>
  )
}
