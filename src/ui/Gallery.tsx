import { useMemo, useState } from 'react'
import { ELEMENTS } from '../library'
import { elementThumb } from '../render/thumbs'
import { THEMES, type Theme } from '../state/types'
import { Segmented } from './common/Field'

/** Dev page (?gallery): every element at several seeds, for art review. */
export function Gallery() {
  const [theme, setTheme] = useState<Theme>('nature')
  const defs = useMemo(() => ELEMENTS.filter((e) => e.themes[0] === theme), [theme])
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 max-w-xl">
        <Segmented value={theme} onChange={setTheme} options={THEMES.map((t) => ({ value: t.id, label: t.label, tip: `${t.label} elements` }))} />
      </div>
      <div className="flex flex-col gap-3">
        {defs.map((d) => (
          <div key={d.id} className="flex items-center gap-2" data-tip={d.id}>
            <span className="w-40 shrink-0 truncate text-[12px] text-muted">{d.name}</span>
            {[1, 2, 3, 4, 5].map((seed) => (
              <img key={seed} src={elementThumb(d.id, 240, 151, seed, 1.2) ?? ''} alt="" className="rounded border border-line bg-bg" style={{ width: 240, height: 151, imageRendering: 'pixelated' }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
