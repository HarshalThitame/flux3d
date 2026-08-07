'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { History, Loader2, RotateCcw, Trash2, X } from 'lucide-react'
import { describeChanges } from '@/lib/shop/revisions'
import { useProductEditor } from './editor-context'

function formatTimestamp(ts: number) {
  const date = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function RevisionHistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { revisions, restoreRevision, clearRevisionHistory } = useProductEditor()
  const [restoringTs, setRestoringTs] = useState<number | null>(null)

  const ordered = [...revisions].sort((a, b) => b.timestamp - a.timestamp)

  async function handleRestore(timestamp: number) {
    setRestoringTs(timestamp)
    try {
      await restoreRevision(timestamp)
      onClose()
    } finally {
      setRestoringTs(null)
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
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">
                  <History className="h-4 w-4 text-[#6d28d9]" />
                  Revision History
                </h2>
                <p className="mt-1 text-sm text-[#6F7192]">
                  Autosaved snapshots of this product. Restore any version below.
                </p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#6F7192] hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {ordered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-[#6F7192]">
                  No revisions saved yet. Snapshots are captured automatically every time the product is saved.
                </div>
              ) : (
                <div className="space-y-2">
                  {ordered.map((revision, index) => {
                    const older = ordered[index + 1]
                    const summary = older ? describeChanges(older, revision) : 'Initial version'
                    return (
                      <div key={revision.timestamp} className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-[#0F1B3D]">{formatTimestamp(revision.timestamp)}</div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-[#6F7192]">{summary}</div>
                        </div>
                        <button
                          type="button"
                          disabled={restoringTs !== null}
                          onClick={() => void handleRestore(revision.timestamp)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#6d28d9] px-3 py-2 text-xs font-semibold text-white hover:bg-[#5b21b6] disabled:opacity-60"
                        >
                          {restoringTs === revision.timestamp ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Restore
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {ordered.length > 0 && (
              <div className="border-t border-gray-100 px-6 py-4">
                <button
                  type="button"
                  onClick={() => {
                    clearRevisionHistory()
                    onClose()
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all revisions
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
