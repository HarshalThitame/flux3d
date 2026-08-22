'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, History, LayoutTemplate, Loader2, Redo2, Save, Sparkles, Undo2 } from 'lucide-react'
import { useProductEditor } from '../editor-context'
import { TemplatesModal } from '../TemplatesModal'
import { RevisionHistoryModal } from '../RevisionHistoryModal'
import { getStatusClasses, getStatusLabel } from '../types'

export function EditorHeader() {
  const {
    product,
    dirty,
    saving,
    saveProduct,
    canUndo,
    canRedo,
    undo,
    redo,
    slugStatus,
    updateProduct,
    duplicateProduct,
  } = useProductEditor()
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const statusLabel = getStatusLabel(product)

  return (
    <div className="sticky top-[72px] z-20 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 flex-1">
          <input
            value={product.name}
            onChange={(event) => updateProduct('name', event.target.value)}
            placeholder="Product name"
            className="w-full bg-transparent font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D] outline-none placeholder:text-[#9ca3af]"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(product)}`}>{statusLabel}</span>
            {dirty && <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700">Unsaved changes</span>}
            {!dirty && product.id && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Saved</span>}
            {product.id && <span className="text-xs text-[#6F7192]">ID: {product.id}</span>}
            <span className="hidden text-[10px] text-[#9ca3af] sm:inline">⌘S save · ⌘⇧P publish · ⌘Z undo · ⌘Y redo</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            className="rounded-xl border border-gray-200 p-2.5 text-[#6F7192] hover:bg-gray-50 disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
            aria-label="Redo"
            className="rounded-xl border border-gray-200 p-2.5 text-[#6F7192] hover:bg-gray-50 disabled:opacity-40"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            disabled={!product.id}
            title="View and restore previous versions"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#6F7192] hover:bg-gray-50 disabled:opacity-40"
          >
            <History className="h-4 w-4" />
            <span className="hidden lg:inline">History</span>
          </button>
          <button
            type="button"
            onClick={() => setTemplatesOpen(true)}
            title="Start from a product template"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#6F7192] hover:bg-gray-50"
          >
            <LayoutTemplate className="h-4 w-4" />
            <span className="hidden lg:inline">Templates</span>
          </button>
          <button
            type="button"
            onClick={() => void duplicateProduct()}
            disabled={!product.name.trim()}
            title="Duplicate this product (copy variants, SKUs, and copy)"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#6F7192] hover:bg-gray-50 disabled:opacity-40"
          >
            <Copy className="h-4 w-4" />
            <span className="hidden lg:inline">Duplicate</span>
          </button>
          <Link href="/admin/3d-shop/products" className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-[#6F7192] hover:bg-gray-50">
            Back
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveProduct('draft')}
            className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/20 px-4 py-2.5 text-sm font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            type="button"
            disabled={saving || slugStatus === 'taken'}
            onClick={() => void saveProduct('publish')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5b21b6] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Publish
          </button>
        </div>
      </div>
      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <RevisionHistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  )
}
