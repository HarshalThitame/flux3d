'use client'

import { useState } from 'react'
import {
  PauseCircle,
  PlayCircle,
  Trash2,
  Copy,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export type QuickActionCampaign = {
  id: string
  name: string
  status: string
}

type QuickActionsToolbarProps = {
  campaigns: QuickActionCampaign[]
  selectedIds: Set<string>
  onSelectAll: (select: boolean) => void
  onPauseSelected: () => void
  onArchiveSelected: () => void
  onDuplicateSelected: () => void
  isProcessing: boolean
}

export default function QuickActionsToolbar({
  campaigns,
  selectedIds,
  onSelectAll,
  onPauseSelected,
  onArchiveSelected,
  onDuplicateSelected,
  isProcessing,
}: QuickActionsToolbarProps) {
  const [showConfirmArchive, setShowConfirmArchive] = useState(false)

  const allSelected = campaigns.length > 0 && campaigns.every((c) => selectedIds.has(c.id))
  const someSelected = selectedIds.size > 0

  const activeSelected = campaigns.filter((c) => selectedIds.has(c.id) && c.status === 'ACTIVE')
  const pausedSelected = campaigns.filter((c) => selectedIds.has(c.id) && c.status === 'PAUSED')

  const handleArchive = () => {
    if (!showConfirmArchive) {
      setShowConfirmArchive(true)
      return
    }
    onArchiveSelected()
    setShowConfirmArchive(false)
  }

  return (
    <div className="rounded-xl border border-[rgba(109,40,217,0.15)] bg-white p-4 space-y-3">
      {/* Top row — Select All + Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onSelectAll(!allSelected)}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0F1B3D] hover:text-[#6d28d9] transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-[#6d28d9]" />
            ) : (
              <Square className="w-4 h-4 text-[#6F7192]" />
            )}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          {someSelected && (
            <span className="text-xs text-[#6F7192]">
              {selectedIds.size} of {campaigns.length} selected
            </span>
          )}
        </div>

        {someSelected && activeSelected.length > 0 && (
          <span className="text-xs text-emerald-600">
            {activeSelected.length} active
          </span>
        )}
      </div>

      {/* Action buttons */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2">
          {isProcessing ? (
            <div className="flex items-center gap-2 text-sm text-[#6F7192]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </div>
          ) : (
            <>
              {/* Pause / Resume */}
              {activeSelected.length > 0 && (
                <button
                  onClick={onPauseSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  Pause {activeSelected.length}
                </button>
              )}
              {pausedSelected.length > 0 && (
                <button
                  onClick={onPauseSelected}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all"
                >
                  <PlayCircle className="w-3.5 h-3.5" />
                  Resume {pausedSelected.length}
                </button>
              )}

              {/* Duplicate */}
              <button
                onClick={onDuplicateSelected}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#6d28d9] bg-[rgba(109,40,217,0.08)] border border-[rgba(109,40,217,0.15)] hover:bg-[rgba(109,40,217,0.12)] transition-all"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate {selectedIds.size}
              </button>

              {/* Archive */}
              <button
                onClick={handleArchive}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {showConfirmArchive ? 'Confirm Archive' : `Archive ${selectedIds.size}`}
              </button>
            </>
          )}
        </div>
      )}

      {/* Archive confirmation warning */}
      {showConfirmArchive && (
        <div className="flex items-start gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-600">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Are you sure?</p>
            <p className="mt-0.5">This will archive {selectedIds.size} campaign(s). This action cannot be undone.</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => setShowConfirmArchive(false)}
                className="px-2 py-1 rounded-md bg-white border border-gray-200 text-[#6F7192] hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                className="px-2 py-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 transition-colors"
              >
                Yes, Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
