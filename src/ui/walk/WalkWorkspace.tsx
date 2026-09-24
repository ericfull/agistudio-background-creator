import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Droplet, Image as ImageIcon, Rows3 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LayerRaster } from '../../agi/compose'
import { PIC_H, PIC_W } from '../../agi/constants'
import { paintScreen } from '../../render/draw'
import { rasterView, renderRoom } from '../../render/room'
import { BUILTIN_VIEWS } from '../../sprites/library'
import { resolveCel } from '../../sprites/render'
import type { View } from '../../sprites/types'
import { actions, useActiveRoom, useApp, useRowScale, type Screen } from '../../state/store'
import type { Dir } from '../../state/types'
import { drawEgo, egoPriority, entryPoint, findSpawn, LOOP_FOR, step, type Ego, type WalkEnv } from '../../walk/simulate'
import { Field, Select, Slider, Toggle } from '../common/Field'
import { IconButton } from '../common/IconButton'
import { Section } from '../common/Section'
import { SidePanel } from '../common/SidePanel'
import { CelView } from '../sprites/CelView'
import { AspectToggle, useFitZoom } from '../rooms/CanvasArea'

const KEY_DIR: Record<string, Dir> = {
  arrowup: 'n', w: 'n', arrowdown: 's', s: 's', arrowleft: 'w', a: 'w', arrowright: 'e', d: 'e',
}
const DIR_NAME: Record<Dir, string> = { n: 'north', s: 'south', e: 'east', w: 'west' }

interface Status {
  x: number
  y: number
  band: number
  water: boolean
  trigger: boolean
  note: string
}

function useCharacter(): [View | null, (id: string) => void] {
  const views = useApp((s) => s.project.views)
  const [id, setId] = useState<string | null>(null)
  const chars = views.filter((v) => v.kind === 'character' && v.loops.length >= 4)
  const view = chars.find((v) => v.id === id) ?? chars[0] ?? null
  return [view, setId]
}

export function WalkWorkspace() {
  const room = useActiveRoom()
  const views = useApp((s) => s.project.views)
  const rightOpen = useApp((s) => s.rightOpen)
  const setUi = useApp((s) => s.setUi)
  const [character, setCharacter] = useCharacter()
  const [screen, setScreen] = useState<Screen>('visual')
  const [condBlocks, setCondBlocks] = useState(true)
  const [speed, setSpeed] = useState(12)
  const [status, setStatus] = useState<Status | null>(null)
  const [areaRef, fit] = useFitZoom(56, 24)
  const cvRef = useRef<HTMLCanvasElement>(null)

  const ego = useRef<(Ego & { dir: Dir | null; loop: number; cel: number }) | null>(null)
  const roomRef = useRef(room)
  roomRef.current = room
  const charRef = useRef(character)
  charRef.current = character

  const composed = useMemo(() => renderRoom(room, views), [room, views])
  const env: WalkEnv = useMemo(
    () => ({ priority: composed.priority, horizon: room.horizon, priorityBase: room.priorityBase, condBlocks }),
    [composed, room.horizon, room.priorityBase, condBlocks],
  )
  const animated = room.layers.filter((l) => l.kind === 'view' && l.animate && l.visible)

  // spawn when the room or character changes
  useEffect(() => {
    if (!character) {
      ego.current = null
      return
    }
    const cel = resolveCel(character, 2, 0) ?? resolveCel(character, 0, 0)
    if (!cel) return
    const prev = ego.current
    if (prev && prev.w === cel.w) return
    const spot = findSpawn(env, cel.w, 80, 150)
    ego.current = spot ? { x: spot.x, y: spot.y, w: cel.w, h: cel.h, dir: null, loop: 2, cel: 0 } : null
  }, [character, room.id])

  // input: AGI style — a direction key starts walking, the same key stops
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || e.metaKey || e.ctrlKey) return
      const dir = KEY_DIR[e.key.toLowerCase()]
      if (!dir || !ego.current) return
      e.preventDefault()
      if (e.repeat) return
      const eg = ego.current
      eg.dir = eg.dir === dir ? null : dir
      eg.loop = LOOP_FOR[dir]
      // collision width follows the loop's cels, as in AGI
      const c = charRef.current ? resolveCel(charRef.current, eg.loop, 0) : null
      if (c) {
        eg.w = c.w
        eg.h = c.h
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // game loop
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const t0 = performance.now()
    const img = new ImageData(PIC_W, PIC_H)
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // cap catch-up so a hidden tab doesn't teleport the character
      acc = Math.min(acc + (now - last), 250)
      last = now
      const e = ego.current
      const interval = 1000 / speed
      while (acc >= interval) {
        acc -= interval
        if (!e || !e.dir || !character) continue
        const r = step(env, e, e.dir)
        if (r.kind === 'moved') {
          e.x = r.x
          e.y = r.y
          e.cel++
          setStatus({ x: e.x, y: e.y, band: egoPriority(env, e.y), water: r.water, trigger: r.trigger, note: r.trigger ? 'Trigger' : '' })
        } else if (r.kind === 'blocked') {
          e.dir = null
          e.cel = 0
          setStatus((s) => (s ? { ...s, note: 'Blocked' } : s))
        } else {
          const cur = roomRef.current
          const next = cur.links[r.dir]
          if (next) {
            const nextRoom = useApp.getState().project.rooms.find((x) => x.id === next)
            if (nextRoom) {
              const nEnv = { priority: renderRoom(nextRoom, useApp.getState().project.views).priority, horizon: nextRoom.horizon, priorityBase: nextRoom.priorityBase, condBlocks }
              const p = entryPoint(nEnv, r.dir, e)
              if (p) {
                e.x = p.x
                e.y = p.y
              }
              actions.setActiveRoom(next)
              setStatus((s) => (s ? { ...s, note: `Entered ${nextRoom.name}` } : s))
              // this frame's walls belong to the old room
              acc = 0
              break
            }
          } else {
            e.dir = null
            setStatus((s) => (s ? { ...s, note: `Edge: ${DIR_NAME[r.dir]} (no linked room)` } : s))
          }
        }
      }
      // draw
      const cv = cvRef.current
      if (!cv) return
      const ctx = cv.getContext('2d')!
      let pic = composed
      if (animated.length) {
        const override = new Map<string, LayerRaster>()
        for (const l of animated) {
          if (l.kind !== 'view') continue
          const v = views.find((vv) => vv.id === l.viewId)
          const f = Math.floor(((now - t0) / 1000) * (v?.fps ?? 8))
          override.set(l.id, rasterView(l, v, f))
        }
        pic = renderRoom(roomRef.current, views, { override })
      }
      const visual = pic.visual.slice()
      if (e && character) {
        const cel = resolveCel(character, e.loop, e.dir ? e.cel : 0)
        if (cel) drawEgo(visual, pic.priority, cel, e.x, e.y, egoPriority(env, e.y))
      }
      paintScreen(img, { visual, priority: pic.priority }, screen)
      ctx.putImageData(img, 0, 0)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [env, composed, character, screen, speed, views, animated.length, condBlocks])

  const chars = views.filter((v) => v.kind === 'character' && v.loops.length >= 4)
  const builtinChars = BUILTIN_VIEWS.filter((v) => v.kind === 'character')
  const rowScale = useRowScale()
  const W = PIC_W * 2 * fit
  const H = Math.round(PIC_H * fit * rowScale)

  const placeEgo = (e: React.PointerEvent) => {
    if (!ego.current) return
    const r = cvRef.current!.getBoundingClientRect()
    const x = Math.floor((e.clientX - r.left) / (2 * fit))
    const y = Math.floor((e.clientY - r.top) / (fit * rowScale))
    const spot = findSpawn(env, ego.current.w, x, y)
    if (spot) {
      ego.current.x = spot.x
      ego.current.y = spot.y
      ego.current.dir = null
      setStatus({ x: spot.x, y: spot.y, band: egoPriority(env, spot.y), water: false, trigger: false, note: 'Placed' })
    }
  }

  return (
    <div className="flex min-h-0 flex-1 pt-2">
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-1 px-7">
          <div className="flex items-center gap-0.5 rounded-md border border-line bg-panel p-0.5 shadow-panel">
            <IconButton icon={ImageIcon} tip="Visual screen" active={screen === 'visual'} onClick={() => setScreen('visual')} />
            <IconButton icon={Rows3} tip="Priority screen" active={screen === 'priority'} onClick={() => setScreen('priority')} />
            <IconButton icon={Droplet} tip="Control screen" active={screen === 'control'} onClick={() => setScreen('control')} />
            <div className="mx-1 h-5 w-px bg-line" />
            <AspectToggle />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3 text-[11px] text-muted">
            {status && (
              <>
                <span>
                  {status.x}, {status.y}
                </span>
                <span>Band {status.band}</span>
                {status.water && <span className="text-accent">In water</span>}
                {status.note && <span className="text-accent">{status.note}</span>}
              </>
            )}
          </div>
        </div>
        <div ref={areaRef} className="flex min-h-0 flex-1 overflow-hidden">
          <div className="m-auto p-6">
            <canvas
              ref={cvRef}
              width={PIC_W}
              height={PIC_H}
              className="pixel shadow-panel"
              style={{ width: W, height: H, cursor: 'crosshair' }}
              onPointerDown={placeEgo}
            />
          </div>
        </div>
      </div>
      <SidePanel side="right" open={rightOpen} onToggle={() => setUi({ rightOpen: !rightOpen })} tip={rightOpen ? 'Hide options' : 'Show options'} tipKey="]">
        <div className="flex h-full flex-col overflow-y-auto">
          <Section id="walk-character" title="Character">
            {chars.length > 0 ? (
              <div className="flex flex-col gap-1">
                <Select label="Sprite" value={character?.id ?? ''} options={chars.map((v) => ({ value: v.id, label: v.name }))} onChange={setCharacter} />
                {character && (
                  <div className="flex justify-center rounded border border-line bg-bg p-2">
                    <CelView view={character} loop={2} cel={0} box={72} />
                  </div>
                )}
              </div>
            ) : null}
            <div className="mt-2 grid grid-cols-4 gap-1">
              {builtinChars.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  data-tip={`Walk as ${v.name}`}
                  onClick={() => {
                    const copy = actions.projectCopyOf(v)
                    setCharacter(copy.id)
                    ego.current = null
                  }}
                  className="flex h-14 items-center justify-center rounded border border-line bg-bg hover:border-accent"
                >
                  <CelView view={v} loop={2} cel={0} box={44} />
                </button>
              ))}
            </div>
          </Section>
          <Section id="walk-options" title="Options">
            <Slider label="Speed" tip="Steps per second" min={2} max={30} value={speed} onChange={setSpeed} />
            <Toggle label="Cond. walls" tip="Blue conditional walls block the character" value={condBlocks} onChange={setCondBlocks} />
            <Field label="Controls">
              <span className="flex gap-0.5 text-muted" data-tip="Arrow keys or WASD; press the same direction again to stop">
                <ArrowUp size={13} />
                <ArrowDown size={13} />
                <ArrowLeft size={13} />
                <ArrowRight size={13} />
              </span>
              <span className="text-muted" data-tip="Click the picture to place the character">
                <Crosshair size={13} />
              </span>
            </Field>
          </Section>
        </div>
      </SidePanel>
    </div>
  )
}
