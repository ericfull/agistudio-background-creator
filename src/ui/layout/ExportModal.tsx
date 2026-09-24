import { Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { downloadBlob } from '../../export/download'
import { canvasToBlob, presetSize, renderPicture, rgbaToCanvas, screenIndices, SIZE_PRESETS, type ExportScreen } from '../../export/png'
import { sheetLayout, sheetRgba } from '../../export/spritesheet'
import { zipFiles } from '../../export/zip'
import { renderRoom } from '../../render/room'
import { useApp } from '../../state/store'
import type { Room } from '../../state/types'
import { Segmented, Select, Toggle } from '../common/Field'
import { TextButton } from '../common/IconButton'
import { Modal } from '../common/Modal'

const slug = (s: string) => s.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'untitled'

function PictureExport() {
  const project = useApp((s) => s.project)
  const activeRoomId = useApp((s) => s.activeRoomId)
  const [which, setWhich] = useState<'current' | 'all'>('current')
  const [screen, setScreen] = useState<ExportScreen>('visual')
  const [size, setSize] = useState('wide2')
  const [frame, setFrame] = useState(false)
  const [scanlines, setScanlines] = useState(false)
  const [busy, setBusy] = useState(false)
  const preset = SIZE_PRESETS.find((p) => p.id === size)!
  const room = project.rooms.find((r) => r.id === activeRoomId) ?? project.rooms[0]
  const opts = { screen, shape: preset.shape, scale: preset.scale, frame: frame && screen === 'visual', scanlines }

  const render = (r: Room) => {
    const c = renderRoom(r, project.views)
    const out = renderPicture(screenIndices(c.visual, c.priority, screen), opts)
    return rgbaToCanvas(out.w, out.h, out.rgba)
  }
  const preview = useMemo(() => render(room).toDataURL(), [room, project.views, screen, size, frame, scanlines]) // eslint-disable-line

  const suffix = screen === 'visual' ? '' : `-${screen}`
  const download = async () => {
    setBusy(true)
    try {
      if (which === 'current') {
        downloadBlob(await canvasToBlob(render(room)), `${slug(room.name)}${suffix}.png`)
      } else {
        const files: Record<string, Blob> = {}
        for (const [i, r] of project.rooms.entries()) files[`${String(i + 1).padStart(2, '0')}-${slug(r.name)}${suffix}.png`] = await canvasToBlob(render(r))
        downloadBlob(await zipFiles(files), `${slug(project.name)}-rooms${suffix}.zip`)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-center rounded border border-line bg-bg p-2">
        <img src={preview} alt="" className="max-h-56 max-w-full" style={{ imageRendering: 'pixelated' }} />
      </div>
      <Segmented
        value={which}
        onChange={setWhich}
        options={[
          { value: 'current', label: room.name, tip: 'Export the current room' },
          { value: 'all', label: `All rooms · ${project.rooms.length}`, tip: 'Export every room as a zip' },
        ]}
      />
      <Select
        label="Screen"
        value={screen}
        options={[
          { value: 'visual', label: 'Visual' },
          { value: 'priority', label: 'Priority' },
          { value: 'control', label: 'Control only' },
        ]}
        onChange={setScreen}
      />
      <Select
        label="Size"
        tip="Native: 160 × 168 AGI pixels. Wide: pixels doubled in width, as on the game screen. 4:3: also stretched to a TV's shape."
        value={size}
        options={SIZE_PRESETS.map((p) => {
          const d = presetSize(p, frame && screen === 'visual')
          return { value: p.id, label: `${p.name} · ${d.w} × ${d.h}` }
        })}
        onChange={setSize}
      />
      {screen === 'visual' && <Toggle label="Game frame" tip="Add an AGI status bar and text-input line (320 × 200 screen)" value={frame} onChange={setFrame} />}
      {preset.scale >= 2 && <Toggle label="Scanlines" tip="Darken every other row for a CRT look" value={scanlines} onChange={setScanlines} />}
      <div className="mt-1 flex justify-end">
        <TextButton primary onClick={download} disabled={busy}>
          <span className="flex items-center gap-1.5">
            <Download size={14} />
            {which === 'current' ? 'Download PNG' : 'Download zip'}
          </span>
        </TextButton>
      </div>
    </div>
  )
}

function SpriteExport() {
  const views = useApp((s) => s.project.views)
  const activeViewId = useApp((s) => s.activeViewId)
  const [id, setId] = useState(activeViewId ?? views[0]?.id ?? '')
  const [scale, setScale] = useState('wide1')
  const view = views.find((v) => v.id === id)
  useEffect(() => {
    if (!view && views[0]) setId(views[0].id)
  }, [view, views])
  const [xs, ys] = scale === 'native' ? [1, 1] : scale === 'wide1' ? [2, 1] : scale === 'wide2' ? [4, 2] : [8, 4]
  const layout = useMemo(() => (view ? sheetLayout(view, xs, ys, `${slug(view.name)}.png`) : null), [view, xs, ys])
  const canvas = useMemo(() => (view && layout ? rgbaToCanvas(layout.width, layout.height, sheetRgba(view, layout, xs, ys)) : null), [view, layout, xs, ys])
  if (!views.length) return <div className="py-6 text-center text-muted">No sprites in this project</div>
  const download = async () => {
    if (!view || !layout || !canvas) return
    const name = slug(view.name)
    const blob = await zipFiles({ [`${name}.png`]: await canvasToBlob(canvas), [`${name}.json`]: JSON.stringify(layout.json, null, 2) })
    downloadBlob(blob, `${name}-sheet.zip`)
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex max-h-64 items-center justify-center overflow-auto rounded border border-line bg-bg p-2">
        {canvas && <img src={canvas.toDataURL()} alt="" style={{ imageRendering: 'pixelated', width: Math.min(canvas.width * 2, 560) }} />}
      </div>
      <Select label="Sprite" value={id} options={views.map((v) => ({ value: v.id, label: v.name }))} onChange={setId} />
      <Select
        label="Pixels"
        tip="Size of each sprite pixel in the sheet. 2 × 1 matches the wide pixels seen in game."
        value={scale}
        options={[
          { value: 'native', label: '1 × 1' },
          { value: 'wide1', label: '2 × 1' },
          { value: 'wide2', label: '4 × 2' },
          { value: 'wide4', label: '8 × 4' },
        ]}
        onChange={setScale}
      />
      {layout && (
        <div className="text-[11px] text-muted" data-tip="PNG sheet plus JSON with frames and a tag per loop (Aseprite / TexturePacker format)">
          {layout.width} × {layout.height} · {layout.frames.length} frames
        </div>
      )}
      <div className="mt-1 flex justify-end">
        <TextButton primary onClick={download}>
          <span className="flex items-center gap-1.5">
            <Download size={14} />
            Download sheet + JSON
          </span>
        </TextButton>
      </div>
    </div>
  )
}

export function ExportModal() {
  const setUi = useApp((s) => s.setUi)
  const mode = useApp((s) => s.mode)
  const [tab, setTab] = useState<'picture' | 'sprites'>(mode === 'sprites' ? 'sprites' : 'picture')
  return (
    <Modal title="Export" onClose={() => setUi({ modal: null })} width={600}>
      <div className="mb-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'picture', label: 'Pictures', tip: 'Room pictures as PNG' },
            { value: 'sprites', label: 'Sprite sheets', tip: 'Sprite sheet PNG with frame data JSON' },
          ]}
        />
      </div>
      {tab === 'picture' ? <PictureExport /> : <SpriteExport />}
    </Modal>
  )
}
