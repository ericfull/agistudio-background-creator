import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Dices, Link2, Plus, Trash2, type LucideIcon } from 'lucide-react'
import { connectedRooms, planNeighbor, roomAt, rollRoom } from '../../generator'
import { newRoom } from '../../state/factory'
import { actions, useActiveRoom, useApp } from '../../state/store'
import type { Dir } from '../../state/types'
import { IconButton } from '../common/IconButton'
import { Section } from '../common/Section'

const DIRS: { dir: Dir; icon: LucideIcon; name: string; col: number; row: number }[] = [
  { dir: 'n', icon: ArrowUp, name: 'north', col: 2, row: 1 },
  { dir: 'w', icon: ArrowLeft, name: 'west', col: 1, row: 2 },
  { dir: 'e', icon: ArrowRight, name: 'east', col: 3, row: 2 },
  { dir: 's', icon: ArrowDown, name: 'south', col: 2, row: 3 },
]

function Compass() {
  const room = useActiveRoom()
  const rooms = useApp((s) => s.project.rooms)
  return (
    <div className="grid grid-cols-[28px_1fr_28px] grid-rows-[28px_28px_28px] items-center justify-items-center gap-0.5">
      {DIRS.map(({ dir, icon, name, col, row }) => {
        const linked = rooms.find((r) => r.id === room.links[dir])
        const spot = linked ? undefined : roomAt(room, dir, rooms)
        return (
          <div key={dir} style={{ gridColumn: col, gridRow: row }}>
            {linked ? (
              <IconButton icon={icon} tip={`Go ${name}: ${linked.name}`} onClick={() => actions.setActiveRoom(linked.id)} />
            ) : (
              <IconButton
                icon={spot ? Link2 : Plus}
                tip={spot ? `Link to ${spot.name} (${name})` : `Generate a matching room to the ${name}`}
                onClick={() => actions.applyNeighbor(room.id, dir, planNeighbor(room, dir, rooms))}
              />
            )}
          </div>
        )
      })}
      <div className="flex h-7 w-full items-center justify-center truncate rounded border border-accent px-2 text-[11px]" style={{ gridColumn: 2, gridRow: 2 }}>
        {room.name}
      </div>
    </div>
  )
}

/** Map of the rooms linked to the active one, laid out by map position. */
function RoomMap() {
  const room = useActiveRoom()
  const rooms = useApp((s) => s.project.rooms)
  const group = connectedRooms(room, rooms).filter((r) => r.mapPos || r.id === room.id)
  if (group.length < 2) return null
  const pos = (r: typeof room) => r.mapPos ?? { x: 0, y: 0 }
  const xs = group.map((r) => pos(r).x)
  const ys = group.map((r) => pos(r).y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const cols = Math.max(...xs) - minX + 1
  const rows = Math.max(...ys) - minY + 1
  const cell = Math.max(14, Math.min(30, Math.floor(236 / Math.max(cols, rows * 1.6))))
  const W = cols * cell
  const H = rows * Math.round(cell * 0.62)
  const ch = Math.round(cell * 0.62)
  return (
    <div className="mt-2 flex justify-center">
      <div className="relative" style={{ width: W, height: H }}>
        {group.map((r) => {
          const p = pos(r)
          const x = (p.x - minX) * cell
          const y = (p.y - minY) * ch
          return (
            <button
              key={r.id}
              type="button"
              data-tip={r.name}
              aria-label={r.name}
              onClick={() => actions.setActiveRoom(r.id)}
              className={`absolute rounded-sm border ${r.id === room.id ? 'border-accent bg-accent' : 'border-line bg-bg hover:border-muted'}`}
              style={{ left: x + 2, top: y + 2, width: cell - 4, height: ch - 4 }}
            />
          )
        })}
      </div>
    </div>
  )
}

export function RoomsSection() {
  const rooms = useApp((s) => s.project.rooms)
  const activeId = useApp((s) => s.activeRoomId)
  const theme = useApp((s) => s.libraryTheme)
  return (
    <Section
      id="rooms"
      title={`Rooms · ${rooms.length}`}
      actions={
        <>
          <IconButton icon={Dices} size="sm" tip="Roll a random room" onClick={() => actions.addRoom(rollRoom(theme === 'all' ? undefined : theme))} />
          <IconButton icon={Plus} size="sm" tip="New empty room" onClick={() => actions.addRoom(newRoom({ name: `Room ${rooms.length + 1}` }))} />
        </>
      }
    >
      <Compass />
      <RoomMap />
      <div className="mt-2 flex max-h-40 flex-col overflow-y-auto">
        {rooms.map((r) => (
          <div
            key={r.id}
            onClick={() => actions.setActiveRoom(r.id)}
            className={`group flex h-7 items-center gap-1 rounded px-1.5 ${r.id === activeId ? 'bg-line shadow-[inset_2px_0_0_var(--color-accent)]' : 'hover:bg-line'}`}
          >
            <span className="flex-1 truncate text-[12px]">{r.name}</span>
            {rooms.length > 1 && (
              <span className="opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                <IconButton icon={Trash2} size="sm" danger tip="Delete room" onClick={() => actions.removeRoom(r.id)} />
              </span>
            )}
          </div>
        ))}
      </div>
    </Section>
  )
}
