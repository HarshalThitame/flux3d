'use client'

import { useState, useRef } from 'react'
import { Upload, X, ImageIcon } from 'lucide-react'

export default function LogoUploader({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/upload-branding', { method: 'POST', body: formData })
      const json = await res.json()
      if (res.ok && json.url) {
        onChange(json.url)
      } else {
        alert(json.error ?? 'Upload failed')
      }
    } catch {
      alert('Network error during upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {value && (
        <img
          src={value}
          alt="Logo"
          className="h-12 w-12 rounded-lg border border-gray-200 object-contain bg-white"
        />
      )}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#6d28d9]/20 bg-[#6d28d9]/5 px-4 py-2.5 text-sm font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/10">
        <ImageIcon className="h-4 w-4" />
        {uploading ? 'Uploading...' : value ? 'Change Logo' : 'Upload Logo'}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            if (inputRef.current) inputRef.current.value = ''
          }}
        />
      </label>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-lg p-1 text-red-500 hover:bg-red-50"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
