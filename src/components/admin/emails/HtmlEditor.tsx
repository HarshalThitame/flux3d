'use client'

import { useRef, useCallback } from 'react'

export default function HtmlEditor({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = useRef<HTMLDivElement>(null)
  const lineCount = value.split('\n').length || 1

  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }, [])

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-[#6d28d9]/10 bg-[#0F1B3D]">
      {/* Line numbers */}
      <div
        ref={lineNumbersRef}
        className="shrink-0 overflow-hidden bg-[#0F1B3D] py-3 pl-3 pr-2 text-right text-xs leading-6 text-[#6F7192] select-none"
        style={{ width: '44px' }}
      >
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        data-html-editor-textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        className="flex-1 resize-none bg-[#0F1B3D] p-3 font-mono text-sm leading-6 text-gray-200 outline-none placeholder:text-[#6F7192]/50"
      />
    </div>
  )
}
