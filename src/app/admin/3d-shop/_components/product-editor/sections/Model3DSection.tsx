'use client'

import dynamic from 'next/dynamic'
import { Loader2, Smartphone, Trash2, Upload, Video } from 'lucide-react'
import { useProductEditor } from '../editor-context'
import { Section } from '../ui'

const MODEL_ACCEPT = '.glb,.gltf,.stl,.obj,.3mf'
const USDZ_ACCEPT = '.usdz'
const VIDEO_ACCEPT = '.mp4,.webm'

const ProductModelViewer = dynamic(() => import('@/components/shop/ProductModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-[#6d28d9]" />
    </div>
  ),
})

type AssetField = 'usdz_url' | 'hero_video_url'

function AssetUploadRow({
  field,
  icon,
  title,
  hint,
  accept,
  kind,
}: {
  field: AssetField
  icon: React.ReactNode
  title: string
  hint: string
  accept: string
  kind: 'usdz' | 'video'
}) {
  const { product, uploadState, uploadProductAsset, removeProductAsset, setToast } = useProductEditor()
  const url = product[field]
  const uploads = Object.entries(uploadState).filter(([key]) => key.startsWith(`${field}-`))
  const uploading = uploads.find(([, state]) => state.status === 'uploading')
  const progress = uploading ? uploading[1].progress : 0

  const handleFile = (file: File) => {
    void uploadProductAsset(file, kind, field).catch((error) =>
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
    )
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#6d28d9] shadow-sm">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#0F1B3D]">{title}</div>
              <p className="mt-0.5 text-xs text-[#6F7192]">{hint}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#6d28d9]/20 px-3 py-2 text-xs font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5">
                <Upload className="h-3.5 w-3.5" />
                {url ? 'Replace' : 'Upload'}
                <input type="file" accept={accept} className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handleFile(file)
                  event.target.value = ''
                }} />
              </label>
              {url && (
                <button type="button" onClick={() => removeProductAsset(field)} aria-label={`Remove ${title}`} className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-xs text-[#6d28d9] underline underline-offset-2"
            >
              {url}
            </a>
          )}
          {uploading && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#6d28d9]/10">
              <div className="h-full rounded-full bg-[#6d28d9] transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Model3DSection() {
  const { product, uploadState, uploadModel, removeModel, setToast } = useProductEditor()
  const modelUploads = Object.entries(uploadState).filter(([key]) => key.startsWith('model-'))
  const uploading = modelUploads.find(([, state]) => state.status === 'uploading')
  const progress = uploading ? uploading[1].progress : 0

  return (
    <Section
      title="3D Model & Cinematic Media"
      description="Upload an interactive 3D preview and inspect it inline. Add a USDZ file to enable “View in your space” AR on iOS, and an MP4/WebM loop for the cinematic gallery lead."
    >
      {product.model_url ? (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <ProductModelViewer modelUrl={product.model_url} productName={product.name} className="h-72 w-full" />
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#0F1B3D]">Model attached</div>
                <a
                  href={product.model_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block truncate text-xs text-[#6d28d9] underline underline-offset-2"
                >
                  {product.model_url}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#6d28d9]/20 px-3 py-2 text-xs font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5">
                  <Upload className="h-3.5 w-3.5" />
                  Replace
                  <input
                    type="file"
                    accept={MODEL_ACCEPT}
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file)
                        void uploadModel(file).catch((error) =>
                          setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
                        )
                    }}
                  />
                </label>
                <button type="button" onClick={removeModel} aria-label="Remove 3D model" className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#6d28d9]/25 bg-[#6d28d9]/5 p-6 text-center transition hover:bg-[#6d28d9]/10">
          <Upload className="h-8 w-8 text-[#6d28d9]" />
          <span className="mt-3 text-sm font-semibold text-[#0F1B3D]">Upload 3D model</span>
          <span className="mt-1 text-xs text-[#6F7192]">GLB, GLTF, STL, OBJ, or 3MF · up to 50 MB</span>
          <input
            type="file"
            accept={MODEL_ACCEPT}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file)
                void uploadModel(file).catch((error) =>
                  setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
                )
            }}
          />
        </label>
      )}

      {uploading && (
        <div className="space-y-2 rounded-2xl border border-[#6d28d9]/15 bg-[#6d28d9]/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0F1B3D]">
            <Loader2 className="h-4 w-4 animate-spin text-[#6d28d9]" />
            Uploading 3D model...
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#6d28d9]/10">
            <div className="h-full rounded-full bg-[#6d28d9] transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <AssetUploadRow
          field="usdz_url"
          icon={<Smartphone className="h-5 w-5" />}
          title="AR — iOS Quick Look (USDZ)"
          hint="Enables the “View in your space” AR button on iPhone/iPad. Export USDZ from Reality Composer or Blender."
          accept={USDZ_ACCEPT}
          kind="usdz"
        />
        <AssetUploadRow
          field="hero_video_url"
          icon={<Video className="h-5 w-5" />}
          title="Cinematic hero video"
          hint="MP4 or WebM loop shown as the lead media item on the product page. Keep it under 15 seconds for best results."
          accept={VIDEO_ACCEPT}
          kind="video"
        />
      </div>
    </Section>
  )
}
