'use client'

import { useState } from 'react'
import { Save, RotateCcw, Paperclip, GitCompare } from 'lucide-react'
import type { EmailTemplateCategory, EmailTemplateVersionRow } from 'types/database'

const CATEGORIES: EmailTemplateCategory[] = ['transactional', 'marketing', 'support', 'admin', 'system']

export default function TemplateSidebar({
  name,
  emailType,
  category,
  subject,
  description,
  isEnabled,
  isSystem,
  variables,
  versions,
  attachments,
  onChange,
  onSave,
  saving,
  onRestoreVersion,
  onCompareVersion,
  onInsertAttachment,
}: {
  name: string
  emailType: string
  category: EmailTemplateCategory
  subject: string
  description: string
  isEnabled: boolean
  isSystem: boolean
  variables: string[]
  versions: unknown[]
  attachments?: string[]
  onChange: (updates: Record<string, unknown>) => void
  onSave: () => void
  saving: boolean
  onRestoreVersion?: (versionId: string) => void
  onCompareVersion?: (version: EmailTemplateVersionRow) => void
  onInsertAttachment?: (placeholder: string) => void
}) {
  const [newVar, setNewVar] = useState('')

  const typedVersions = (versions ?? []) as EmailTemplateVersionRow[]

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
    <div data-lenis-prevent className="flex h-full flex-col gap-5 overflow-y-auto">
      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50 min-h-[44px]"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Template'}
        </button>
      </div>

      {/* Metadata Form */}
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Template Details</h4>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#0F1B3D]">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#0F1B3D]">Email Type *</label>
          <input
            type="text"
            value={emailType}
            onChange={(e) => onChange({ email_type: e.target.value })}
            disabled={isSystem}
            className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30 disabled:opacity-50"
          />
          {isSystem && (
            <p className="mt-1 text-[10px] text-[#6F7192]">System template type cannot be changed</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#0F1B3D]">Category</label>
          <select
            value={category}
            onChange={(e) => onChange({ category: e.target.value as EmailTemplateCategory })}
            className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#0F1B3D]">Subject *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onChange({ subject: e.target.value })}
            className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[#0F1B3D]">Description</label>
          <textarea
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={2}
            className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-[#0F1B3D]">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onChange({ is_enabled: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-[#6d28d9] accent-[#6d28d9]"
          />
          Enabled
        </label>
      </div>

      {/* Variables */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
        <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Variables</h4>
        <div className="flex flex-wrap gap-2">
          {variables.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded-lg bg-[#6d28d9]/10 px-2 py-1 text-xs font-mono text-[#6d28d9]"
            >
              {'{{' + v + '}}'}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newVar}
            onChange={(e) => setNewVar(e.target.value.replace(/\s/g, '_').replace(/[^a-zA-Z0-9_]/g, ''))}
            placeholder="new_variable"
            className="flex-1 rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
          />
          <button
            type="button"
            onClick={() => {
              if (newVar && !variables.includes(newVar)) {
                onChange({ variables: [...variables, newVar] })
                setNewVar('')
              }
            }}
            disabled={!newVar || variables.includes(newVar)}
            className="inline-flex items-center gap-1 rounded-xl bg-[#6d28d9] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#4c1d95] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {/* Attachments */}
      {(attachments ?? []).length > 0 && onInsertAttachment && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Attachments</h4>
          <div className="flex flex-wrap gap-2">
            {attachments!.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onInsertAttachment(`{{attachment:${a}}}`)}
                className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-xs font-mono text-green-700 transition hover:bg-green-100 border border-green-200"
                title="Click to insert into editor"
              >
                <Paperclip className="h-3 w-3" />
                {a}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#6F7192]">
            Click a file to insert its placeholder at the cursor.
          </p>
        </div>
      )}

      {/* Version History */}
      {typedVersions.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4">
          <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Version History</h4>
          <div className="space-y-2">
            {typedVersions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#0F1B3D]">v{v.version_number}</span>
                    <span className="text-[10px] text-[#6F7192]">{formatDate(v.created_at)}</span>
                  </div>
                  <div className="truncate text-[10px] text-[#6F7192]">{v.subject ?? 'No subject'}</div>
                </div>
                <div className="ml-2 flex items-center gap-1">
                  {onCompareVersion && (
                    <button
                      type="button"
                      onClick={() => onCompareVersion(v)}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/10 border border-[#6d28d9]/20"
                      title="Compare with current"
                    >
                      <GitCompare className="h-3 w-3" />
                      Compare
                    </button>
                  )}
                  {onRestoreVersion && (
                    <button
                      type="button"
                      onClick={() => onRestoreVersion(String(v.version_number))}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-[#6d28d9] transition hover:bg-[#6d28d9]/10 border border-[#6d28d9]/20"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Restore
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
