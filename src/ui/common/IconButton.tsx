import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  tip: string
  tipKey?: string
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  danger?: boolean
  size?: 'sm' | 'md'
  children?: ReactNode
}

export function IconButton({ icon: Icon, tip, tipKey, onClick, active, disabled, danger, size = 'md', children }: Props) {
  const dim = size === 'sm' ? 'h-6 min-w-6' : 'h-7 min-w-7'
  return (
    <button
      type="button"
      data-tip={tip}
      data-tip-key={tipKey}
      aria-label={tip}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={[
        dim,
        'inline-flex items-center justify-center gap-1 rounded px-1 transition-colors disabled:opacity-35',
        active ? 'bg-accent text-bg' : danger ? 'text-danger hover:bg-line' : 'text-muted hover:bg-line hover:text-text',
      ].join(' ')}
    >
      <Icon size={size === 'sm' ? 14 : 16} strokeWidth={2} />
      {children}
    </button>
  )
}

export function TextButton({
  children,
  onClick,
  tip,
  primary,
  danger,
  disabled,
}: {
  children: ReactNode
  onClick?: () => void
  tip?: string
  primary?: boolean
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      data-tip={tip}
      disabled={disabled}
      onClick={onClick}
      className={[
        'h-7 rounded px-3 text-[12px] font-medium transition-colors disabled:opacity-35',
        primary
          ? 'bg-accent text-bg hover:bg-text'
          : danger
            ? 'border border-danger text-danger hover:bg-danger hover:text-bg'
            : 'border border-line text-text hover:bg-line',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
