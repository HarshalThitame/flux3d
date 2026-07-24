'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'

export function DownloadInvoiceButton() {
  const [printing, setPrinting] = useState(false)

  return (
    <button
      type="button"
      disabled={printing}
      onClick={() => {
        setPrinting(true)
        window.print()
        setTimeout(() => setPrinting(false), 1000)
      }}
      className="flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 text-xs font-bold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <FileText className="h-3.5 w-3.5" />
      {printing ? 'Preparing...' : 'Print / Save Invoice'}
    </button>
  )
}
