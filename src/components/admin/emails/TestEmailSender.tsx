'use client'

import { useState, useCallback, useEffect } from 'react'
import { Send, Eye, X, AlertCircle, Loader2 } from 'lucide-react'
import type { EmailTemplateRow } from 'types/database'

export default function TestEmailSender({
  templates,
  preselectedTemplateId,
}: {
  templates: EmailTemplateRow[]
  preselectedTemplateId?: string
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(preselectedTemplateId ?? '')
  const [recipient, setRecipient] = useState('')
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  // Reset variables when template changes
  useEffect(() => {
    if (!selectedTemplate) {
      setVariables({})
      setPreviewHtml(null)
      return
    }
    const vars: Record<string, string> = {}
    const rawVars = selectedTemplate.variables
    const varNames = Array.isArray(rawVars) ? (rawVars as string[]) : []
    for (const name of varNames) {
      vars[name] = ''
    }
    setVariables(vars)
    setPreviewHtml(null)
    setError(null)
    setSuccess(null)
  }, [selectedTemplateId])

  const updateVariable = useCallback((name: string, value: string) => {
    setVariables((prev) => ({ ...prev, [name]: value }))
    setPreviewHtml(null)
  }, [])

  const handlePreview = async () => {
    if (!selectedTemplateId) return
    setPreviewLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/email-templates/${selectedTemplateId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables }),
      })
      const json = await res.json()
      if (res.ok) {
        setPreviewHtml(json.html)
        if (json.missingVariables?.length > 0) {
          setError(`Missing variables: ${json.missingVariables.join(', ')}`)
        }
      } else {
        setError(json.error ?? 'Preview failed')
      }
    } catch {
      setError('Network error while generating preview')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleSend = async () => {
    if (!selectedTemplateId || !recipient.trim()) return
    setSending(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/admin/email-templates/${selectedTemplateId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: recipient.trim(), variables }),
      })
      const json = await res.json()
      if (res.ok) {
        setSuccess(`Test email sent! Message ID: ${json.messageId ?? json.logId}`)
        if (json.missingVariables?.length > 0) {
          setError(`Warning — missing variables used: ${json.missingVariables.join(', ')}`)
        }
      } else {
        setError(json.error ?? 'Failed to send test email')
      }
    } catch {
      setError('Network error while sending test email')
    } finally {
      setSending(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30'
  const labelClass = 'block text-sm font-medium text-[#0F1B3D] mb-1.5'

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
      {/* Left: Form */}
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[#0F1B3D]">Send Test Email</h2>
          <p className="text-sm text-[#6F7192] mt-1">
            Choose a template, fill sample variables, preview, then send.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
          {/* Template */}
          <div>
            <label className={labelClass}>Template</label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a template…</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.email_type})
                </option>
              ))}
            </select>
          </div>

          {/* Recipient */}
          <div>
            <label className={labelClass}>Recipient Email</label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="admin@example.com"
              className={inputClass}
            />
          </div>

          {/* Variables */}
          {selectedTemplate && Object.keys(variables).length > 0 && (
            <div>
              <label className={labelClass}>Template Variables</label>
              <div className="space-y-3">
                {Object.entries(variables).map(([name, value]) => (
                  <div key={name}>
                    <label className="block text-xs font-medium text-[#6F7192] mb-1">
                      {'{{' + name + '}}'}
                    </label>
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateVariable(name, e.target.value)}
                      placeholder={`Enter value for ${name}`}
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedTemplate && Object.keys(variables).length === 0 && (
            <p className="text-xs text-[#6F7192]">This template has no variables.</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={previewLoading || !selectedTemplateId}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#0F1B3D] transition hover:bg-gray-50 disabled:opacity-50"
            >
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {previewLoading ? 'Rendering…' : 'Preview'}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !selectedTemplateId || !recipient.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? 'Sending…' : 'Send Test'}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Preview */}
      <div className="space-y-4">
        <div className="sticky top-4 space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">
              Live Preview
            </h3>
            {previewHtml ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#6F7192]">
                    {selectedTemplate?.subject}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewHtml(null)}
                    className="rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full rounded-xl border border-gray-200"
                  style={{ height: '600px' }}
                  sandbox="allow-same-origin"
                  title="Email Preview"
                  suppressHydrationWarning
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl bg-gray-50 py-20">
                <Eye className="h-8 w-8 text-[#6F7192]/30" />
                <p className="mt-2 text-sm text-[#6F7192]">
                  Click Preview to render the email
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
