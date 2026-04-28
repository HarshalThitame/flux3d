export function InputField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white">{label}</div>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[18px] border border-white/10 bg-[#0f182c] px-4 py-3 text-sm text-white outline-none transition focus:border-[#FF7B43]/40"
      />
    </label>
  )
}

export function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { label: string; value: string }[]
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium text-white">{label}</div>
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded-[18px] border border-white/10 bg-[#0f182c] px-4 py-3 text-sm text-white outline-none transition focus:border-[#FF7B43]/40"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-white/10 bg-[#0f182c] px-4 py-4">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="mt-1 text-sm text-[#95a1c4]">{description}</div>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-[#FF7B43]' : 'bg-white/12'}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  )
}
