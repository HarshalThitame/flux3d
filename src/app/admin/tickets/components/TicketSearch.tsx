'use client'

import { useRef, useCallback } from 'react'
import { Search, X } from 'lucide-react'

interface TicketSearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export default function TicketSearch({ value, onChange, placeholder = 'Search tickets...' }: TicketSearchProps) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = useCallback((newValue: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      onChange(newValue)
    }, 350)
  }, [onChange])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-9 text-sm text-[#0F1B3D] placeholder:text-gray-400 outline-none focus:border-[#6d28d9]/30 focus:ring-1 focus:ring-[#6d28d9]/20"
      />
      {value && (
        <button
          onClick={() => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
            onChange('')
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0F1B3D]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
