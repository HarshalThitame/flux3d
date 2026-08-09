'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Images, Loader2, Trash2 } from 'lucide-react'
import { useProductEditor } from '../editor-context'
import { Section } from '../ui'
import { comboLabel } from '../types'
import { ImageGalleryModal } from './ImageGalleryModal'
import type { ShopSku, ShopSkuImage } from '@/lib/shop/admin-types'

type BulkField = 'price' | 'compare_at' | 'stock' | 'low_stock' | 'weight'

const bulkFields: { key: BulkField; label: string; skuKey: keyof ShopSku }[] = [
  { key: 'price', label: 'Price (₹)', skuKey: 'price' },
  { key: 'compare_at', label: 'Compare At', skuKey: 'compare_at_price' },
  { key: 'stock', label: 'Stock Qty', skuKey: 'stock_quantity' },
  { key: 'low_stock', label: 'Low Stock', skuKey: 'low_stock_threshold' },
  { key: 'weight', label: 'Weight (g)', skuKey: 'weight_grams' },
]

function SkuImageUpload({ skuId, url }: { skuId: string; url: string | null }) {
  const { uploadImage, setToast } = useProductEditor()
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-2 py-2 text-xs text-[#6F7192]">
      {url ? (
        <span className="relative h-6 w-6 overflow-hidden rounded">
          <Image src={url} alt="Variant" fill sizes="24px" className="object-cover" />
        </span>
      ) : (
        <ImagePlus className="h-4 w-4" />
      )}
      Upload
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file)
            void uploadImage(file, 'variant', skuId).catch((error) =>
              setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
            )
        }}
      />
    </label>
  )
}

function SkuGalleryButton({ sku }: { sku: ShopSku }) {
  const { skuImages, addSkuImage, updateSkuImage, removeSkuImage, reorderSkuImages, uploadState, setToast } =
    useProductEditor()
  const [open, setOpen] = useState(false)
  const images: ShopSkuImage[] = skuImages[sku.id] ?? []
  const uploadPrefix = `sku-${sku.id}-`
  const activeUploads = Object.fromEntries(
    Object.entries(uploadState).filter(([key]) => key.startsWith(uploadPrefix))
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-semibold text-[#0F1B3D] transition hover:border-[#6d28d9]/40 hover:text-[#6d28d9]"
        title="Manage gallery images"
      >
        <Images className="h-4 w-4" />
        Gallery
        {images.length > 0 && (
          <span className="rounded-full bg-[#6d28d9]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#6d28d9]">{images.length}</span>
        )}
      </button>
      <ImageGalleryModal
        open={open}
        title={`Gallery — ${comboLabel(sku.variant_combination)}`}
        images={images}
        uploadState={activeUploads}
        onClose={() => setOpen(false)}
        onAddFiles={(files) => {
          void Promise.all(files.map((file) => addSkuImage(sku.id, file))).catch((error) =>
            setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
          )
        }}
        onUpdate={(imageId, patch) => updateSkuImage(imageId, patch)}
        onRemove={(imageId) => removeSkuImage(imageId)}
        onReorder={(orderedIds) => reorderSkuImages(sku.id, orderedIds)}
      />
    </>
  )
}

export function SkuManagerSection() {
  const { skus, skuSectionRef, updateSku, bulkUpdateSkus, saveAllSkus, deleteSku, saving, defaultWeight, setDefaultWeight, setToast } =
    useProductEditor()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulk, setBulk] = useState<Record<BulkField, string>>({ price: '', compare_at: '', stock: '', low_stock: '', weight: '' })

  const validSelected = useMemo(() => {
    const ids = new Set(skus.map((sku) => sku.id))
    return new Set([...selected].filter((id) => ids.has(id)))
  }, [selected, skus])

  const allSelected = skus.length > 0 && validSelected.size === skus.length

  const selectionIds = useMemo(
    () => (validSelected.size > 0 ? skus.filter((sku) => validSelected.has(sku.id)).map((sku) => sku.id) : null),
    [skus, validSelected]
  )

  if (skus.length === 0) return null

  function toggleSelect(skuId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(skuId)) next.delete(skuId)
      else next.add(skuId)
      return next
    })
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(skus.map((sku) => sku.id)))
  }

  function handleDeleteSku(skuId: string) {
    void deleteSku(skuId)
      .then(() => {
        setSelected((prev) => {
          if (!prev.has(skuId)) return prev
          const next = new Set(prev)
          next.delete(skuId)
          return next
        })
      })
      .catch(() => {})
  }

  function applyBulk(field: BulkField) {
    const value = Number(bulk[field])
    if (!Number.isFinite(value)) return
    const fieldConfig = bulkFields.find((item) => item.key === field)
    if (!fieldConfig) return
    const targetIds = selectionIds ?? skus.map((sku) => sku.id)
    const partial = { [fieldConfig.skuKey]: value } as Partial<ShopSku>
    bulkUpdateSkus(partial, targetIds)
    setToast({
      type: 'success',
      message: `Set ${fieldConfig.label} to ${value} for ${targetIds.length} SKU${targetIds.length === 1 ? '' : 's'}.`,
    })
    setBulk((prev) => ({ ...prev, [field]: '' }))
  }

  function handleEnter(event: React.KeyboardEvent<HTMLInputElement>, field: keyof ShopSku) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const layout = (event.currentTarget.closest('[data-sku-layout]') as HTMLElement | null)?.dataset.skuLayout
    if (!layout) return
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement>(`[data-sku-layout="${layout}"] input[data-sku-field="${String(field)}"]`)
    )
    const currentIndex = inputs.indexOf(event.currentTarget)
    const next = inputs[currentIndex + 1]
    next?.focus()
    next?.select()
  }

  const numInput =
    'w-24 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#6d28d9]/40 disabled:opacity-50'
  const narrowInput =
    'w-20 rounded-lg border border-gray-200 px-2 py-2 text-sm outline-none focus:border-[#6d28d9]/40 disabled:opacity-50'

  return (
    <div ref={skuSectionRef}>
      <Section title="SKU Manager" description="Edit generated variants, pricing, inventory, and per-variant media.">
        {/* Bulk toolbar */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D]">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all SKUs"
                className="h-4 w-4 accent-[#6d28d9]"
              />
              {allSelected ? 'Clear all' : `Select all (${skus.length})`}
            </label>
            <span className="text-xs text-[#6F7192]">
              {validSelected.size > 0 ? `${validSelected.size} selected` : 'No selection — bulk actions apply to all'}
            </span>
            {validSelected.size > 0 && (
              <button type="button" onClick={() => setSelected(new Set())} className="text-xs font-semibold text-rose-600 hover:underline">
                Clear
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAllSkus()}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save All SKUs
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {bulkFields.map((field) => (
              <div key={field.key} className="flex items-center gap-1.5">
                <input
                  value={bulk[field.key]}
                  onChange={(event) => setBulk((prev) => ({ ...prev, [field.key]: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') applyBulk(field.key)
                  }}
                  placeholder={field.label}
                  type="number"
                  aria-label={`Set ${field.label} for selected SKUs`}
                  className="w-full rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => applyBulk(field.key)}
                  className="shrink-0 rounded-xl border border-[#6d28d9]/20 px-3 py-2 text-sm font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
            <label className="text-xs font-medium text-[#6F7192]" htmlFor="default-weight">
              Default weight for new SKUs (g)
            </label>
            <input
              id="default-weight"
              value={defaultWeight}
              onChange={(event) => setDefaultWeight(event.target.value)}
              type="number"
              placeholder="e.g. 150"
              className="w-28 rounded-xl border border-[#6d28d9]/10 bg-white px-3 py-2 text-sm outline-none"
            />
            <span className="text-xs text-[#6F7192]">Applied when generating new SKU combinations.</span>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-2xl border border-gray-200 md:block" data-sku-layout="table">
          <table className="w-full min-w-[1100px] bg-white">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} aria-label="Select all SKUs" className="h-4 w-4 accent-[#6d28d9]" />
                </th>
                {['Variant Combo', 'Price', 'Compare At', 'Stock Qty', 'Low Stock', 'Weight', 'Variant Image', 'Media', 'Available'].map(
                  (label) => (
                    <th key={label} className="px-3 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                      {label}
                    </th>
                  )
                )}
                <th className="px-3 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {skus.map((sku) => {
                const isSelected = selected.has(sku.id)
                return (
                  <tr key={sku.id} className={`border-b border-gray-100 last:border-0 ${isSelected ? 'bg-[#6d28d9]/5' : ''}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(sku.id)}
                        aria-label="Select SKU"
                        className="h-4 w-4 accent-[#6d28d9]"
                      />
                    </td>
                    <td className="px-3 py-3 text-sm font-medium text-[#0F1B3D]">{comboLabel(sku.variant_combination)}</td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={sku.price}
                        data-sku-field="price"
                        onKeyDown={(event) => handleEnter(event, 'price')}
                        onChange={(event) => updateSku(sku.id, 'price', Number(event.target.value))}
                        className={numInput}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={sku.compare_at_price ?? ''}
                        data-sku-field="compare_at_price"
                        onKeyDown={(event) => handleEnter(event, 'compare_at_price')}
                        onChange={(event) => updateSku(sku.id, 'compare_at_price', event.target.value ? Number(event.target.value) : null)}
                        className={numInput}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={sku.stock_quantity}
                        data-sku-field="stock_quantity"
                        onKeyDown={(event) => handleEnter(event, 'stock_quantity')}
                        onChange={(event) => updateSku(sku.id, 'stock_quantity', Number(event.target.value))}
                        className={narrowInput}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={sku.low_stock_threshold ?? 5}
                        data-sku-field="low_stock_threshold"
                        onKeyDown={(event) => handleEnter(event, 'low_stock_threshold')}
                        onChange={(event) => updateSku(sku.id, 'low_stock_threshold', Number(event.target.value))}
                        className={narrowInput}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        value={sku.weight_grams ?? ''}
                        data-sku-field="weight_grams"
                        onKeyDown={(event) => handleEnter(event, 'weight_grams')}
                        onChange={(event) => updateSku(sku.id, 'weight_grams', event.target.value ? Number(event.target.value) : null)}
                        className={numInput}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <SkuImageUpload skuId={sku.id} url={sku.variant_image_url} />
                    </td>
                    <td className="px-3 py-3">
                      <SkuGalleryButton sku={sku} />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        aria-pressed={sku.is_available ?? true}
                        onClick={() => updateSku(sku.id, 'is_available', !(sku.is_available ?? true))}
                        className={`relative h-6 w-11 rounded-full transition ${sku.is_available ?? true ? 'bg-[#6d28d9]' : 'bg-gray-200'}`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${sku.is_available ?? true ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteSku(sku.id)}
                        className="rounded-lg p-2 text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600"
                        title="Delete SKU"
                        aria-label={`Delete SKU ${sku.sku_code}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="grid gap-3 md:hidden" data-sku-layout="cards">
          {skus.map((sku) => {
            const isSelected = selected.has(sku.id)
            return (
              <div key={sku.id} className={`rounded-2xl border bg-white p-4 ${isSelected ? 'border-[#6d28d9]/40' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(sku.id)}
                      aria-label="Select SKU"
                      className="mt-0.5 h-4 w-4 accent-[#6d28d9]"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-[#0F1B3D]">{comboLabel(sku.variant_combination)}</div>
                      <div className="mt-0.5 text-xs text-[#6F7192]">{sku.sku_code}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sku.variant_image_url && (
                      <span className="relative h-6 w-6 overflow-hidden rounded">
                        <Image src={sku.variant_image_url} alt="Variant" fill sizes="24px" className="object-cover" />
                      </span>
                    )}
                    <button
                      type="button"
                      aria-pressed={sku.is_available ?? true}
                      onClick={() => updateSku(sku.id, 'is_available', !(sku.is_available ?? true))}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition ${sku.is_available ?? true ? 'bg-[#6d28d9]' : 'bg-gray-200'}`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${sku.is_available ?? true ? 'translate-x-6' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {bulkFields.map((field) => {
                    const value =
                      field.key === 'price'
                        ? sku.price
                        : field.key === 'compare_at'
                          ? sku.compare_at_price ?? ''
                          : field.key === 'stock'
                            ? sku.stock_quantity
                            : field.key === 'low_stock'
                              ? sku.low_stock_threshold ?? 5
                              : sku.weight_grams ?? ''
                    const onChange =
                      field.key === 'price'
                        ? (v: string) => updateSku(sku.id, 'price', Number(v))
                        : field.key === 'compare_at'
                          ? (v: string) => updateSku(sku.id, 'compare_at_price', v ? Number(v) : null)
                          : field.key === 'stock'
                            ? (v: string) => updateSku(sku.id, 'stock_quantity', Number(v))
                            : field.key === 'low_stock'
                              ? (v: string) => updateSku(sku.id, 'low_stock_threshold', Number(v))
                              : (v: string) => updateSku(sku.id, 'weight_grams', v ? Number(v) : null)
                    return (
                      <label key={field.key} className="block">
                        <span className="mb-1 block text-[10px] uppercase tracking-wider text-[#6F7192]">{field.label}</span>
                        <input
                          type="number"
                          value={value as string | number}
                          data-sku-field={field.skuKey as string}
                          onKeyDown={(event) => handleEnter(event, field.skuKey as keyof ShopSku)}
                          onChange={(event) => onChange(event.target.value)}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                        />
                      </label>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <SkuImageUpload skuId={sku.id} url={sku.variant_image_url} />
                  <SkuGalleryButton sku={sku} />
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <span className="rounded-full bg-[#6d28d9]/10 px-2 py-0.5 text-xs font-semibold text-[#6d28d9]">Selected</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteSku(sku.id)}
                      className="rounded-lg p-2 text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600"
                      title="Delete SKU"
                      aria-label={`Delete SKU ${sku.sku_code}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}
