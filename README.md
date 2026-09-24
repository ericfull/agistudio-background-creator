# AGIStudio Background Creator

A web app for making Sierra AGI-style backgrounds and sprites (King's Quest, Space Quest, Police Quest, Leisure Suit Larry era). Build rooms from a library of adjustable, ready-made elements, recolor them, draw over them with real AGI tools, and walk a character through the result to test depth and walls.

## Run it

```bash
npm install
npm run dev
```

```bash
npm test          # AGI core, element library QA, walk, export tests
npm run build     # type check + production build
```

## What it does

- **Strict AGI pictures:** 160×168 with 2:1 wide pixels shown in the 4:3 CRT shape the games were seen in (toggle for raw pixels), 16 EGA colors, and AGI's own line, fill and pen rules. Three screens: Visual, Priority (depth bands 4–15) and Control (walls, conditional walls, triggers, water).
- **Element library:** Nature, Fantasy, Sci-fi, Modern and Spooky elements. Each has sliders, a random variation seed and recolorable color roles. Elements that stand on the ground get their depth from their base, and scale with perspective.
- **Mix, match, augment:** layers, drag and scale on the canvas, hand-drawn paint layers (line, step line, fill, pen with AGI brushes and splatter), "explode" an element into editable commands, stamp sprites into the picture.
- **Recolor:** per-element color roles, a room-wide color swap (bakeable), and mood remaps (Dusk, Night, Storm, Autumn, Winter, Haunted).
- **Rooms:** ready-made starters, "roll a room", and matching neighbor rooms linked north/south/east/west.
- **Sprites:** AGI views with loops and cels, mirrored loops, onion skinning, color roles, and a built-in library of characters and animated props.
- **Test walk:** walk a character with the arrow keys, AGI-style. It is hidden behind things with higher priority, stopped by walls, and moves into linked rooms at the edges.
- **Export:** PNG (native, wide, scaled, 4:3 corrected, framed with an AGI status bar, scanlines), priority and control PNGs, all rooms as a zip, sprite sheets with Aseprite/TexturePacker JSON, and project JSON.

## Code map

| Path | What |
|---|---|
| `src/agi/` | Pure AGI core: palette, commands, rasterizer (ported from ScummVM's AGI picture code), pens, priority bands, composition, moods |
| `src/kit/` | Drawing kit for element authors (local coordinates, solid fills, control shapes) |
| `src/library/` | Element definitions by theme, room starters |
| `src/generator/` | Roll-a-room and neighbor rooms |
| `src/sprites/` | View data model, rendering, built-in sprite library |
| `src/walk/` | Test-walk simulation (no UI) |
| `src/render/` | Room rendering with per-layer caching, thumbnails |
| `src/export/` | PNG, sprite sheet, zip and project file export |
| `src/state/` | Zustand store with undo (zundo), autosave to IndexedDB |
| `src/ui/` | React UI |
| `scripts/gallery.ts` | Renders elements, starters or sprites to PNG contact sheets for art review |

### Adding an element

Add an `ElementDef` to a theme folder under `src/library/` and register it in that folder's `index.ts`. Draw with the `Kit` in local coordinates: the origin is the point the object stands on, and negative y is up. Put every color in a named role. Then check it:

```bash
npx vitest run tests/library.test.ts
npx tsx scripts/gallery.ts --id your-element --out /tmp/gallery
```
