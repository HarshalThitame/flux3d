'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, Paperclip, Loader2, StickyNote } from 'lucide-react'

interface ReplyComposerProps {
  onSend: (data: { message: string; html?: string; isInternal: boolean; files: File[] }) => Promise<void>
  disabled?: boolean
}

export default function ReplyComposer({ onSend, disabled }: ReplyComposerProps) {
  const [text, setText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending || disabled) return
    setSending(true)
    try {
      await onSend({ message: text.trim(), html: undefined, isInternal, files })
      setText('')
      setFiles([])
      setIsInternal(false)
    } finally {
      setSending(false)
    }
  }, [text, sending, disabled, isInternal, files, onSend])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0F1B3D]">
          {isInternal ? 'Add Internal Note' : 'Reply to Customer'}
        </h3>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-[#6d28d9] focus:ring-[#6d28d9]"
          />
          <span className="flex items-center gap-1 text-xs text-[#6F7192]">
            <StickyNote className="h-3 w-3" />
            Internal note
          </span>
        </label>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={isInternal ? 'Write an internal note...' : 'Write your response...'}
        rows={4}
        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-[#0F1B3D] placeholder:text-gray-400 outline-none focus:border-[#6d28d9]/30 focus:ring-1 focus:ring-[#6d28d9]/20"
      />

      {files.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-[#0F1B3D]"
            >
              <Paperclip className="h-3 w-3 text-[#6F7192]" />
              <span className="max-w-[160px] truncate">{file.name}</span>
              <button
                onClick={() => removeFile(index)}
                className="ml-1 text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || sending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#6F7192] transition hover:bg-gray-50 disabled:opacity-50"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach file
          </button>
          <span className="text-[11px] text-[#6F7192]">
            {isInternal ? 'Not sent to customer' : 'Will be sent from complaints@flux3d.in'}
          </span>
        </div>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#5b21b6] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {sending ? 'Sending...' : isInternal ? 'Save Note' : 'Send Reply'}
        </button>
      </div>
    </div>
  )
}
