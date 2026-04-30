export function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  error,
}: {
  label: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  type?: string
  error?: string
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-[#aeb8d8]">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-[#5a6580] ${
          error ? 'border-rose-400/30 focus:border-rose-400/50' : 'border-white/8 focus:border-[#FF5C1A]/30'
        }`}
      />
      {error && <div className="mt-1 text-[11px] text-rose-400">{error}</div>}
    </label>
  )
}

export function SelectField({
  label,
  options,
  value,
  onChange,
  error,
}: {
  label: string
  options: { label: string; value: string }[]
  value?: string
  onChange?: (value: string) => void
  error?: string
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-[#aeb8d8]">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={`w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition ${
          error ? 'border-rose-400/30' : 'border-white/8 focus:border-[#FF5C1A]/30'
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0d1120]">
            {option.label}
          </option>
        ))}
      </select>
      {error && <div className="mt-1 text-[11px] text-rose-400">{error}</div>}
    </label>
  )
}

export function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="mt-0.5 text-xs text-[#7a82a0]">{description}</div>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#FF5C1A]' : 'bg-white/10'}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  )
}

export function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
  rows = 3,
  error,
}: {
  label: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  rows?: number
  error?: string
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-[#aeb8d8]">{label}</div>
      <textarea
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-sm text-white outline-none transition resize-none placeholder:text-[#5a6580] ${
          error ? 'border-rose-400/30 focus:border-rose-400/50' : 'border-white/8 focus:border-[#FF5C1A]/30'
        }`}
      />
      {error && <div className="mt-1 text-[11px] text-rose-400">{error}</div>}
    </label>
  )
}
