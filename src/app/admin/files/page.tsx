'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Download, FileArchive, Trash2 } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import DataTable from '@/components/admin/DataTable'
import EmptyState from '@/components/admin/EmptyState'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { AdminFile } from '@/lib/admin/types'

export default function AdminFilesPage() {
  const [files, setFiles] = useState<AdminFile[] | null>(null)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/files', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load files.')
        }

        const json = (await response.json()) as { files: AdminFile[] }
        setFiles(json.files)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load files.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">{error}</div>
  }

  if (files === null) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-5 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <EmptyState
        title="No uploaded files"
        description="Uploaded model files will appear here once customers start submitting print jobs."
        ctaLabel="View orders"
        ctaHref="/admin/orders"
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-amber-600">
            <FileArchive className="h-3 w-3" />
            File Storage
          </div>
          <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Files</h1>
          <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
            Monitor uploaded STL, OBJ, and 3MF assets with download and moderation actions.
          </p>
        </motion.div>

        <DataTable
          title="Uploaded Models"
          description={`${files.length} files in storage`}
          data={files}
          searchPlaceholder="Search file name or user"
          searchKeys={['name', 'user', 'uploadedAt', 'size']}
          columns={[
            { key: 'name', label: 'File Name', sortable: true, sortValue: (row) => row.name, render: (row) => <span className="font-medium text-[#0F1B3D]">{row.name}</span> },
            { key: 'user', label: 'User', sortable: true, sortValue: (row) => row.user, render: (row) => <span className="text-[#6F7192]">{row.user}</span> },
            { key: 'uploadedAt', label: 'Upload Date', sortable: true, sortValue: (row) => row.uploadedAt, render: (row) => <span className="text-[#6F7192]">{row.uploadedAt}</span> },
            { key: 'size', label: 'Size', sortable: true, sortValue: (row) => row.size, render: (row) => <span className="font-medium text-[#0F1B3D]">{row.size}</span> },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setToast({ type: 'info', message: `Download prepared for ${row.name}.` })
                    }}
                    className="rounded-lg border border-cyan-200 bg-cyan-50 p-2 text-cyan-400 transition hover:bg-cyan-400/15"
                    title="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setToast({ type: 'error', message: `${row.name} marked for deletion.` })
                    }}
                    className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-400 transition hover:bg-rose-400/15"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>
      <AdminToast toast={toast} />
    </>
  )
}
