'use client'

import { useRef, useEffect, useState } from 'react'
import { X, Monitor, Smartphone, Sun, Moon } from 'lucide-react'

export default function LivePreview({
  templateId,
  htmlBody,
  subject,
  variables,
}: {
  templateId?: string | null
  htmlBody: string
  subject: string
  variables: string[]
}) {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [mode, setMode] = useState<'light' | 'dark'>('light')
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const refreshPreview = async () => {
    if (!templateId) {
      // For new templates without ID, we can't use the preview API.
      // Show a simple rendered HTML with branding wrapper stripped.
      setHtml(`<div style="padding:40px;font-family:sans-serif">${htmlBody}</div>`)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/email-templates/${templateId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variables: Object.fromEntries(variables.map((v) => [v, `{{${v}}}`])),
        }),
      })
      const json = await res.json()
      if (res.ok) {
        setHtml(json.html ?? '')
      } else {
        setHtml(`<div style="padding:40px;color:red">Preview error: ${json.error ?? 'Unknown'}</div>`)
      }
    } catch {
      setHtml('<div style="padding:40px;color:red">Network error loading preview</div>')
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh when htmlBody or subject changes (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      void refreshPreview()
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [htmlBody, subject, templateId])

  // Inject dark mode class into iframe
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe || !iframe.contentDocument) return
    const doc = iframe.contentDocument
    if (mode === 'dark') {
      doc.body.classList.add('dark-preview')
    } else {
      doc.body.classList.remove('dark-preview')
    }
  }, [mode, html])

  const iframeWidth = device === 'mobile' ? '375px' : '100%'
  const iframeMaxWidth = device === 'desktop' ? '600px' : '375px'

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`rounded-md p-1.5 transition ${device === 'desktop' ? 'bg-white text-[#6d28d9] shadow-sm' : 'text-[#6F7192]'}`}
            title="Desktop"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`rounded-md p-1.5 transition ${device === 'mobile' ? 'bg-white text-[#6d28d9] shadow-sm' : 'text-[#6F7192]'}`}
            title="Mobile"
          >
            <Smartphone className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setMode('light')}
            className={`rounded-md p-1.5 transition ${mode === 'light' ? 'bg-white text-[#6d28d9] shadow-sm' : 'text-[#6F7192]'}`}
            title="Light"
          >
            <Sun className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setMode('dark')}
            className={`rounded-md p-1.5 transition ${mode === 'dark' ? 'bg-white text-[#6d28d9] shadow-sm' : 'text-[#6F7192]'}`}
            title="Dark"
          >
            <Moon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-gray-100 p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#6d28d9] border-t-transparent" />
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            srcDoc={html}
            className="min-h-[400px] rounded-xl border border-gray-200 bg-white shadow-sm"
            style={{
              width: iframeWidth,
              maxWidth: iframeMaxWidth,
              height: '100%',
            }}
            title="Live Preview"
          />
        )}
      </div>
    </div>
  )
}
