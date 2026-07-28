'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  LayoutGrid,
  List,
  Plus,
  Edit3,
  Copy,
  Send,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from 'lucide-react'
import type { EmailTemplateRow, EmailTemplateCategory } from 'types/database'

const CATEGORY_COLORS: Record<EmailTemplateCategory, string> = {
  transactional: 'bg-blue-100 text-blue-700 border-blue-200',
  marketing: 'bg-pink-100 text-pink-700 border-pink-200',
  support: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  admin: 'bg-amber-100 text-amber-700 border-amber-200',
  system: 'bg-gray-100 text-gray-700 border-gray-200',
}

const CATEGORIES: EmailTemplateCategory[] = ['transactional', 'marketing', 'support', 'admin', 'system']

export default function EmailTemplatesClient({
  initialData,
  initialTotal,
}: {
  initialData: EmailTemplateRow[]
  initialTotal: number
}) {
  const router = useRouter()
  const [templates, setTemplates] = useState<EmailTemplateRow[]>(initialData)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmailTemplateCategory | ''>('')
  const [statusFilter, setStatusFilter] = useState<'enabled' | 'disabled' | ''>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [testModalTemplate, setTestModalTemplate] = useState<EmailTemplateRow | null>(null)
  const [testRecipient, setTestRecipient] = useState('')
  const [testSending, setTestSending] = useState(false)
  const [previewModalTemplate, setPreviewModalTemplate] = useState<EmailTemplateRow | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTemplates = async (p: number, l: number) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('page', String(p))
    params.set('limit', String(l))
    if (search.trim()) params.set('search', search.trim())
    if (categoryFilter) params.set('category', categoryFilter)
    if (statusFilter) params.set('status', statusFilter)

    try {
      const res = await fetch(`/api/admin/email-templates?${params.toString()}`)
      const json = await res.json()
      if (res.ok) {
        setTemplates((json.data as EmailTemplateRow[]) ?? [])
        setTotal(json.total ?? 0)
      }
    } catch (err) {
      console.error('[EmailTemplatesClient] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Debounced search/filter changes
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchTemplates(1, limit)
    }, 350)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter, statusFilter, limit])

  useEffect(() => {
    fetchTemplates(page, limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const handleToggleStatus = async (template: EmailTemplateRow) => {
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: !template.is_enabled }),
      })
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, is_enabled: !t.is_enabled } : t))
        )
      }
    } catch (err) {
      console.error('Toggle status failed:', err)
    }
  }

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id)
    try {
      const res = await fetch(`/api/admin/email-templates/${id}/duplicate`, { method: 'POST' })
      if (res.ok) {
        fetchTemplates(page, limit)
      } else {
        alert('Failed to duplicate template')
      }
    } catch {
      alert('Network error while duplicating')
    } finally {
      setDuplicatingId(null)
    }
  }

  const openPreview = async (template: EmailTemplateRow) => {
    setPreviewModalTemplate(template)
    setPreviewLoading(true)
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: {} }),
      })
      const json = await res.json()
      if (res.ok) {
        setPreviewHtml(json.html ?? '')
      } else {
        setPreviewHtml(`<p style="color:red">Preview failed: ${json.error ?? 'Unknown error'}</p>`)
      }
    } catch {
      setPreviewHtml('<p style="color:red">Network error loading preview</p>')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleTestSend = async () => {
    if (!testModalTemplate || !testRecipient.trim()) return
    setTestSending(true)
    try {
      const res = await fetch(`/api/admin/email-templates/${testModalTemplate.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: testRecipient.trim(), variables: {} }),
      })
      const json = await res.json()
      if (res.ok) {
        alert(`Test email sent! Message ID: ${json.messageId ?? json.logId}`)
        setTestModalTemplate(null)
        setTestRecipient('')
      } else {
        alert(json.error ?? 'Failed to send test email')
      }
    } catch {
      alert('Network error while sending test email')
    } finally {
      setTestSending(false)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30"
            />
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as EmailTemplateCategory | '')}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'enabled' | 'disabled' | '')}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
          >
            <option value="">All Statuses</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-lg p-2 transition ${viewMode === 'grid' ? 'bg-white text-[#6d28d9] shadow-sm' : 'text-[#6F7192]'}`}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-lg p-2 transition ${viewMode === 'list' ? 'bg-white text-[#6d28d9] shadow-sm' : 'text-[#6F7192]'}`}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => router.push('/admin/emails/templates/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="group rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#6d28d9]/30 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[#0F1B3D]">{t.name}</h3>
                  <p className="mt-0.5 text-xs text-[#6F7192]">{t.email_type}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    CATEGORY_COLORS[t.category]
                  }`}
                >
                  {t.category}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={t.is_enabled}
                    onChange={() => handleToggleStatus(t)}
                    className="h-4 w-4 rounded border-gray-300 text-[#6d28d9] accent-[#6d28d9]"
                  />
                  <span className="text-xs font-medium text-[#6F7192]">
                    {t.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
                <span className="flex items-center gap-1 text-[10px] text-[#6F7192]">
                  <Clock className="h-3 w-3" />
                  {formatDate(t.updated_at)}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/emails/templates/${t.id}/edit`)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] transition hover:bg-gray-100"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDuplicate(t.id)}
                  disabled={duplicatingId === t.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] transition hover:bg-gray-100 disabled:opacity-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {duplicatingId === t.id ? 'Copying...' : 'Duplicate'}
                </button>
                <button
                  type="button"
                  onClick={() => setTestModalTemplate(t)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] transition hover:bg-gray-100"
                >
                  <Send className="h-3.5 w-3.5" />
                  Test
                </button>
                <button
                  type="button"
                  onClick={() => openPreview(t)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-[#0F1B3D] transition hover:bg-gray-100"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Name</th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Type</th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Category</th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Status</th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Updated</th>
                <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-medium text-[#0F1B3D]">{t.name}</div>
                    <div className="text-xs text-[#6F7192]">{t.subject}</div>
                  </td>
                  <td className="px-5 py-3.5 text-[#6F7192]">{t.email_type}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${CATEGORY_COLORS[t.category]}`}
                    >
                      {t.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={t.is_enabled}
                        onChange={() => handleToggleStatus(t)}
                        className="h-4 w-4 rounded border-gray-300 text-[#6d28d9] accent-[#6d28d9]"
                      />
                      <span className="text-xs text-[#6F7192]">{t.is_enabled ? 'Enabled' : 'Disabled'}</span>
                    </label>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6F7192]">{formatDate(t.updated_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/admin/emails/templates/${t.id}/edit`)}
                        className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D]"
                        title="Edit"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(t.id)}
                        disabled={duplicatingId === t.id}
                        className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D] disabled:opacity-50"
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestModalTemplate(t)}
                        className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D]"
                        title="Test"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openPreview(t)}
                        className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D]"
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[#6F7192]">
                    No templates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <div className="text-xs text-[#6F7192]">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-[#6F7192]"
            >
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-lg border border-gray-300 bg-white p-1.5 text-[#6F7192] hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-[#6F7192]">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-lg border border-gray-300 bg-white p-1.5 text-[#6F7192] hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {testModalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F1B3D]">Send Test Email</h3>
              <button
                type="button"
                onClick={() => {
                  setTestModalTemplate(null)
                  setTestRecipient('')
                }}
                className="rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-[#6F7192]">
                Template: <span className="font-medium text-[#0F1B3D]">{testModalTemplate.name}</span>
              </p>
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[#0F1B3D]">Recipient Email</label>
              <input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="admin@example.com"
                className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-4 py-3 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setTestModalTemplate(null)
                  setTestRecipient('')
                }}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1B3D] transition hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTestSend}
                disabled={testSending || !testRecipient.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {testSending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-[#0F1B3D]">Preview: {previewModalTemplate.name}</h3>
                <p className="text-xs text-[#6F7192]">{previewModalTemplate.subject}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewModalTemplate(null)
                  setPreviewHtml('')
                }}
                className="rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-4">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6d28d9] border-t-transparent" />
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  className="h-full w-full rounded-xl border border-gray-200 bg-white"
                  title="Email Preview"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
