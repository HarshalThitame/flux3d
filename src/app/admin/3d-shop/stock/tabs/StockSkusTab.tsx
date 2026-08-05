'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pencil,
} from 'lucide-react'
import type { AdminToastState } from '@/components/admin/AdminToast'
import Modal from '@/components/admin/Modal'
import StockStatusBadge from '@/components/admin/stock/StockStatusBadge'
import type { StockSkuRow } from '@/lib/shop/stock'
import { formatVariantLabel } from '@/lib/shop/selection'

type StockSkusTabProps = {
  toast: AdminToastState
  setToast: (toast: AdminToastState) => void
  refresh: () => void
  refreshKey: number
}

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'in_stock', label: 'In stock' },
  { value: 'low_stock', label: 'Low stock' },
  { value: 'out_of_stock', label: 'Out of stock' },
  { value: 'unavailable', label: 'Unavailable' },
]

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'All availability' },
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
]

const ADJUST_REASONS = [
  { value: 'manual_adjust', label: 'Manual adjustment' },
  { value: 'restock', label: 'Restock' },
  { value: 'release', label: 'Release reserved stock' },
]

type Category = { id: string; name: string }

type AdjustTarget =
  | { kind: 'single'; sku: StockSkuRow }
  | { kind: 'bulk'; skus: StockSkuRow[] }

type AdjustDraft = {
  mode: 'add' | 'subtract' | 'set'
  value: string
  reason: string
  note: string
}

export default function StockSkusTab({ setToast, refresh, refreshKey }: StockSkusTabProps) {
  const [skus, setSkus] = useState<StockSkuRow[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [availability, setAvailability] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null)
  const [adjustDraft, setAdjustDraft] = useState<AdjustDraft>({
    mode: 'add',
    value: '',
    reason: 'manual_adjust',
    note: '',
  })
  const [adjusting, setAdjusting] = useState(false)

  const PAGE_SIZE = 20
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const loadCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/3d-shop/admin/categories')
      const data = (await response.json().catch(() => ({}))) as { categories?: Category[] }
      if (response.ok) setCategories(data.categories ?? [])
    } catch {
      setCategories([])
    }
  }, [])

  const loadSkus = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
        sort: 'updated_at',
        dir: 'desc',
      })
      if (categoryId) params.set('category_id', categoryId)
      if (status) params.set('status', status)
      if (availability) params.set('availability', availability)
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/3d-shop/admin/stock/skus?${params.toString()}`)
      const data = (await response.json().catch(() => ({}))) as {
        skus?: StockSkuRow[]
        total?: number
        error?: string
      }
      if (!response.ok) throw new Error(data.error || 'Failed to load SKUs.')
      setSkus(data.skus ?? [])
      setTotal(data.total ?? 0)
      setSelected(new Set())
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load SKUs.' })
    } finally {
      setLoading(false)
    }
  }, [categoryId, page, search, status, availability, setToast])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCategories(), 0)
    return () => window.clearTimeout(timer)
  }, [loadCategories])

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSkus(), 250)
    return () => window.clearTimeout(timer)
  }, [loadSkus, refreshKey])

  const allSelected = useMemo(
    () => skus.length > 0 && skus.every((sku) => selected.has(sku.id)),
    [skus, selected]
  )

  const toggleAll = () => {
    setSelected((current) => {
      if (current.size === skus.length) return new Set()
      return new Set(skus.map((sku) => sku.id))
    })
  }

  const toggleOne = (id: string) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openAdjust = (target: AdjustTarget) => {
    setAdjustTarget(target)
    setAdjustDraft({ mode: 'add', value: '', reason: 'manual_adjust', note: '' })
  }

  const submitAdjust = async () => {
    if (!adjustTarget) return
    const value = Number(adjustDraft.value)
    if (!Number.isInteger(value) || value < 0) {
      setToast({ type: 'error', message: 'Enter a valid non-negative whole number.' })
      return
    }
    if (adjustDraft.mode !== 'set' && value === 0) {
      setToast({ type: 'error', message: 'Value must be non-zero for add/subtract.' })
      return
    }

    setAdjusting(true)
    try {
      if (adjustTarget.kind === 'single') {
        const delta = adjustDraft.mode === 'subtract' ? -value : value
        if (adjustDraft.mode === 'set') {
          const current = adjustTarget.sku.stock_quantity
          const computed = value - current
          if (computed === 0) {
            setToast({ type: 'info', message: 'No change — stock already equals that value.' })
            setAdjustTarget(null)
            return
          }
          await postAdjust(adjustTarget.sku.id, computed)
        } else {
          await postAdjust(adjustTarget.sku.id, delta)
        }
      } else {
        const response = await fetch('/api/3d-shop/admin/stock/bulk-adjust', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sku_ids: adjustTarget.skus.map((sku) => sku.id),
            mode: adjustDraft.mode,
            value,
            reason: adjustDraft.reason,
            note: adjustDraft.note || null,
          }),
        })
        const data = (await response.json().catch(() => ({}))) as {
          error?: string
          message?: string
        }
        if (!response.ok) throw new Error(data.error || 'Bulk adjustment failed.')
        setToast({ type: 'success', message: data.message ?? 'Stock updated.' })
      }
      setAdjustTarget(null)
      setSelected(new Set())
      await loadSkus()
      refresh()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Adjustment failed.' })
    } finally {
      setAdjusting(false)
    }
  }

  const postAdjust = async (skuId: string, delta: number) => {
    const response = await fetch('/api/3d-shop/admin/stock/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku_id: skuId,
        quantity_delta: delta,
        reason: adjustDraft.reason,
        note: adjustDraft.note || null,
      }),
    })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) throw new Error(data.error || 'Adjustment failed.')
    setToast({ type: 'success', message: 'Stock updated and movement recorded.' })
  }

  const selectedSkus = useMemo(() => skus.filter((sku) => selected.has(sku.id)), [skus, selected])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[220px_200px_200px_1fr]">
          <select
            value={categoryId}
            onChange={(event) => {
              setCategoryId(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            aria-label="Filter by category"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            aria-label="Filter by stock status"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={availability}
            onChange={(event) => {
              setAvailability(event.target.value)
              setPage(1)
            }}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            aria-label="Filter by availability"
          >
            {AVAILABILITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search by SKU or product name"
              className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            />
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#6d28d9]/20 bg-[#f5f3ff] px-4 py-3">
          <span className="text-sm font-semibold text-[#6d28d9]">
            {selected.size} selected
          </span>
          <button
            type="button"
            onClick={() => openAdjust({ kind: 'bulk', skus: selectedSkus })}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#6d28d9] px-4 text-sm font-semibold text-white transition hover:bg-[#5b21b6]"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Adjust selected
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-[#6d28d9]/20 bg-white px-4 text-sm font-semibold text-[#6F7192] transition hover:bg-white/70"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all SKUs on this page"
                    className="h-4 w-4 accent-[#6d28d9]"
                  />
                </th>
                {['Product', 'SKU / Variant', 'Status', 'On hand', 'Reserved', 'Threshold', 'Price', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#6F7192]">
                    Loading SKUs…
                  </td>
                </tr>
              ) : skus.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-sm text-[#6F7192]">
                    <Package className="mx-auto h-8 w-8 text-gray-300" />
                    <p className="mt-3">No SKUs match your filters.</p>
                  </td>
                </tr>
              ) : (
                skus.map((sku) => (
                  <tr key={sku.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(sku.id)}
                        onChange={() => toggleOne(sku.id)}
                        aria-label={`Select ${sku.sku_code}`}
                        className="h-4 w-4 accent-[#6d28d9]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex min-w-[180px] items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                          {sku.product_thumbnail ? (
                            <Image src={sku.product_thumbnail} alt={sku.product_name ?? ''} fill sizes="40px" className="object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center text-[10px] text-[#6F7192]">No img</div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[#0F1B3D]">{sku.product_name}</div>
                          <div className="text-[11px] text-[#6F7192]">{sku.category_name || 'Uncategorized'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-[#0F1B3D]">{sku.sku_code}</div>
                      <div className="text-[11px] text-[#6F7192]">{formatVariantLabel(sku.variant_combination)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StockStatusBadge status={sku.stock_status} />
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-[#0F1B3D]">{sku.stock_quantity}</td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{sku.reserved_quantity}</td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{sku.reorder_point ?? sku.low_stock_threshold ?? 5}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#0F1B3D]">₹{Number(sku.price).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openAdjust({ kind: 'single', sku })}
                          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 text-xs font-semibold text-[#6F7192] transition hover:border-[#6d28d9]/30 hover:text-[#6d28d9]"
                          title="Adjust stock"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Adjust
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-[#6F7192]">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 text-[#6F7192] transition disabled:opacity-30 hover:bg-gray-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-[#6F7192]">{page} / {totalPages}</span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-200 text-[#6F7192] transition disabled:opacity-30 hover:bg-gray-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Adjust modal */}
      <Modal
        open={adjustTarget !== null}
        onOpenChangeAction={(open) => {
          if (!open) setAdjustTarget(null)
        }}
        title={adjustTarget?.kind === 'bulk' ? `Adjust ${adjustTarget.skus.length} SKUs` : 'Adjust stock'}
        description="Changes are audited as stock movements with the reason you choose."
      >
        {adjustTarget && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3" role="radiogroup" aria-label="Adjustment mode">
              {(
                [
                  { value: 'add', label: 'Add', icon: <ArrowUpFromLine className="h-4 w-4" /> },
                  { value: 'subtract', label: 'Subtract', icon: <ArrowDownToLine className="h-4 w-4" /> },
                  { value: 'set', label: 'Set to', icon: <SlidersHorizontal className="h-4 w-4" /> },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={adjustDraft.mode === option.value}
                  onClick={() => setAdjustDraft((current) => ({ ...current, mode: option.value }))}
                  className={`flex min-h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold transition ${
                    adjustDraft.mode === option.value
                      ? 'border-[#6d28d9]/40 bg-[#f5f3ff] text-[#6d28d9]'
                      : 'border-gray-200 text-[#6F7192] hover:border-[#6d28d9]/20'
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Quantity</span>
              <input
                type="number"
                min={0}
                value={adjustDraft.value}
                onChange={(event) => setAdjustDraft((current) => ({ ...current, value: event.target.value }))}
                placeholder={adjustDraft.mode === 'set' ? 'Absolute stock level' : 'Units to adjust'}
                className="mt-2 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40 min-h-[44px]"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">Reason</span>
              <select
                value={adjustDraft.reason}
                onChange={(event) => setAdjustDraft((current) => ({ ...current, reason: event.target.value }))}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40 min-h-[44px]"
              >
                {ADJUST_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6F7192]">
                Note <span className="font-normal normal-case text-[#9ca3af]">(optional)</span>
              </span>
              <textarea
                value={adjustDraft.note}
                onChange={(event) => setAdjustDraft((current) => ({ ...current, note: event.target.value }))}
                rows={3}
                placeholder="e.g. Received vendor PO #1234"
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40"
              />
            </label>

            {adjustTarget.kind === 'single' && (
              <p className="text-xs text-[#6F7192]">
                Current stock for <strong className="text-[#0F1B3D]">{adjustTarget.sku.sku_code}</strong>:{' '}
                <strong className="text-[#0F1B3D]">{adjustTarget.sku.stock_quantity}</strong> on hand ·{' '}
                {adjustTarget.sku.reserved_quantity} reserved.
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAdjustTarget(null)}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#6F7192] transition hover:bg-gray-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitAdjust()}
                disabled={adjusting || !adjustDraft.value}
                className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:opacity-50 min-h-[44px]"
              >
                {adjusting ? 'Saving…' : adjustTarget.kind === 'bulk' ? `Update ${adjustTarget.skus.length} SKUs` : 'Update stock'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
