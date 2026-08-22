'use client'

import { useState } from 'react'
import Image from 'next/image'
import { GripVertical, Images, Plus, Trash2 } from 'lucide-react'
import { useProductEditor } from '../editor-context'
import { Section, TagInput, Toggle, inputClass } from '../ui'
import { optionTypes, presetOptionNames } from '../types'
import { ImageGalleryModal } from './ImageGalleryModal'
import type { ShopVariantOptionImage } from '@/lib/shop/admin-types'

function ValueImageControl({ optionName, optionValue }: { optionName: string; optionValue: string }) {
  const {
    variantOptionImages,
    addVariantOptionImage,
    updateVariantOptionImage,
    removeVariantOptionImage,
    reorderVariantOptionImages,
    uploadState,
    setToast,
  } = useProductEditor()
  const [open, setOpen] = useState(false)
  const images = variantOptionImages.filter(
    (image) => image.option_name === optionName && image.option_value === optionValue
  )
  const uploadPrefix = `variant-${optionName}-${optionValue}-`
  const activeUploads = Object.fromEntries(
    Object.entries(uploadState).filter(([key]) => key.startsWith(uploadPrefix))
  )

  const previews = [...images].sort((a, b) => a.display_order - b.display_order).slice(0, 3)

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-[#0F1B3D] transition hover:border-[#6d28d9]/40 hover:text-[#6d28d9]"
        >
          <Images className="h-3.5 w-3.5" />
          Images
          {images.length > 0 && (
            <span className="rounded-full bg-[#6d28d9]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#6d28d9]">{images.length}</span>
          )}
        </button>
        {previews.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setOpen(true)}
            className="relative h-9 w-9 overflow-hidden rounded-lg border border-gray-200 transition hover:border-[#6d28d9]/50"
            title={image.alt_text ?? `${optionValue} image`}
          >
            <Image src={image.image_url} alt={image.alt_text ?? `${optionName}: ${optionValue}`} fill sizes="36px" className="object-cover" />
          </button>
        ))}
      </div>
      <ImageGalleryModal
        open={open}
        title={`${optionName}: ${optionValue} — images`}
        images={images as ShopVariantOptionImage[]}
        uploadState={activeUploads}
        onClose={() => setOpen(false)}
        onAddFiles={(files) => {
          void Promise.all(files.map((file) => addVariantOptionImage(optionName, optionValue, file))).catch((error) =>
            setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
          )
        }}
        onUpdate={(imageId, patch) => updateVariantOptionImage(imageId, patch)}
        onRemove={(imageId) => removeVariantOptionImage(imageId)}
        onReorder={(orderedIds) => reorderVariantOptionImages(optionName, optionValue, orderedIds)}
      />
    </div>
  )
}

export function VariantOptionsSection() {
  const { variants, addVariant, updateVariant, deleteVariant, reorderVariants, dragVariant, setDragVariant, generateSkus } =
    useProductEditor()

  return (
    <Section title="Variant Options" description="Define configurable choices that drive SKU generation.">
      {variants.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <div className="text-sm font-semibold text-[#0F1B3D]">No variant options yet.</div>
          <button
            type="button"
            onClick={() => void addVariant()}
            className="mt-4 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Add First Variant Option
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {variants.map((variant, index) => {
            const isCustomName = !presetOptionNames.includes(variant.option_name)
            return (
              <div
                key={variant.id}
                draggable
                onDragStart={() => setDragVariant(variant.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => void reorderVariants(variant.id)}
                className={`rounded-2xl border p-4 ${dragVariant === variant.id ? 'border-[#6d28d9]/40 bg-[#6d28d9]/5' : 'border-gray-200 bg-gray-50'}`}
              >
                <div className="grid gap-3 lg:grid-cols-[auto_180px_170px_1fr_120px_80px_auto] lg:items-start">
                  <GripVertical className="mt-3 h-4 w-4 text-[#9ca3af]" />
                  <label>
                    <span className="mb-1 block text-xs text-[#6F7192]">Option Name</span>
                    <select
                      value={isCustomName ? 'Custom...' : variant.option_name}
                      onChange={(event) => {
                        const value = event.target.value === 'Custom...' ? '' : event.target.value
                        updateVariant(variant.id, 'option_name', value)
                      }}
                      className={inputClass}
                    >
                      {presetOptionNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    {(isCustomName || !variant.option_name) && (
                      <input
                        value={variant.option_name}
                        onChange={(event) => updateVariant(variant.id, 'option_name', event.target.value)}
                        placeholder="Custom name"
                        className={`${inputClass} mt-2`}
                      />
                    )}
                  </label>
                  <label>
                    <span className="mb-1 block text-xs text-[#6F7192]">Option Type</span>
                    <select
                      value={variant.option_type}
                      onChange={(event) => updateVariant(variant.id, 'option_type', event.target.value as typeof variant.option_type)}
                      className={inputClass}
                    >
                      {optionTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </label>
                  {['toggle', 'text_input'].includes(variant.option_type) ? (
                    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3 text-xs text-[#6F7192]">
                      No discrete values needed.
                    </div>
                  ) : (
                    <TagInput
                      label="Values"
                      value={variant.values ?? []}
                      onChange={(values) => updateVariant(variant.id, 'values', values)}
                      placeholder="Type value and press Enter"
                    />
                  )}
                  {['toggle', 'text_input'].includes(variant.option_type) ? null : (
                    <div className="col-span-full flex flex-wrap gap-2">
                      {(variant.values ?? []).map((value) => (
                        <ValueImageControl key={value} optionName={variant.option_name} optionValue={value} />
                      ))}
                    </div>
                  )}
                  <Toggle
                    checked={variant.is_required ?? true}
                    onChange={(checked) => updateVariant(variant.id, 'is_required', checked)}
                    label="Required"
                  />
                  <label>
                    <span className="mb-1 block text-xs text-[#6F7192]">Order</span>
                    <input
                      type="number"
                      value={variant.display_order ?? index}
                      onChange={(event) => updateVariant(variant.id, 'display_order', Number(event.target.value))}
                      className={inputClass}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void deleteVariant(variant)}
                    aria-label={`Delete variant ${variant.option_name}`}
                    className="mt-6 rounded-xl border border-rose-200 p-2.5 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void addVariant()}
          className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/20 px-4 py-2.5 text-sm font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
        >
          <Plus className="h-4 w-4" />
          Add Variant Option
        </button>
        {variants.length > 0 && (
          <button
            type="button"
            onClick={() => void generateSkus()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#5b21b6]"
          >
            Generate SKUs →
          </button>
        )}
      </div>
    </Section>
  )
}
