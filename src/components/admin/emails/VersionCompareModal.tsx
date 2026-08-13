'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Monitor, Smartphone, Loader2 } from 'lucide-react'
import type { EmailTemplateVersionRow } from 'types/database'

export default function VersionCompareModal({
  version,
  currentHtmlBody,
  currentSubject,
  variables,
  onClose,
}: {
  version: EmailTemplateVersionRow
  currentHtmlBody: string
  currentSubject: string
  variables: string[]
  onClose: () => void
}) {
  const [leftHtml, setLeftHtml] = useState('')
  const [rightHtml, setRightHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')

  const sampleVars = Object.fromEntries(
    variables.map((v) => [v, `{{${v}}}`])
  )

  const fetchPreview = useCallback(
    async (htmlBody: string) => {
      const res = await fetch('/api/admin/email-templates/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html_body: htmlBody,
          variables: sampleVars,
        }),
      })
      const json = await res.json()
      return json.html ?? `<div style="padding:40px;color:red">Preview error: ${json.error ?? 'Unknown'}</div>`
    },
    [sampleVars]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    void (async () => {
      const [left, right] = await Promise.all([
        fetchPreview(version.html_body ?? ''),
        fetchPreview(currentHtmlBody),
      ])
      if (!cancelled) {
        setLeftHtml(left)
        setRightHtml(right)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [version, currentHtmlBody, currentSubject, fetchPreview])

  const iframeWidth = device === 'mobile' ? '375px' : '100%'
  const iframeMaxWidth = device === 'desktop' ? '600px' : '375px'

  const PreviewIframe = ({ html }: { html: string }) => (
    <iframe
      srcDoc={html}
      className="min-h-[400px] rounded-xl border border-gray-200 bg-white shadow-sm"
      style={{
        width: iframeWidth,
        maxWidth: iframeMaxWidth,
        height: '100%',
      }}
      title="Compare Preview"
      suppressHydrationWarning
    />
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" data-lenis-prevent>
        <div data-lenis-prevent className="flex h-[90vh] w-full max-w-6xl flex-col rounded-2xl border border-gray-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-[#0F1B3D]">
              Compare Version v{version.version_number}
            </h3>
            <p className="text-xs text-[#6F7192]">
              Left: restored version &middot; Right: current template
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Device toggle */}
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Split view */}
        <div data-lenis-prevent className="flex flex-1 gap-4 overflow-hidden p-4">
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#6d28d9]" />
            </div>
          ) : (
            <>
              <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6F7192]">
                  v{version.version_number} — {version.subject ?? 'No subject'}
                </div>
                <div data-lenis-prevent className="flex-1 overflow-auto rounded-xl bg-gray-100 p-4">
                  <PreviewIframe html={leftHtml} />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 overflow-hidden">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6F7192]">
                  Current — {currentSubject}
                </div>
                <div data-lenis-prevent className="flex-1 overflow-auto rounded-xl bg-gray-100 p-4">
                  <PreviewIframe html={rightHtml} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
