'use client'

import type { ShopVariantOption } from '@/lib/shop/admin-types'
import type { ShopSelectedOptions } from '@/lib/shop/selection'

function swatchBackground(value: string) {
  if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) return value
  return value.toLowerCase()
}

export default function ShopVariantControls({
  options,
  selected,
  onChangeAction,
}: {
  options: ShopVariantOption[]
  selected: ShopSelectedOptions
  onChangeAction: (name: string, value: string | boolean) => void
}) {
  if (options.length === 0) return null

  return (
    <div className="space-y-5">
      {options.map((option) => {
        const values = option.values ?? []
        const selectedValue = selected[option.option_name]

        return (
          <div key={option.id} className="space-y-2.5">
            <div className="text-sm font-semibold text-[var(--shop-text-primary)]">
              Choose {option.option_name}
              {selectedValue ? <span className="font-medium text-[var(--shop-text-muted)]">: {String(selectedValue)}</span> : null}
            </div>

            {option.option_type === 'swatch_color' ? (
              <div className="flex flex-wrap gap-3">
                {values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={value}
                    onClick={() => onChangeAction(option.option_name, value)}
                    className={`grid h-11 w-11 place-items-center rounded-full border bg-white transition ${
                      selectedValue === value ? 'border-[var(--shop-gold)] ring-4 ring-[var(--shop-gold)]/20' : 'border-[var(--shop-border-light)]'
                    }`}
                  >
                    <span
                      className="h-7 w-7 rounded-full border border-black/10"
                      style={{ background: swatchBackground(value) }}
                    />
                  </button>
                ))}
              </div>
            ) : option.option_type === 'dropdown' ? (
              <select
                value={typeof selectedValue === 'string' ? selectedValue : ''}
                onChange={(event) => onChangeAction(option.option_name, event.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
              >
                <option value="">Select {option.option_name}</option>
                {values.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            ) : option.option_type === 'toggle' ? (
              <button
                type="button"
                aria-pressed={Boolean(selectedValue)}
                onClick={() => onChangeAction(option.option_name, !selectedValue)}
                className={`relative h-7 w-12 rounded-full transition ${selectedValue ? 'bg-[var(--shop-gold)]' : 'bg-[var(--shop-border-medium)]'}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${selectedValue ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            ) : option.option_type === 'text_input' ? (
              <input
                value={typeof selectedValue === 'string' ? selectedValue : ''}
                onChange={(event) => onChangeAction(option.option_name, event.target.value.slice(0, 50))}
                className="min-h-[44px] w-full rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm text-[var(--shop-text-primary)] outline-none transition focus:border-[var(--shop-gold)]"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChangeAction(option.option_name, value)}
                    className={`min-h-[44px] rounded-xl border px-4 text-sm font-semibold transition ${
                      selectedValue === value
                        ? 'border-[var(--shop-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]'
                        : 'border-[var(--shop-border-light)] bg-white text-[var(--shop-text-secondary)] hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
