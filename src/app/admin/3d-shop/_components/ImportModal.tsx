'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, FileJson, FileSpreadsheet, Loader2, X } from 'lucide-react'

type ImportResult = {
  imported: number
  skipped: number
  errors: { row: number; error: string }[]
}

export function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [fileName, setFileName] = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  function reset() {
    setFileName('')
    setResult(null)
  }

  async function handleFile(file: File) {
    const content = await file.text()
    const format = file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json'
    setFileName(file.name)
    setImporting(true)
    setResult(null)
    try {
      const response = await fetch('/api/3d-shop/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, data: content }),
      })
      const data = (await response.json()) as ImportResult & { error?: string }
      if (!response.ok) throw new Error(data.error || 'Import failed.')
      setResult({ imported: data.imported ?? 0, skipped: data.skipped ?? 0, errors: data.errors ?? [] })
      onImported()
    } catch (error) {
      setResult({ imported: 0, skipped: 1, errors: [{ row: 0, error: error instanceof Error ? error.message : 'Import failed.' }] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              reset()
              onClose()
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">Import Products</h2>
                <p className="mt-1 text-sm text-[#6F7192]">
                  Bulk-create products from a JSON export or a CSV file (up to 300 products).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  reset()
                  onClose()
                }}
                aria-label="Close import modal"
                className="rounded-lg p-1.5 text-[#6F7192] hover:bg-gray-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div data-lenis-prevent className="flex-1 overflow-y-auto p-6">
              {!result && (
                <>
                  <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#6d28d9]/25 bg-[#6d28d9]/5 p-6 text-center transition hover:bg-[#6d28d9]/10">
                    <div className="flex items-center gap-2 text-[#6d28d9]">
                      <FileJson className="h-6 w-6" />
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <span className="mt-3 text-sm font-semibold text-[#0F1B3D]">
                      {fileName ? fileName : 'Choose a .json or .csv file'}
                    </span>
                    <span className="mt-1 text-xs text-[#6F7192]">
                      JSON exports from this admin are re-importable. CSV must have a <b>name</b> column.
                    </span>
                    <input
                      type="file"
                      accept=".json,.csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) void handleFile(file)
                      }}
                    />
                  </label>
                  {importing && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-[#6F7192]">
                      <Loader2 className="h-4 w-4 animate-spin text-[#6d28d9]" />
                      Importing products…
                    </div>
                  )}
                </>
              )}

              {result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                      <div className="text-2xl font-bold text-emerald-700">{result.imported}</div>
                      <div className="text-xs font-medium text-emerald-600">Imported</div>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
                      <div className="text-2xl font-bold text-rose-700">{result.skipped}</div>
                      <div className="text-xs font-medium text-rose-600">Failed</div>
                    </div>
                  </div>
                  {result.errors.length > 0 && (
                    <div data-lenis-prevent className="max-h-48 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-3">
                      <div className="text-xs font-semibold text-[#0F1B3D]">Errors ({result.errors.length})</div>
                      <ul className="mt-2 space-y-1">
                        {result.errors.slice(0, 20).map((err, index) => (
                          <li key={index} className="text-xs text-rose-600">
                            {err.row > 0 ? `Row ${err.row}: ` : ''}
                            {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.errors.length === 0 && (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      Import completed successfully.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 px-6 py-4">
              <div className="flex items-center justify-between">
                {result ? (
                  <button
                    type="button"
                    onClick={() => {
                      reset()
                      onClose()
                    }}
                    className="rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5b21b6]"
                  >
                    Done
                  </button>
                ) : (
                  <span className="text-xs text-[#6F7192]">
                    Tip: use <b>Export</b> first to see the expected format.
                  </span>
                )}
                {result && !importing && (
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-xl border border-[#6d28d9]/20 px-4 py-2.5 text-sm font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
                  >
                    Import another file
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
