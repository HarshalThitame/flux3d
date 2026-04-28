'use client'

import { useEffect, useState } from 'react'
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
    return <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">{error}</div>
  }

  if (files === null) {
    return <SkeletonBlock className="h-[420px] w-full" />
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
        <section className="rounded-[32px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6">
          <h1 className="font-[var(--font-syne)] text-4xl font-extrabold text-white">Files</h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ca7c6]">
            Monitor uploaded STL, OBJ, and 3MF assets with lightweight download and moderation actions.
          </p>
        </section>

        <DataTable
          title="Uploaded Models"
          description="Storage overview for production and quote uploads."
          data={files}
          searchPlaceholder="Search file name or user"
          searchKeys={['name', 'user', 'uploadedAt', 'size']}
          columns={[
            { key: 'name', label: 'File Name', sortable: true, sortValue: (row) => row.name, render: (row) => <span className="font-medium text-white">{row.name}</span> },
            { key: 'user', label: 'User', sortable: true, sortValue: (row) => row.user, render: (row) => row.user },
            { key: 'uploadedAt', label: 'Upload Date', sortable: true, sortValue: (row) => row.uploadedAt, render: (row) => row.uploadedAt },
            { key: 'size', label: 'Size', sortable: true, sortValue: (row) => row.size, render: (row) => row.size },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setToast({ type: 'info', message: `Download prepared for ${row.name}.` })
                    }}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-white"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setToast({ type: 'error', message: `${row.name} marked for deletion.` })
                    }}
                    className="rounded-xl border border-rose-400/15 bg-rose-400/10 px-3 py-2 text-xs font-medium text-rose-100"
                  >
                    Delete
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
