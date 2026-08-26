'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Box3, Vector3 } from 'three'
import { MapPinPlus, Trash2 } from 'lucide-react'
import { loadShopModel, type LoadedShopModel } from '@/lib/shop/model-loader'
import type { ShopProductHotspot } from '@/lib/shop/admin-types'
import { useProductEditor } from '../editor-context'
import { Section } from '../ui'

const MAX_HOTSPOTS = 12

const EditorCanvas = dynamic(() => import('./HotspotEditorCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-2xl bg-gray-50">
      <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
    </div>
  ),
})

export function HotspotSection() {
  const { product, updateProduct } = useProductEditor()
  const [model, setModel] = useState<LoadedShopModel | null>(null)
  const [loading, setLoading] = useState(Boolean(product.model_url))
  const [error, setError] = useState<string | null>(null)
  const [addingMode, setAddingMode] = useState(false)

  const modelUrl = product.model_url
  const hotspots = product.hotspots ?? []

  const [prevModelUrl, setPrevModelUrl] = useState(modelUrl)
  if (prevModelUrl !== modelUrl) {
    setPrevModelUrl(modelUrl)
    setModel(null)
    setError(null)
    setLoading(Boolean(modelUrl))
  }

  useEffect(() => {
    if (!modelUrl) return
    let active = true
    loadShopModel(modelUrl)
      .then((loaded) => {
        if (!active) return
        setModel(loaded)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Could not load 3D model.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [modelUrl])

  const pinSize = useMemo(() => {
    if (!model) return 0.05
    const box = new Box3().setFromObject(model.object)
    const size = box.getSize(new Vector3())
    return (Math.max(size.x, size.y, size.z) || 1) * 0.025
  }, [model])

  const handleSurfaceClick = useCallback(
    (localPoint: Vector3) => {
      if (!addingMode || hotspots.length >= MAX_HOTSPOTS) return
      const hotspot: ShopProductHotspot = {
        id: `hs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        position: [
          Number(localPoint.x.toFixed(4)),
          Number(localPoint.y.toFixed(4)),
          Number(localPoint.z.toFixed(4)),
        ],
        label: `Highlight ${hotspots.length + 1}`,
        description: '',
      }
      updateProduct('hotspots', [...hotspots, hotspot])
    },
    [addingMode, hotspots, updateProduct]
  )

  const updateHotspot = useCallback(
    (id: string, patch: Partial<ShopProductHotspot>) => {
      updateProduct(
        'hotspots',
        hotspots.map((hotspot) => (hotspot.id === id ? { ...hotspot, ...patch } : hotspot))
      )
    },
    [hotspots, updateProduct]
  )

  const removeHotspot = useCallback(
    (id: string) => {
      updateProduct('hotspots', hotspots.filter((hotspot) => hotspot.id !== id))
    },
    [hotspots, updateProduct]
  )

  if (!modelUrl) {
    return (
      <Section title="3D Hotspots" description="Add storytelling pins to your 3D model. Upload a 3D model first.">
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-[#6F7192]">
          Upload a model in the section above to start placing hotspots.
        </div>
      </Section>
    )
  }

  return (
    <Section
      title="3D Hotspots"
      description={`Place clickable pins on the model to tell its story on the product page. ${hotspots.length}/${MAX_HOTSPOTS} used.`}
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="relative">
          <div className="overflow-hidden rounded-2xl border border-gray-200">
            {!loading && !error && model && (
              <EditorCanvas
                object={model.object}
                hotspots={hotspots}
                pinSize={pinSize}
                onSurfaceClick={handleSurfaceClick}
              />
            )}
            {(loading || error) && (
              <div className="flex h-80 items-center justify-center rounded-2xl bg-gray-50">
                {loading ? (
                  <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
                ) : (
                  <p className="max-w-[240px] px-6 text-center text-sm text-[#6F7192]">{error}</p>
                )}
              </div>
            )}
          </div>
          <button
            type="button"
            aria-pressed={addingMode}
            onClick={() => setAddingMode((current) => !current)}
            className={`mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              addingMode
                ? 'bg-[#6d28d9] text-white'
                : 'border border-[#6d28d9]/20 text-[#6d28d9] hover:bg-[#6d28d9]/5'
            }`}
          >
            <MapPinPlus className="h-4 w-4" />
            {addingMode ? 'Click the model to place a pin' : 'Add hotspot'}
          </button>
        </div>

        <div className="space-y-3">
          {hotspots.length === 0 && (
            <p className="rounded-2xl bg-gray-50 p-4 text-sm text-[#6F7192]">
              No hotspots yet. Enable “Add hotspot” and click anywhere on the model surface.
            </p>
          )}
          {hotspots.map((hotspot, index) => (
            <div key={hotspot.id} className="rounded-2xl border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#6d28d9]">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-[#6d28d9] text-[10px] font-bold text-white">
                    {index + 1}
                  </span>
                  Pin {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeHotspot(hotspot.id)}
                  aria-label={`Remove pin ${index + 1}`}
                  className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <input
                value={hotspot.label}
                onChange={(event) => updateHotspot(hotspot.id, { label: event.target.value })}
                placeholder="Label (e.g. Hand-finished edge)"
                maxLength={80}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#6d28d9]/40"
              />
              <textarea
                value={hotspot.description ?? ''}
                onChange={(event) => updateHotspot(hotspot.id, { description: event.target.value })}
                placeholder="Short description shown when tapped (optional)"
                maxLength={300}
                rows={2}
                className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#6d28d9]/40"
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}
