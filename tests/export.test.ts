import { describe, expect, it } from 'vitest'
import { parseProject, serializeProject } from '../src/export/project'
import { renderPicture, screenIndices } from '../src/export/png'
import { sheetLayout } from '../src/export/spritesheet'
import { newView } from '../src/sprites/edit'
import { defaultProject } from '../src/state/store'

describe('project files', () => {
  it('round-trips through JSON', () => {
    const p = defaultProject()
    const back = parseProject(serializeProject(p))
    expect(back).toEqual(p)
  })
  it('rejects other JSON with a readable message', () => {
    expect(() => parseProject('{"kind":"something-else","rooms":[{}]}')).toThrow(/not an AGIStudio/)
    expect(() => parseProject('nope')).toThrow(/JSON/)
    expect(() => parseProject('{"rooms":[]}')).toThrow(/no rooms/)
  })
})

describe('picture export', () => {
  const visual = new Uint8Array(160 * 168).fill(9)
  const priority = new Uint8Array(160 * 168).fill(4)
  priority[0] = 0
  it('sizes each preset correctly', () => {
    expect(renderPicture(visual, { screen: 'visual', shape: 'native', scale: 1, frame: false, scanlines: false })).toMatchObject({ w: 160, h: 168 })
    expect(renderPicture(visual, { screen: 'visual', shape: 'wide', scale: 2, frame: false, scanlines: false })).toMatchObject({ w: 640, h: 336 })
    expect(renderPicture(visual, { screen: 'visual', shape: 'aspect', scale: 2, frame: false, scanlines: false })).toMatchObject({ w: 640, h: 403 })
    expect(renderPicture(visual, { screen: 'visual', shape: 'wide', scale: 1, frame: true, scanlines: false })).toMatchObject({ w: 320, h: 200 })
  })
  it('maps control pixels and hides priorities in the control screen', () => {
    const c = screenIndices(visual, priority, 'control')
    expect(c[0]).toBe(0)
    expect(c[1]).toBe(15)
  })
})

describe('sprite sheets', () => {
  it('lays out one row per loop with a tag each', () => {
    const v = newView('Hero')
    v.loops[0].cels.push({ ...v.loops[0].cels[0] })
    const L = sheetLayout(v, 2, 1, 'hero.png')
    expect(L.frames.length).toBe(2 + 2 + 1 + 1) // right x2, left mirrors right x2, down, up
    expect(L.width).toBe(2 * 9 * 2)
    expect(L.height).toBe(4 * 32)
    const meta = (L.json as { meta: { frameTags: { name: string; from: number; to: number }[] } }).meta
    expect(meta.frameTags.map((t) => t.name)).toEqual(['right', 'left', 'down', 'up'])
    expect(meta.frameTags[1]).toMatchObject({ from: 2, to: 3 })
    // Phaser's createFromAseprite looks frames up by their index as a string
    const frames = (L.json as { frames: Record<string, unknown> }).frames
    expect(Object.keys(frames)).toEqual(['0', '1', '2', '3', '4', '5'])
  })
})
