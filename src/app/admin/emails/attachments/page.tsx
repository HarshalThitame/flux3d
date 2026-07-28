'use client'

import { useState, useEffect, useCallback } from 'react'
import AttachmentManager, { type AttachmentFile } from '@/components/admin/emails/AttachmentManager'

export default function EmailAttachmentsPage() {
  const [files, setFiles] = useState<AttachmentFile[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/email-attachments')
      if (res.ok) {
        const json = await res.json()
        setFiles(json.data ?? [])
      } else {
        console.error('[attachments] Failed to load:', await res.text())
      }
    } catch {
      console.error('[attachments] Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/admin/email-attachments', {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      throw new Error(json.error ?? 'Upload failed')
    }
    await refresh()
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    const res = await fetch(`/api/admin/email-attachments/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert(json.error ?? 'Delete failed')
      return
    }
    await refresh()
  }

  return (
    <AttachmentManager
      files={files}
      onDelete={handleDelete}
      onUpload={handleUpload}
      loading={loading}
    />
  )
}
