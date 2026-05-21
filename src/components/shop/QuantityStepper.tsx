'use client'

import { Minus, Plus } from 'lucide-react'

export default function QuantityStepper({
  value,
  min = 1,
  max,
  onChangeAction,
  compact = false,
}: {
  value: number
  min?: number
  max: number
  onChangeAction: (value: number) => void
  compact?: boolean
}) {
  const clampedMax = Math.max(min, max)
  const size = compact ? 'h-8 w-8' : 'h-11 w-11'

  return (
    <div className="inline-flex items-center overflow-hidden rounded-xl border border-[var(--border-light)] bg-white">
      <button
        type="button"
        disabled={value <= min}
        onClick={() => onChangeAction(Math.max(min, value - 1))}
        className={`${size} grid place-items-center text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)] disabled:opacity-40`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={`${compact ? 'w-8 text-sm' : 'w-12'} text-center font-semibold text-[var(--text-primary)]`}>
        {value}
      </span>
      <button
        type="button"
        disabled={value >= clampedMax}
        onClick={() => onChangeAction(Math.min(clampedMax, value + 1))}
        className={`${size} grid place-items-center text-[var(--text-secondary)] transition hover:bg-[var(--bg-soft)] disabled:opacity-40`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}
