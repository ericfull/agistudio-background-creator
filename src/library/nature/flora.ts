import { R, type LP } from '../../kit/helpers'
import type { ElementDef } from '../types'

export const flora: ElementDef[] = [
  {
    id: 'oak',
    name: 'Oak tree',
    themes: ['nature', 'fantasy'],
    category: 'flora',
    tags: ['tree', 'forest', 'leafy'],
    roles: {
      leaf: { label: 'Leaves', color: 2 },
      leafLight: { label: 'Highlight', color: 10 },
      line: { label: 'Outline', color: 0 },
      trunk: { label: 'Trunk', color: 6 },
      bark: { label: 'Bark lines', color: 0 },
    },
    params: [
      { key: 'height', label: 'Height', type: 'int', min: 24, max: 110, default: 60 },
      { key: 'width', label: 'Canopy width', type: 'int', min: 8, max: 30, default: 15 },
      { key: 'trunk', label: 'Trunk width', type: 'int', min: 2, max: 8, default: 3 },
      { key: 'outline', label: 'Outlines', type: 'bool', default: true },
      { key: 'highlights', label: 'Highlights', type: 'bool', default: true },
    ],
    defaultPriority: 'baseline',
    perspective: true,
    place: { x: 40, y: 130 },
    hasControl: true,
    generate(k, p, rng) {
      const h = p.n('height')
      const w = p.n('width')
      const tw = p.n('trunk')
      const line = p.b('outline') ? R('line') : undefined
      const trunkTop = -h * 0.42
      // trunk with flared roots
      k.poly(
        [[-tw - 2, 0], [-tw, -2], [-tw + 0.5, trunkTop], [tw - 0.5, trunkTop], [tw, -2], [tw + 2, 0]],
        R('trunk'),
        line ?? R('trunk'),
      )
      if (tw >= 3 && k.S(1) >= 1) {
        for (let i = 0; i < Math.floor(tw / 2); i++) {
          const x = rng.range(-tw + 1, tw - 1)
          const y0 = rng.range(trunkTop * 0.9, trunkTop * 0.4)
          k.line([[x, y0], [x + rng.range(-0.6, 0.6), y0 + rng.range(4, 9)]], R('bark'))
        }
      }
      // canopy
      const top = -h
      const bottom = trunkTop + (h - -trunkTop) * 0.12
      const cy = (top + bottom) / 2
      const ry = (bottom - top) / 2
      k.blob(0, cy, w, ry, rng, R('leaf'), line ?? R('leaf'), 8, 0.22)
      if (p.b('highlights')) {
        const n = rng.int(2, 4)
        for (let i = 0; i < n; i++) {
          const hx = rng.range(-w * 0.55, w * 0.25)
          const hy = rng.range(cy - ry * 0.65, cy - ry * 0.05)
          k.blob(hx, hy, w * rng.range(0.22, 0.34), ry * rng.range(0.18, 0.28), rng, R('leafLight'), undefined, 5, 0.3)
        }
      }
      // clump lines inside the canopy
      if (line) {
        const n = rng.int(2, 4)
        for (let i = 0; i < n; i++) {
          const cx = rng.range(-w * 0.5, w * 0.5)
          const yy = rng.range(cy - ry * 0.2, cy + ry * 0.6)
          const arc: LP[] = k.ellipsePts(cx, yy, w * 0.28, ry * 0.2, 6, Math.PI * 0.1, Math.PI * 0.9).map(([x, y]) => [x, y])
          k.line(arc, R('line'))
        }
      }
      // AGI trees block at the base of the trunk
      k.wall([[-tw - 1, 0], [tw + 1, 0]])
    },
  },
]
