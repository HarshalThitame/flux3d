'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Copy, Send, Eye, X, AlertCircle } from 'lucide-react'
import HtmlEditor from './HtmlEditor'
import LivePreview from './LivePreview'
import TemplateSidebar from './TemplateSidebar'
import VariableAutocomplete from './VariableAutocomplete'
import VersionCompareModal from './VersionCompareModal'
import type { EmailTemplateRow, EmailTemplateCategory, EmailTemplateVersionRow } from 'types/database'

export default function TemplateEditor({
  template,
  versions,
}: {
  template?: EmailTemplateRow | null
  versions?: unknown[]
}) {
  const router = useRouter()
  const isNew = !template

  const [name, setName] = useState(template?.name ?? '')
  const [emailType, setEmailType] = useState(template?.email_type ?? '')
  const [category, setCategory] = useState<EmailTemplateCategory>(template?.category ?? 'transactional')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [htmlBody, setHtmlBody] = useState(template?.html_body ?? '')
  const [description, setDescription] = useState(template?.description ?? '')
  const [isEnabled, setIsEnabled] = useState(template?.is_enabled ?? true)
  const [variables, setVariables] = useState<string[]>(() => {
    const raw = template?.variables
    if (Array.isArray(raw)) return raw as string[]
    return []
  })
  const [attachments, setAttachments] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [duplicating, setDuplicating] = useState(false)
  const [testModalOpen, setTestModalOpen] = useState(false)
  const [testRecipient, setTestRecipient] = useState('')
  const [testVariables, setTestVariables] = useState<Record<string, string>>({})
  const [testPreviewHtml, setTestPreviewHtml] = useState<string | null>(null)
  const [testPreviewLoading, setTestPreviewLoading] = useState(false)
  const [testSending, setTestSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comparingVersion, setComparingVersion] = useState<EmailTemplateVersionRow | null>(null)

  // Variable autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const autocompleteAnchorRef = useRef<HTMLDivElement>(null)

  // Fetch available attachments
  useEffect(() => {
    if (isNew) return
    void (async () => {
      try {
        const res = await fetch('/api/admin/email-attachments')
        if (res.ok) {
          const json = await res.json()
          const names = (json.data ?? []).map((f: { name: string }) => f.name)
          setAttachments(names)
        }
      } catch {
        // silent
      }
    })()
  }, [isNew])

  // Track last two chars for {{ detection
  const handleHtmlBodyChange = (value: string) => {
    setHtmlBody(value)
    setError(null)
    const cursorPos = (document.activeElement as HTMLTextAreaElement | null)?.selectionStart ?? 0
    const beforeCursor = value.slice(Math.max(0, cursorPos - 2), cursorPos)
    if (beforeCursor === '{{') {
      setShowAutocomplete(true)
    } else if (!value.slice(0, cursorPos).includes('{{', Math.max(0, cursorPos - 20))) {
      setShowAutocomplete(false)
    }
  }

  const handleInsertVariable = (variable: string) => {
    const textarea = document.querySelector('[data-html-editor-textarea]') as HTMLTextAreaElement | null
    if (!textarea) {
      setHtmlBody((prev) => prev + variable)
      setShowAutocomplete(false)
      return
    }
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = htmlBody.slice(0, start)
    const after = htmlBody.slice(end)
    const newValue = before + variable + after
    setHtmlBody(newValue)
    setShowAutocomplete(false)
    // Restore cursor after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + variable.length
      textarea.setSelectionRange(newPos, newPos)
    })
  }

  const handleSidebarChange = useCallback((updates: Record<string, unknown>) => {
    if ('name' in updates) setName(String(updates.name))
    if ('email_type' in updates) setEmailType(String(updates.email_type))
    if ('category' in updates) setCategory(updates.category as EmailTemplateCategory)
    if ('subject' in updates) setSubject(String(updates.subject))
    if ('description' in updates) setDescription(String(updates.description))
    if ('is_enabled' in updates) setIsEnabled(Boolean(updates.is_enabled))
    if ('variables' in updates) {
      const v = updates.variables
      setVariables(Array.isArray(v) ? (v as string[]) : [])
    }
    setError(null)
  }, [])

  const validate = () => {
    if (!name.trim()) return 'Name is required'
    if (!emailType.trim()) return 'Email type is required'
    if (!subject.trim()) return 'Subject is required'
    if (!htmlBody.trim()) return 'HTML body is required'
    return null
  }

  const handleSave = async () => {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setSaving(true)
    setError(null)

    const body = {
      name: name.trim(),
      email_type: emailType.trim(),
      category,
      subject: subject.trim(),
      html_body: htmlBody.trim(),
      variables,
      description: description.trim() || null,
      is_enabled: isEnabled,
    }

    try {
      const url = isNew ? '/api/admin/email-templates' : `/api/admin/email-templates/${template!.id}`
      const method = isNew ? 'POST' : 'PUT'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Save failed')
      } else {
        if (isNew && json.data?.id) {
          router.replace(`/admin/emails/templates/${json.data.id}/edit`)
        }
      }
    } catch {
      setError('Network error while saving')
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (!template) return
    setDuplicating(true)
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}/duplicate`, { method: 'POST' })
      const json = await res.json()
      if (res.ok && json.data?.id) {
        router.push(`/admin/emails/templates/${json.data.id}/edit`)
      } else {
        alert(json.error ?? 'Duplicate failed')
      }
    } catch {
      alert('Network error while duplicating')
    } finally {
      setDuplicating(false)
    }
  }

  const handleTestPreview = async () => {
    if (!template) return
    setTestPreviewLoading(true)
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: testVariables }),
      })
      const json = await res.json()
      if (res.ok) {
        setTestPreviewHtml(json.html)
      } else {
        alert(json.error ?? 'Preview failed')
      }
    } catch {
      alert('Network error while generating preview')
    } finally {
      setTestPreviewLoading(false)
    }
  }

  const handleTestSend = async () => {
    if (!template || !testRecipient.trim()) return
    setTestSending(true)
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: testRecipient.trim(), variables: testVariables }),
      })
      const json = await res.json()
      if (res.ok) {
        alert(`Test email sent! Message ID: ${json.messageId ?? json.logId}`)
        setTestModalOpen(false)
        setTestRecipient('')
        setTestPreviewHtml(null)
        setTestVariables({})
      } else {
        alert(json.error ?? 'Failed to send test email')
      }
    } catch {
      alert('Network error while sending test email')
    } finally {
      setTestSending(false)
    }
  }

  const handleRestoreVersion = async (versionId: string) => {
    if (!template) return
    if (!confirm('Restore this version? Current changes will be overwritten.')) return
    try {
      const res = await fetch(`/api/admin/email-templates/${template.id}/versions/${versionId}/restore`, {
        method: 'POST',
      })
      if (res.ok) {
        // Refresh the page to load restored content
        router.refresh()
      } else {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Restore failed')
      }
    } catch {
      alert('Network error while restoring')
    }
  }

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push('/admin/emails/templates')}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#6F7192] transition hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-xl font-bold text-[#0F1B3D]">
            {isNew ? 'New Template' : template?.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={duplicating}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1B3D] transition hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
              >
                <Copy className="h-4 w-4" />
                {duplicating ? 'Copying...' : 'Duplicate'}
              </button>
              <button
                type="button"
                onClick={() => setTestModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1B3D] transition hover:bg-gray-50 min-h-[44px]"
              >
                <Send className="h-4 w-4" />
                Test
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50 min-h-[44px]"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : isNew ? 'Create Template' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Main editor area */}
      <div className="flex flex-1 min-h-0 gap-4 overflow-hidden">
        {/* Left: Sidebar + Editor */}
        <div className="flex flex-1 min-w-0 gap-4 overflow-hidden">
          {/* Sidebar */}
          <div className="hidden w-72 shrink-0 overflow-y-auto xl:block">
            <TemplateSidebar
              name={name}
              emailType={emailType}
              category={category}
              subject={subject}
              description={description}
              isEnabled={isEnabled}
              isSystem={template?.is_system ?? false}
              variables={variables}
              versions={versions ?? []}
              attachments={attachments}
              onChange={handleSidebarChange}
              onSave={handleSave}
              saving={saving}
              onRestoreVersion={!isNew ? handleRestoreVersion : undefined}
              onCompareVersion={!isNew ? setComparingVersion : undefined}
              onInsertAttachment={!isNew ? handleInsertVariable : undefined}
            />
          </div>

          {/* Editor */}
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden">
            {/* Mobile metadata (shown only on small screens) */}
            <div className="xl:hidden space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null) }}
                  placeholder="Template Name *"
                  className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
                />
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setError(null) }}
                  placeholder="Subject *"
                  className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
                />
              </div>
            </div>

            {/* HTML Body */}
            <div className="relative flex min-h-0 flex-1 flex-col" ref={autocompleteAnchorRef}>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">
                  HTML Body
                </label>
                <span className="text-[10px] text-[#6F7192]">Type {'{{'} to insert variables</span>
              </div>
              <div className="relative flex min-h-0 flex-1" data-html-editor>
                <HtmlEditor value={htmlBody} onChange={handleHtmlBodyChange} />
                {showAutocomplete && (
                  <div className="absolute left-4 top-8 z-50">
                    <VariableAutocomplete
                      variables={variables}
                      onSelect={(v) => handleInsertVariable(`{{${v}}}`)}
                      onClose={() => setShowAutocomplete(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Quick variable chips */}
            <div className="flex flex-wrap gap-2">
              {variables.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsertVariable(`{{${v}}}`)}
                  className="rounded-lg bg-[#6d28d9]/10 px-2 py-1 text-xs font-mono text-[#6d28d9] transition hover:bg-[#6d28d9]/20"
                >
                  {'{{' + v + '}}'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="hidden w-[45%] shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white lg:block">
          <LivePreview
            templateId={template?.id ?? null}
            htmlBody={htmlBody}
            subject={subject}
            variables={variables}
          />
        </div>
      </div>

      {/* Test Modal */}
      {comparingVersion && template && (
        <VersionCompareModal
          version={comparingVersion}
          currentHtmlBody={htmlBody}
          currentSubject={subject}
          variables={variables}
          onClose={() => setComparingVersion(null)}
        />
      )}

      {testModalOpen && template && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F1B3D]">Send Test Email</h3>
              <button
                type="button"
                onClick={() => {
                  setTestModalOpen(false)
                  setTestRecipient('')
                  setTestPreviewHtml(null)
                  setTestVariables({})
                }}
                className="rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-[#6F7192]">
                Template: <span className="font-medium text-[#0F1B3D]">{template.name}</span>
                {' '}
                <span className="text-xs">({template.email_type})</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F1B3D] mb-1.5">Recipient Email</label>
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-4 py-3 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
                  />
                </div>

                {variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[#0F1B3D] mb-1.5">Variables</label>
                    <div className="space-y-3">
                      {variables.map((v) => (
                        <div key={v}>
                          <label className="block text-xs font-medium text-[#6F7192] mb-1">
                            {'{{' + v + '}}'}
                          </label>
                          <input
                            type="text"
                            value={testVariables[v] ?? ''}
                            onChange={(e) =>
                              setTestVariables((prev) => ({ ...prev, [v]: e.target.value }))
                            }
                            placeholder={`Value for ${v}`}
                            className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/30"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestPreview}
                    disabled={testPreviewLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1B3D] transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4" />
                    {testPreviewLoading ? 'Rendering…' : 'Preview'}
                  </button>
                  <button
                    type="button"
                    onClick={handleTestSend}
                    disabled={testSending || !testRecipient.trim()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {testSending ? 'Sending…' : 'Send Test'}
                  </button>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">
                  Preview
                </h4>
                {testPreviewHtml ? (
                  <iframe
                    srcDoc={testPreviewHtml}
                    className="w-full rounded-xl border border-gray-200"
                    style={{ height: '400px' }}
                    sandbox="allow-same-origin"
                    title="Email Preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-16">
                    <Eye className="h-8 w-8 text-[#6F7192]/30" />
                    <p className="mt-2 text-sm text-[#6F7192]">
                      Click Preview to render
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
