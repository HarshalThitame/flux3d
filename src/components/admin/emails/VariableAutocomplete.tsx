'use client'

import { useState } from 'react'
import { X, Plus, ChevronDown } from 'lucide-react'

export default function VariableAutocomplete({
  variables,
  onSelect,
  onClose,
}: {
  variables: string[]
  onSelect: (variable: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const filtered = variables.filter((v) => v.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="absolute z-50 mt-1 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search variables..."
          className="flex-1 bg-transparent text-sm text-[#0F1B3D] outline-none"
        />
        <button type="button" onClick={onClose} className="rounded p-0.5 text-[#6F7192] hover:bg-gray-100">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto py-1">
        {filtered.length === 0 && (
          <div className="px-3 py-2 text-xs text-[#6F7192]">No variables found</div>
        )}
        {filtered.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onSelect(v)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#0F1B3D] transition hover:bg-gray-50"
          >
            <span className="rounded bg-[#6d28d9]/10 px-1.5 py-0.5 text-[10px] font-mono text-[#6d28d9]">
              {'{{' + v + '}}'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
