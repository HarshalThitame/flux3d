'use client'

import { useState } from 'react'
import Image from 'next/image'
import { GripVertical, Loader2, Star, Trash2, Upload, ImageIcon } from 'lucide-react'
import { useProductEditor } from '../editor-context'
import { Section } from '../ui'
import { imageList } from '../types'

export function MediaGallerySection() {
  const {
    product,
    uploadState,
    uploadImage,
    setThumbnail,
    removeImage,
    handleImageDrop,
    setDragImage,
    setImageAlt,
    uploadLandscapeImage,
    removeLandscapeImage,
    setToast,
  } = useProductEditor()

  const allImages = imageList(product)
  const activeUploads = Object.entries(uploadState).filter(([, state]) => state.status === 'uploading')

  return (
    <Section title="Images" description="Upload product images, add alt text, pick a thumbnail, and reorder the gallery.">
      <label className="flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#6d28d9]/25 bg-[#6d28d9]/5 p-6 text-center transition hover:bg-[#6d28d9]/10">
        <Upload className="h-8 w-8 text-[#6d28d9]" />
        <span className="mt-3 text-sm font-semibold text-[#0F1B3D]">Drag-and-drop zone</span>
        <span className="mt-1 text-xs text-[#6F7192]">
          Choose multiple images. Each image uploads to Shop storage with live progress.
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            void Promise.all(files.map((file) => uploadImage(file))).catch((error) =>
              setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
            )
          }}
        />
      </label>

      {/* Upload queue with per-file progress */}
      {activeUploads.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-[#6d28d9]/15 bg-[#6d28d9]/5 p-4">
          <div className="text-sm font-semibold text-[#0F1B3D]">
            Uploading {activeUploads.length} image{activeUploads.length === 1 ? '' : 's'}...
          </div>
          {activeUploads.map(([key, state]) => (
            <div key={key} className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6d28d9]" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-[#6F7192]">{key.split('-').slice(0, -1).join('-')}</div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#6d28d9]/10">
                  <div
                    className="h-full rounded-full bg-[#6d28d9] transition-all duration-200"
                    style={{ width: `${state.progress}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#6d28d9]">{state.progress}%</span>
            </div>
          ))}
        </div>
      )}

      <LandscapeImageUpload
        url={product.landscape_image_url}
        uploading={Object.entries(uploadState).some(([key, state]) => key.startsWith('landscape-') && state.status === 'uploading')}
        onUpload={uploadLandscapeImage}
        onRemove={removeLandscapeImage}
        onError={(message) => setToast({ type: 'error', message })}
      />

      {allImages.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {allImages.map((url) => (
            <ImageTile
              key={url}
              url={url}
              altText={product.image_alt[url] ?? ''}
              isThumbnail={product.thumbnail_url === url}
              onSetThumbnail={() => setThumbnail(url)}
              onRemove={() => removeImage(url)}
              onDrop={() => handleImageDrop(url)}
              onAltChange={(alt) => setImageAlt(url, alt)}
              onDragStart={() => setDragImage(url)}
            />
          ))}
        </div>
      )}
    </Section>
  )
}

function ImageTile({
  url,
  altText,
  isThumbnail,
  onSetThumbnail,
  onRemove,
  onDrop,
  onAltChange,
  onDragStart,
}: {
  url: string
  altText: string
  isThumbnail: boolean
  onSetThumbnail: () => void
  onRemove: () => void
  onDrop: () => void
  onAltChange: (alt: string) => void
  onDragStart: () => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={() => {
        setDragOver(false)
        onDrop()
      }}
      className={`relative overflow-hidden rounded-2xl border bg-gray-50 transition ${
        dragOver ? 'border-[#6d28d9] ring-2 ring-[#6d28d9]/30' : 'border-gray-200'
      }`}
    >
      <div className="relative aspect-square">
        <Image src={url} alt={altText || '3D Shop product image'} fill sizes="300px" className="object-cover" />
        {isThumbnail && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
            Thumbnail
          </span>
        )}
        {dragOver && (
          <span className="absolute inset-x-2 bottom-2 rounded-lg bg-[#6d28d9] px-2 py-1 text-center text-xs font-semibold text-white">
            Drop to reorder
          </span>
        )}
      </div>
      <div className="space-y-2 p-2.5">
        <input
          value={altText}
          onChange={(event) => onAltChange(event.target.value)}
          placeholder="Alt text for SEO & accessibility"
          aria-label="Image alt text"
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-[#0F1B3D] outline-none focus:border-[#6d28d9]/40"
        />
        <div className="flex items-center justify-between gap-2">
          <GripVertical className="h-4 w-4 text-[#9ca3af]" />
          <button
            type="button"
            onClick={onSetThumbnail}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-[#6F7192] hover:bg-white"
          >
            <Star className={`h-3.5 w-3.5 ${isThumbnail ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            Thumbnail
          </button>
          <button type="button" onClick={onRemove} className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function LandscapeImageUpload({
  url,
  uploading,
  onUpload,
  onRemove,
  onError,
}: {
  url: string
  uploading: boolean
  onUpload: (file: File) => Promise<void>
  onRemove: () => void
  onError: (message: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-[#6d28d9]" />
          <div>
            <div className="text-sm font-semibold text-[#0F1B3D]">Landscape Image</div>
            <div className="mt-0.5 text-xs text-[#6F7192]">
              Wide image used for social share previews and the landing page carousel.
            </div>
          </div>
        </div>
      </div>

      {url ? (
        <div
          className={`relative overflow-hidden rounded-2xl border bg-white transition ${
            dragOver ? 'border-[#6d28d9] ring-2 ring-[#6d28d9]/30' : 'border-gray-200'
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragOver(false)
            const file = event.dataTransfer.files?.[0]
            if (file) {
              void onUpload(file).catch((error: unknown) =>
                onError(error instanceof Error ? error.message : 'Landscape image upload failed.')
              )
            }
          }}
        >
          <div className="relative aspect-[16/9] bg-gray-100">
            <Image src={url} alt="Landscape image for social share preview" fill sizes="600px" className="object-cover" />
            {dragOver && (
              <span className="absolute inset-x-2 bottom-2 rounded-lg bg-[#6d28d9] px-2 py-1 text-center text-xs font-semibold text-white">
                Drop to replace
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 p-2.5">
            <span className="truncate text-xs text-[#6F7192]">Ready for social cards & carousel</span>
            <div className="flex shrink-0 items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#6d28d9]/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9]/5">
                <Upload className="h-3.5 w-3.5" />
                Replace
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) {
                      void onUpload(file).catch((error: unknown) =>
                        onError(error instanceof Error ? error.message : 'Landscape image upload failed.')
                      )
                    }
                    event.target.value = ''
                  }}
                />
              </label>
              <button
                type="button"
                onClick={onRemove}
                disabled={uploading}
                className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50"
                aria-label="Remove landscape image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <label
          className={`flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${
            dragOver ? 'border-[#6d28d9] bg-[#6d28d9]/10' : 'border-[#6d28d9]/25 bg-[#6d28d9]/5 hover:bg-[#6d28d9]/10'
          }`}
          onDragOver={(event) => {
            event.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragOver(false)
            const file = event.dataTransfer.files?.[0]
            if (file) {
              void onUpload(file).catch((error: unknown) =>
                onError(error instanceof Error ? error.message : 'Landscape image upload failed.')
              )
            }
          }}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#6d28d9]" />
          ) : (
            <ImageIcon className="h-6 w-6 text-[#6d28d9]" />
          )}
          <span className="mt-2 text-sm font-semibold text-[#0F1B3D]">
            {uploading ? 'Uploading landscape image...' : 'Upload landscape image'}
          </span>
          <span className="mt-1 max-w-sm text-xs text-[#6F7192]">
            Recommended landscape orientation (e.g. 16:9). Used in social share cards, Open Graph previews, and the landing carousel.
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void onUpload(file).catch((error: unknown) =>
                  onError(error instanceof Error ? error.message : 'Landscape image upload failed.')
                )
              }
              event.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}
