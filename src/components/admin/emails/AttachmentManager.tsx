'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, Trash2, FileText, Image, Loader2, AlertCircle } from 'lucide-react'

export type AttachmentFile = {
  name: string
  size: number
  createdAt: string
  url: string
}

export default function AttachmentManager({
  files,
  onDelete,
  onUpload,
  loading,
}: {
  files: AttachmentFile[]
  onDelete: (name: string) => Promise<void>
  onUpload: (file: File) => Promise<void>
  loading: boolean
}) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setError('Only PDF, JPEG, PNG, and WEBP files are allowed.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10 MB.')
      return
    }
    setUploading(true)
    try {
      await onUpload(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [onUpload]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const getIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return <FileText className="h-5 w-5 text-red-500" />
    return <Image className="h-5 w-5 text-blue-500" />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Attachments</h1>
          <p className="text-sm text-[#6F7192] mt-1">
            Upload PDFs and images to attach to email templates. Reference them with{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-xs text-[#6d28d9]">
              {'{{attachment:filename.pdf}}'}
            </code>
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Upload dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 transition ${
          dragOver
            ? 'border-[#6d28d9] bg-[#6d28d9]/5'
            : 'border-gray-300 bg-white hover:border-[#6d28d9]/40'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9]/10">
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#6d28d9]" />
          ) : (
            <Upload className="h-6 w-6 text-[#6d28d9]" />
          )}
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-[#0F1B3D]">
            {uploading ? 'Uploading…' : 'Click or drag & drop to upload'}
          </p>
          <p className="mt-1 text-xs text-[#6F7192]">
            PDF, JPEG, PNG, WEBP — max 10 MB
          </p>
        </div>
      </div>

      {/* File list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#6F7192]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading attachments…
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-[#6F7192]">No attachments yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-[#6F7192]">
              <tr>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {files.map((f) => (
                <tr key={f.name} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {getIcon(f.name)}
                      <span className="font-medium text-[#0F1B3D]">{f.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#6F7192]">{formatSize(f.size)}</td>
                  <td className="px-4 py-3 text-[#6F7192]">{formatDate(f.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDelete(f.name)}
                      className="inline-flex items-center gap-1 rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                      title="Delete"
                      aria-label={`Delete attachment ${f.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
