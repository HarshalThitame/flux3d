'use client'

import { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronRight, X } from 'lucide-react'

export function Section({
  title,
  description,
  children,
  defaultOpen = true,
  sectionId,
}: {
  title: string
  description?: string
  children: React.ReactNode
  defaultOpen?: boolean
  sectionId?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section id={sectionId} className="scroll-mt-24 overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-4 border-b border-gray-100 px-5 py-4 text-left"
      >
        <div>
          <h2 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">{title}</h2>
          {description && <p className="mt-1 text-sm text-[#6F7192]">{description}</p>}
        </div>
        {open ? <ChevronDown className="h-5 w-5 text-[#6F7192]" /> : <ChevronRight className="h-5 w-5 text-[#6F7192]" />}
      </button>
      {open && <div className="space-y-5 p-5">{children}</div>}
    </section>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <div>
        <div className="text-sm font-semibold text-[#0F1B3D]">{label}</div>
        {description && <div className="mt-0.5 text-xs text-[#6F7192]">{description}</div>}
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[#6d28d9]' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </div>
  )
}

export function TagInput({
  label,
  value,
  onChange,
  placeholder,
  action,
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
  action?: React.ReactNode
}) {
  const [draft, setDraft] = useState('')

  function commit(input = draft) {
    const next = input.trim()
    if (!next) return
    if (!value.includes(next)) onChange([...value, next])
    setDraft('')
  }

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-[#6F7192]">
        {label}
        {action}
      </span>
      <div className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2">
        <div className="mb-2 flex flex-wrap gap-2">
          {value.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              className="inline-flex items-center gap-1 rounded-full bg-[#6d28d9]/10 px-2.5 py-1 text-xs font-medium text-[#6d28d9]"
            >
              {tag}
              <X className="h-3 w-3" />
            </button>
          ))}
        </div>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault()
              commit()
            }
          }}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-[#0F1B3D] outline-none placeholder:text-[#6F7192]"
        />
      </div>
    </label>
  )
}

export const inputClass =
  'w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40'
