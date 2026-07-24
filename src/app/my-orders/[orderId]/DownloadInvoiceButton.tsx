'use client'

import { useState } from 'react'

function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function DownloadInvoiceButton({ orderId }: { orderId: string }) {
  const [downloading, setDownloading] = useState(false)

  return (
    <button
      type="button"
      disabled={downloading}
      onClick={async () => {
        setDownloading(true)
        try {
          const res = await fetch(`/api/orders/${orderId}/invoice`)
          if (!res.ok) {
            const body = await res.json().catch(() => null)
            throw new Error(body?.error ?? `Server error (${res.status})`)
          }
          const blob = await res.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${orderId}.pdf`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        } catch (e) {
          alert(e instanceof Error ? e.message : 'Download failed')
        } finally {
          setDownloading(false)
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-all hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {downloading ? <><Spinner />Downloading...</> : 'Download Invoice'}
    </button>
  )
}
