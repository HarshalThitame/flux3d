'use client'

import { useState } from 'react'

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
      className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-300 transition-all hover:bg-emerald-400/20 disabled:opacity-50"
    >
      {downloading ? 'Downloading...' : 'Download Invoice'}
    </button>
  )
}
