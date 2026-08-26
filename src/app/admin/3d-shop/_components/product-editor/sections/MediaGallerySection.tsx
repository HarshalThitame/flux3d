'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AlertCircle, GripVertical, Loader2, RotateCcw, Star, Trash2, Upload, X, ImageIcon } from 'lucide-react'
import { useProductEditor } from '../editor-context'
import { Section } from '../ui'
import { imageList } from '../types'
import { validateImageFile } from '@/lib/shop/upload'

type QueueStatus = 'queued' | 'uploading' | 'done' | 'error'
type QueueItem = {
  id: string
  file: File
  name: string
  status: QueueStatus
  progress: number
  error?: string
}

const UPLOAD_CONCURRENCY = 3

type LibraryAsset = {
  id: string
  public_url: string
  file_name: string | null
  size_bytes: number | null
}

function MediaLibraryModal({
  onClose,
  onPick,
}: {
  onClose: () => void
  onPick: (url: string) => void
}) {
  const [assets, setAssets] = useState<LibraryAsset[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const PAGE_SIZE = 24

  const load = useCallback(async (nextOffset: number, query: string, replace: boolean) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(nextOffset) })
      if (query.trim()) params.set('search', query.trim())
      const response = await fetch(`/api/3d-shop/admin/media?${params.toString()}`)
      const data = (await response.json().catch(() => ({}))) as { assets?: LibraryAsset[]; total?: number }
      if (!response.ok) return
      setAssets((current) => (replace ? data.assets ?? [] : [...current, ...(data.assets ?? [])]))
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Defer the initial fetch to the next tick so the modal paints instantly.
    const timer = window.setTimeout(() => void load(0, search, true), 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSearch(value: string) {
    setSearch(value)
    setOffset(0)
    void load(0, value, true)
  }

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-bold text-[#0F1B3D]">Media library {total > 0 ? `(${total})` : ''}</h3>
          <button type="button" onClick={onClose} aria-label="Close library" className="rounded-lg p-1.5 text-[#6F7192] hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-gray-100 px-5 py-3">
          <input
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search by file name..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#6d28d9]/40"
          />
        </div>
        <div data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto p-5">
          {!loading && assets.length === 0 && (
            <p className="py-10 text-center text-sm text-[#6F7192]">
              No library images yet — uploads are added here automatically.
            </p>
          )}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {assets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => onPick(asset.public_url)}
                title={asset.file_name ?? 'Attach image'}
                className="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 transition hover:border-[#6d28d9]"
              >
                <Image src={asset.public_url} alt={asset.file_name ?? 'Library image'} fill sizes="140px" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 hidden bg-black/60 px-1 py-0.5 text-center text-[9px] font-semibold text-white group-hover:block">
                  Attach
                </span>
              </button>
            ))}
          </div>
          {assets.length < total && (
            <div className="mt-4 text-center">
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  const next = offset + PAGE_SIZE
                  setOffset(next)
                  void load(next, search, false)
                }}
                className="rounded-xl border border-[#6d28d9]/20 px-4 py-2 text-xs font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5 disabled:opacity-60"
              >
                {loading ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function MediaGallerySection() {
  const {
    product,
    uploadImage,
    setThumbnail,
    removeImage,
    handleImageDrop,
    setDragImage,
    setImageAlt,
    uploadLandscapeImage,
    removeLandscapeImage,
    attachLibraryImage,
    setToast,
  } = useProductEditor()

  const [libraryOpen, setLibraryOpen] = useState(false)

  const allImages = imageList(product)
  const [dragOver, setDragOver] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const queueRef = useRef<QueueItem[]>([])
  const runningRef = useRef(0)
  const pumpRef = useRef<() => void>(() => {})

  const syncQueue = useCallback((next: QueueItem[]) => {
    queueRef.current = next
    setQueue(next)
  }, [])

  const patchItem = useCallback(
    (id: string, patch: Partial<QueueItem>) => {
      syncQueue(queueRef.current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
    },
    [syncQueue]
  )

  const pump = useCallback(() => {
    while (runningRef.current < UPLOAD_CONCURRENCY) {
      const next = queueRef.current.find((item) => item.status === 'queued')
      if (!next) break
      runningRef.current += 1
      patchItem(next.id, { status: 'uploading', progress: 0 })
      uploadImage(next.file, 'gallery', undefined, (progress) => patchItem(next.id, { progress }))
        .then(() => patchItem(next.id, { status: 'done', progress: 100 }))
        .catch((error: unknown) =>
          patchItem(next.id, {
            status: 'error',
            error: error instanceof Error ? error.message : 'Upload failed.',
          })
        )
        .finally(() => {
          runningRef.current -= 1
          pumpRef.current()
        })
    }
  }, [patchItem, uploadImage])

  useEffect(() => {
    pumpRef.current = pump
  }, [pump])

  const addFiles = useCallback(
    (files: File[]) => {
      const accepted: QueueItem[] = []
      const rejected: string[] = []
      for (const file of files) {
        const validationError = validateImageFile(file)
        if (validationError) {
          rejected.push(`${file.name}: ${validationError}`)
          continue
        }
        accepted.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.name}`,
          file,
          name: file.name,
          status: 'queued',
          progress: 0,
        })
      }
      if (rejected.length > 0) {
        setToast({ type: 'error', message: rejected.join(' · ') })
      }
      if (accepted.length === 0) return
      // Respect the gallery limit up-front so users get instant feedback
      // instead of a failure after transferring bytes.
      const remaining = Math.max(0, 21 - allImages.length)
      const overflow = accepted.slice(remaining)
      syncQueue([...queueRef.current, ...accepted.slice(0, remaining)])
      if (overflow.length > 0) {
        setToast({ type: 'error', message: `Gallery is limited to 20 images — ${overflow.length} file(s) skipped.` })
      }
      pump()
    },
    [allImages.length, pump, setToast, syncQueue]
  )

  const retryItem = useCallback(
    (id: string) => {
      patchItem(id, { status: 'queued', progress: 0, error: undefined })
      pump()
    },
    [patchItem, pump]
  )

  const dismissItem = useCallback(
    (id: string) => {
      syncQueue(queueRef.current.filter((item) => item.id !== id))
    },
    [syncQueue]
  )

  const handleRemove = useCallback(
    (url: string) => {
      const isCover = product.thumbnail_url === url
      if (isCover && allImages.length > 1) {
        const confirmed = window.confirm(
          'This is the cover photo — removing it promotes the next image to cover. Continue?'
        )
        if (!confirmed) return
      }
      removeImage(url)
    },
    [allImages.length, product.thumbnail_url, removeImage]
  )

  const activeCount = queue.filter((item) => item.status === 'uploading' || item.status === 'queued').length

  return (
    <Section
      title="Images"
      description="One ordered list: the first image is the cover photo shown everywhere (cards, cart, gallery lead). Drag tiles to reorder — position changes save automatically."
    >
      {/* Real drag-and-drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload product images"
        onClick={() => document.getElementById('gallery-file-input')?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') document.getElementById('gallery-file-input')?.click()
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setDragOver(false)
          addFiles(Array.from(event.dataTransfer.files ?? []))
        }}
        className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${
          dragOver ? 'border-[#6d28d9] bg-[#6d28d9]/15' : 'border-[#6d28d9]/25 bg-[#6d28d9]/5 hover:bg-[#6d28d9]/10'
        }`}
      >
        <Upload className="h-8 w-8 text-[#6d28d9]" />
        <span className="mt-3 text-sm font-semibold text-[#0F1B3D]">
          {dragOver ? 'Drop images to upload' : 'Drop images here or click to browse'}
        </span>
        <span className="mt-1 text-xs text-[#6F7192]">
          JPG, PNG, WebP, or GIF · up to 8 MB each · max 20 images · the first image becomes the cover photo
        </span>
        <input
          id="gallery-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setLibraryOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#6d28d9]/20 px-3 py-2 text-xs font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Pick from library
        </button>
      </div>

      {libraryOpen && (
        <MediaLibraryModal
          onClose={() => setLibraryOpen(false)}
          onPick={(url) => {
            attachLibraryImage(url)
            setLibraryOpen(false)
          }}
        />
      )}

      {/* Upload queue with per-file progress, retry, and dismiss */}
      {queue.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-[#6d28d9]/15 bg-[#6d28d9]/5 p-4">
          {activeCount > 0 && (
            <div className="text-sm font-semibold text-[#0F1B3D]">
              Uploading {activeCount} image{activeCount === 1 ? '' : 's'}...
            </div>
          )}
          {queue.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.status === 'uploading' || item.status === 'queued' ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6d28d9]" />
              ) : item.status === 'error' ? (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              ) : (
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">✓</span>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-[#0F1B3D]">{item.name}</div>
                {item.status === 'error' ? (
                  <div className="mt-0.5 truncate text-xs text-rose-600">{item.error}</div>
                ) : (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#6d28d9]/10">
                    <div
                      className="h-full rounded-full bg-[#6d28d9] transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {(item.status === 'uploading' || item.status === 'queued') && (
                <span className="shrink-0 text-xs font-semibold text-[#6d28d9]">{item.progress}%</span>
              )}
              {item.status === 'error' && (
                <>
                  <button
                    type="button"
                    onClick={() => retryItem(item.id)}
                    aria-label={`Retry ${item.name}`}
                    title="Retry upload"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#6d28d9]/20 px-2 py-1 text-xs font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Retry
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissItem(item.id)}
                    aria-label={`Dismiss ${item.name}`}
                    className="shrink-0 rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {item.status === 'done' && (
                <button
                  type="button"
                  onClick={() => dismissItem(item.id)}
                  aria-label={`Dismiss ${item.name}`}
                  className="shrink-0 rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <LandscapeImageUpload
        url={product.landscape_image_url}
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
              isCover={product.thumbnail_url === url}
              onSetCover={() => setThumbnail(url)}
              onRemove={() => handleRemove(url)}
              onDropTarget={() => handleImageDrop(url)}
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
  isCover,
  onSetCover,
  onRemove,
  onDropTarget,
  onAltChange,
  onDragStart,
}: {
  url: string
  altText: string
  isCover: boolean
  onSetCover: () => void
  onRemove: () => void
  onDropTarget: () => void
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
      onDrop={(event) => {
        event.preventDefault()
        event.stopPropagation()
        setDragOver(false)
        onDropTarget()
      }}
      className={`relative overflow-hidden rounded-2xl border bg-gray-50 transition ${
        dragOver ? 'border-[#6d28d9] ring-2 ring-[#6d28d9]/30' : 'border-gray-200'
      }`}
    >
      <div className="relative aspect-square">
        <Image src={url} alt={altText || '3D Shop product image'} fill sizes="300px" className="object-cover" />
        {isCover && (
          <span
            className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950"
            title="The cover photo is shown on cards, cart, and first in the customer gallery"
          >
            <Star className="h-3 w-3 fill-amber-950" />
            Cover
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
            onClick={onSetCover}
            disabled={isCover}
            title={isCover ? 'This image is already the cover photo' : 'Make this the cover photo (shown first everywhere)'}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-[#6F7192] hover:bg-white disabled:opacity-60"
          >
            <Star className={`h-3.5 w-3.5 ${isCover ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            {isCover ? 'Cover' : 'Set as cover'}
          </button>
          <button type="button" onClick={onRemove} aria-label="Remove image" className="rounded-lg border border-rose-200 p-1.5 text-rose-600 hover:bg-rose-50">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function LandscapeImageUpload({
  url,
  onUpload,
  onRemove,
  onError,
}: {
  url: string | null
  onUpload: (file: File, onProgress?: (progress: number) => void) => Promise<string | void>
  onRemove: () => void
  onError: (message: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const startUpload = useCallback(
    (file: File) => {
      const validationError = validateImageFile(file)
      if (validationError) {
        onError(validationError)
        return
      }
      setUploading(true)
      setProgress(0)
      void onUpload(file, setProgress)
        .then(() => setProgress(100))
        .catch((error: unknown) => onError(error instanceof Error ? error.message : 'Landscape image upload failed.'))
        .finally(() => setUploading(false))
    },
    [onError, onUpload]
  )

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
            if (file) startUpload(file)
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
            <span className="truncate text-xs text-[#6F7192]">Ready for social cards &amp; carousel</span>
            <div className="flex shrink-0 items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#6d28d9]/20 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9]/5">
                <Upload className="h-3.5 w-3.5" />
                Replace
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) startUpload(file)
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
            if (file) startUpload(file)
          }}
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-[#6d28d9]" /> : <ImageIcon className="h-6 w-6 text-[#6d28d9]" />}
          <span className="mt-2 text-sm font-semibold text-[#0F1B3D]">
            {uploading ? `Uploading landscape image... ${progress}%` : 'Upload landscape image'}
          </span>
          <span className="mt-1 max-w-sm text-xs text-[#6F7192]">
            Recommended landscape orientation (e.g. 16:9). Used in social share cards, Open Graph previews, and the landing carousel.
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) startUpload(file)
              event.target.value = ''
            }}
          />
        </label>
      )}
    </div>
  )
}
