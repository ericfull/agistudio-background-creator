import type { ReactNode } from 'react'

export function Field({ label, tip, children }: { label: string; tip?: string; children: ReactNode }) {
  return (
    <label className="flex min-h-7 items-center gap-2" data-tip={tip}>
      <span className="w-[76px] shrink-0 truncate text-[11px] text-muted">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </label>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  tip,
  onStart,
  onEnd,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  tip?: string
  onStart?: () => void
  onEnd?: () => void
}) {
  return (
    <Field label={label} tip={tip}>
      <input
        type="range"
        className="min-w-0 flex-1"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onStart}
        onPointerUp={onEnd}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <input
        type="number"
        className="w-12 text-right"
        min={min}
        max={max}
        step={step}
        value={Number.isInteger(step) ? value : value.toFixed(2)}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)))
        }}
      />
    </Field>
  )
}

export function Toggle({ label, value, onChange, tip }: { label: string; value: boolean; onChange: (v: boolean) => void; tip?: string }) {
  return (
    <Field label={label} tip={tip}>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative h-4 w-7 rounded-sm transition-colors ${value ? 'bg-accent' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-3 w-3 rounded-[1px] bg-text transition-[left] ${value ? 'left-3.5' : 'left-0.5'}`} />
      </button>
    </Field>
  )
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  tip,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  tip?: string
}) {
  return (
    <Field label={label} tip={tip}>
      <select className="min-w-0 flex-1" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

/** Segmented control for small option sets. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: ReactNode; tip: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded border border-line p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          data-tip={o.tip}
          aria-label={o.tip}
          onClick={() => onChange(o.value)}
          className={`flex h-6 flex-1 items-center justify-center rounded-sm px-1.5 text-[11px] ${value === o.value ? 'bg-accent text-bg' : 'text-muted hover:text-text'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
