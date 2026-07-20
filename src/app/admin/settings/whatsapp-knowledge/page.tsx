'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Database, Edit3, Plus, RefreshCcw, Save, Sparkles, Trash2 } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import DataTable from '@/components/admin/DataTable'
import Modal from '@/components/admin/Modal'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import { InputField, TextAreaField, ToggleField } from '@/components/admin/FormField'
import {
  formatWhatsAppKnowledgeTags,
  normalizeWhatsAppKnowledgeSourceKey,
  parseWhatsAppKnowledgeTags,
  type WhatsAppKnowledgeFormState,
  type WhatsAppKnowledgeRecord,
} from '@/lib/admin/whatsapp-knowledge'

type WhatsAppKnowledgeTableRow = WhatsAppKnowledgeRecord & {
  tagsText: string
  statusLabel: string
}

const EMPTY_FORM: WhatsAppKnowledgeFormState = {
  sourceKey: '',
  title: '',
  content: '',
  tags: '',
  priority: '0',
  active: true,
}

function toTableRow(chunk: WhatsAppKnowledgeRecord): WhatsAppKnowledgeTableRow {
  return {
    ...chunk,
    tagsText: formatWhatsAppKnowledgeTags(chunk.tags),
    statusLabel: chunk.active ? 'Active' : 'Hidden',
  }
}

function formatUpdatedLabel(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-IN')
}

export default function WhatsAppKnowledgePage() {
  const [chunks, setChunks] = useState<WhatsAppKnowledgeTableRow[] | null>(null)
  const [seedCount, setSeedCount] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<WhatsAppKnowledgeFormState>(EMPTY_FORM)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function loadChunks() {
    setError(null)
    const response = await fetch('/api/admin/whatsapp-knowledge')
    const body = (await response.json().catch(() => ({}))) as {
      error?: string
      chunks?: WhatsAppKnowledgeRecord[]
      seedCount?: number
    }

    if (!response.ok) {
      throw new Error(body.error ?? 'Failed to load WhatsApp knowledge.')
    }

    setChunks((body.chunks ?? []).map(toTableRow))
    setSeedCount(body.seedCount ?? 0)
  }

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void loadChunks().catch((loadError) => {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load WhatsApp knowledge.')
      })
    }, 0)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [])

  const stats = useMemo(() => {
    const total = chunks?.length ?? 0
    const active = chunks?.filter((chunk) => chunk.active).length ?? 0
    const hidden = total - active
    const averagePriority =
      total > 0 ? Math.round((chunks ?? []).reduce((sum, chunk) => sum + chunk.priority, 0) / total) : 0

    return { total, active, hidden, averagePriority }
  }, [chunks])

  function openCreateModal() {
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEditModal(chunk: WhatsAppKnowledgeTableRow) {
    setForm({
      id: chunk.id,
      sourceKey: chunk.sourceKey,
      title: chunk.title,
      content: chunk.content,
      tags: formatWhatsAppKnowledgeTags(chunk.tags),
      priority: String(chunk.priority ?? 0),
      active: chunk.active,
    })
    setModalOpen(true)
  }

  function updateForm<K extends keyof WhatsAppKnowledgeFormState>(key: K, value: WhatsAppKnowledgeFormState[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value }
      if (key === 'sourceKey' && !current.id) {
        next.sourceKey = normalizeWhatsAppKnowledgeSourceKey(String(value))
      }
      return next
    })
  }

  async function saveChunk(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/admin/whatsapp-knowledge', {
        method: form.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: form.id,
          sourceKey: form.sourceKey,
          title: form.title,
          content: form.content,
          tags: parseWhatsAppKnowledgeTags(form.tags),
          priority: Number(form.priority),
          active: form.active,
        }),
      })

      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to save knowledge chunk.')
      }

      setToast({
        type: 'success',
        message: form.id ? 'Knowledge chunk updated.' : 'Knowledge chunk created.',
      })
      setModalOpen(false)
      await loadChunks()
    } catch (saveError) {
      setToast({
        type: 'error',
        message: saveError instanceof Error ? saveError.message : 'Failed to save knowledge chunk.',
      })
    } finally {
      setSaving(false)
    }
  }

  async function deleteChunk(chunk: WhatsAppKnowledgeTableRow) {
    if (!window.confirm(`Delete "${chunk.title}"? This removes it from RAG immediately.`)) return

    setDeletingId(chunk.id)
    try {
      const response = await fetch('/api/admin/whatsapp-knowledge', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chunk.id }),
      })
      const body = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to delete knowledge chunk.')
      }

      setToast({ type: 'success', message: 'Knowledge chunk deleted.' })
      await loadChunks()
    } catch (deleteError) {
      setToast({
        type: 'error',
        message: deleteError instanceof Error ? deleteError.message : 'Failed to delete knowledge chunk.',
      })
    } finally {
      setDeletingId(null)
    }
  }

  async function syncSeedKnowledge() {
    setSyncing(true)
    try {
      const response = await fetch('/api/admin/whatsapp-knowledge/sync', { method: 'POST' })
      const body = (await response.json().catch(() => ({}))) as { error?: string; seedCount?: number }
      if (!response.ok) {
        throw new Error(body.error ?? 'Failed to sync seed knowledge.')
      }

      setSeedCount(body.seedCount ?? 0)
      setToast({
        type: 'success',
        message: `Seed knowledge synced (${body.seedCount ?? 0} chunks).`,
      })
      await loadChunks()
    } catch (syncError) {
      setToast({
        type: 'error',
        message: syncError instanceof Error ? syncError.message : 'Failed to sync seed knowledge.',
      })
    } finally {
      setSyncing(false)
    }
  }

  if (error && chunks === null) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">{error}</div>
  }

  if (chunks === null) {
    return (
      <div className="space-y-6">
        <div className="space-y-3">
          <SkeletonBlock className="h-8 w-64" />
          <SkeletonBlock className="h-5 w-96" />
        </div>
        <SkeletonBlock className="h-32 w-full" />
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
              <Database className="h-3 w-3" />
              WhatsApp AI
            </div>
            <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">
              WhatsApp Knowledge
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">
              Manage the knowledge chunks used by the WhatsApp RAG layer. Changes here affect GPT replies immediately after save.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void syncSeedKnowledge()}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCcw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Seed'}
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b21b6]"
            >
              <Plus className="h-4 w-4" />
              Add Chunk
            </button>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-[#6F7192]">Total chunks</p>
            <p className="mt-1 text-2xl font-bold text-[#0F1B3D]">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-[#6F7192]">Active chunks</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.active}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-[#6F7192]">Hidden chunks</p>
            <p className="mt-1 text-2xl font-bold text-amber-500">{stats.hidden}</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-[#6F7192]">Seed docs</p>
            <p className="mt-1 text-2xl font-bold text-[#0F1B3D]">{seedCount}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#6d28d9]/10 bg-gradient-to-r from-[#6d28d9]/8 to-white p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-[#0F1B3D]">How retrieval uses these chunks</div>
              <p className="mt-1 text-sm text-[#6F7192]">
                Messages are embedded, matched against this table, and the best chunks are injected into the GPT prompt.
              </p>
            </div>
            <Link
              href="/admin/settings/business"
              className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D] transition hover:bg-gray-50"
            >
              Open business settings
            </Link>
          </div>
        </div>

        <DataTable
          title="Knowledge Chunks"
          description="Source text used by the WhatsApp AI assistant."
          data={chunks}
          searchPlaceholder="Search source key, title, content, or tags"
          searchKeys={['sourceKey', 'title', 'content', 'tagsText']}
          filters={[
            {
              key: 'status',
              label: 'Status',
              options: [
                { label: 'Active', value: 'active' },
                { label: 'Hidden', value: 'hidden' },
              ],
              getValue: (row) => (row.active ? 'active' : 'hidden'),
            },
          ]}
          onRowClick={(row) => openEditModal(row)}
          columns={[
            {
              key: 'sourceKey',
              label: 'Source Key',
              sortable: true,
              sortValue: (row) => row.sourceKey,
              render: (row) => <span className="font-medium text-[#0F1B3D]">{row.sourceKey}</span>,
            },
            {
              key: 'title',
              label: 'Title',
              sortable: true,
              sortValue: (row) => row.title,
              render: (row) => <span className="text-[#6F7192]">{row.title}</span>,
            },
            {
              key: 'tags',
              label: 'Tags',
              render: (row) => <span className="text-[#6F7192]">{row.tagsText || '—'}</span>,
            },
            {
              key: 'priority',
              label: 'Priority',
              sortable: true,
              sortValue: (row) => row.priority,
              render: (row) => <span className="font-medium text-[#0F1B3D]">{row.priority}</span>,
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              sortValue: (row) => (row.active ? 1 : 0),
              render: (row) => (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${row.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-[#6F7192]'}`}>
                  {row.statusLabel}
                </span>
              ),
            },
            {
              key: 'updatedAt',
              label: 'Updated',
              sortable: true,
              sortValue: (row) => row.updatedAt ?? '',
              render: (row) => <span className="text-[#6F7192]">{formatUpdatedLabel(row.updatedAt)}</span>,
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (row) => (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      openEditModal(row)
                    }}
                    className="rounded-lg border border-[#6d28d9]/10 bg-white p-2 text-[#6F7192] transition hover:bg-gray-50 hover:text-[#0F1B3D]"
                    title="Edit"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      void deleteChunk(row)
                    }}
                    disabled={deletingId === row.id}
                    className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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

      <Modal
        open={modalOpen}
        onOpenChangeAction={setModalOpen}
        title={form.id ? 'Edit Knowledge Chunk' : 'Add Knowledge Chunk'}
        description="Keep entries short, factual, and specific so the assistant can retrieve them cleanly."
      >
        <form onSubmit={saveChunk} className="max-h-[calc(100vh-180px)] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="Source Key"
              value={form.sourceKey}
              onChange={(value) => updateForm('sourceKey', value)}
              placeholder="materials-pla-plus"
            />
            <InputField
              label="Priority"
              value={form.priority}
              onChange={(value) => updateForm('priority', value)}
              placeholder="0"
              type="number"
            />
          </div>

          <InputField
            label="Title"
            value={form.title}
            onChange={(value) => updateForm('title', value)}
            placeholder="PLA+ material guide"
          />

          <InputField
            label="Tags"
            value={form.tags}
            onChange={(value) => updateForm('tags', value)}
            placeholder="material, pla, prototype"
          />

          <TextAreaField
            label="Content"
            value={form.content}
            onChange={(value) => updateForm('content', value)}
            rows={8}
            placeholder="Write the knowledge chunk the assistant should use..."
          />

          <ToggleField
            label="Active"
            description="Inactive chunks remain in the database but are ignored by RAG."
            checked={form.active}
            onChange={(checked) => updateForm('active', checked)}
          />

          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium text-[#6F7192] transition hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Chunk'}
            </button>
          </div>
        </form>
      </Modal>

      <AdminToast toast={toast} />
    </>
  )
}
