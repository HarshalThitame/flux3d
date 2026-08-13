'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Star, Trash2, X } from 'lucide-react'
import type { ShopSkuImage, ShopVariantOptionImage } from '@/lib/shop/admin-types'

type GalleryImage = Pick<ShopVariantOptionImage | ShopSkuImage, 'id' | 'image_url' | 'alt_text' | 'is_primary' | 'display_order'>

export function ImageGalleryModal({
  open,
  title,
  images,
  uploadState,
  onClose,
  onAddFiles,
  onUpdate,
  onRemove,
  onReorder,
}: {
  open: boolean
  title: string
  images: GalleryImage[]
  uploadState: Record<string, { status: string; progress: number }>
  onClose: () => void
  onAddFiles: (files: File[]) => void
  onUpdate: (imageId: string, patch: { alt_text?: string; is_primary?: boolean }) => Promise<void>
  onRemove: (imageId: string) => Promise<void>
  onReorder: (orderedIds: string[]) => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const sorted = [...images].sort((a, b) => a.display_order - b.display_order)
  const selected = sorted.find((image) => image.id === selectedId) ?? null
  const uploading = Object.values(uploadState).some((state) => state.status === 'uploading')

  function handleAdd(files: FileList | null) {
    const fileList = Array.from(files ?? []).filter((file) => file.type.startsWith('image/'))
    if (fileList.length > 0) onAddFiles(fileList)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function move(imageId: string, dir: 1 | -1) {
    const index = sorted.findIndex((image) => image.id === imageId)
    const target = index + dir
    if (index < 0 || target < 0 || target >= sorted.length) return
    setBusy(true)
    try {
      const reordered = [...sorted]
      const [item] = reordered.splice(index, 1)
      reordered.splice(target, 0, item)
      await onReorder(reordered.map((image) => image.id))
    } finally {
      setBusy(false)
    }
  }

  function handleClose() {
    onClose()
    setSelectedId(null)
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-[#0F1B3D]">{title}</h3>
          <button type="button" onClick={handleClose} aria-label="Close gallery" className="rounded-lg p-1.5 text-[#6F7192] hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div data-lenis-prevent className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 md:flex-row">
          <div className="flex-1">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#6d28d9]/20 bg-[#6d28d9]/5 px-4 py-6 text-sm font-semibold text-[#6d28d9] transition hover:border-[#6d28d9]/40 disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              {uploading ? 'Uploading...' : 'Upload images'}
              <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleAdd(event.target.files)} />
            </button>

            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {sorted.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedId(image.id)}
                  className={`relative aspect-square overflow-hidden rounded-xl border-2 bg-gray-50 transition ${
                    selectedId === image.id ? 'border-[#6d28d9]' : 'border-gray-200 hover:border-[#6d28d9]/40'
                  }`}
                >
                  <Image src={image.image_url} alt={image.alt_text ?? ''} fill sizes="160px" className="object-cover" />
                  {image.is_primary && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-[#6d28d9] p-1 text-white" title="Primary image">
                      <Star className="h-3 w-3 fill-current" />
                    </span>
                  )}
                  {image.display_order === 0 && (
                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                      Cover
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full shrink-0 md:w-64">
            {selected ? (
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-50">
                  <Image src={selected.image_url} alt={selected.alt_text ?? 'Selected image'} fill sizes="256px" className="object-cover" />
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs text-[#6F7192]">Alt text</span>
                  <input
                    value={selected.alt_text ?? ''}
                    maxLength={120}
                    onChange={(event) => void onUpdate(selected.id, { alt_text: event.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#6d28d9]/40"
                  />
                </label>
                <button
                  type="button"
                  disabled={selected.is_primary}
                  onClick={() => void onUpdate(selected.id, { is_primary: true })}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#6d28d9]/20 py-2 text-xs font-semibold text-[#6d28d9] disabled:opacity-40"
                >
                  <Star className="h-3.5 w-3.5" />
                  {selected.is_primary ? 'Primary image' : 'Set as primary'}
                </button>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={busy || selected.display_order === 0}
                    onClick={() => void move(selected.id, -1)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-[#0F1B3D] disabled:opacity-40"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={busy || selected.display_order === sorted.length - 1}
                    onClick={() => void move(selected.id, 1)}
                    className="flex items-center justify-center gap-1 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-[#0F1B3D] disabled:opacity-40"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                    Down
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void onRemove(selected.id).then(() => setSelectedId(null))}
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove image
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-center text-xs text-[#6F7192]">
                Select an image to edit alt text, ordering, or primary.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}