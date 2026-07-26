'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useReducedMotion } from 'framer-motion'
import { Box3, Vector3 } from 'three'
import { loadShopModel, type LoadedShopModel } from '@/lib/shop/model-loader'
import { Box, Maximize2, Minimize2, Move3D, RotateCcw } from 'lucide-react'

// Lazy load the heavy 3D canvas so it only ships when a model is present
const ProductModelCanvas = dynamic(() => import('./ProductModelCanvas'), {
  ssr: false,
  loading: () => <ModelSkeleton />,
})

function ModelSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-[inherit] bg-[var(--shop-bg-muted)]">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[var(--shop-border-medium)]" />
        <p className="text-xs font-medium text-[var(--shop-text-muted)]">Loading 3D preview…</p>
      </div>
    </div>
  )
}

function ModelError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-[inherit] bg-[var(--shop-bg-muted)] p-6 text-center">
      <Move3D className="h-8 w-8 text-[var(--shop-text-subtle)]" />
      <p className="max-w-[240px] text-sm text-[var(--shop-text-secondary)]">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--shop-border-light)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      )}
    </div>
  )
}

type ProductModelViewerProps = {
  modelUrl: string
  productName?: string
  className?: string
}

export default function ProductModelViewer({ modelUrl, productName, className = '' }: ProductModelViewerProps) {
  const [model, setModel] = useState<LoadedShopModel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoRotate, setAutoRotate] = useState(true)
  const reduceMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setModel(null)

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

  const largestDimension = useMemo(() => {
    if (!model) return 0
    return Math.max(model.dimensions.x, model.dimensions.y, model.dimensions.z)
  }, [model])

  const viewer = (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden bg-[var(--shop-bg-soft)] ${className}`}
    >
      {loading && <ModelSkeleton />}
      {error && !loading && <ModelError message={error} onRetry={() => setError(null)} />}
      {!loading && !error && model && (
        <>
          <ProductModelCanvas
            object={model.object}
            autoRotate={autoRotate && !reduceMotion}
            productName={productName}
          />
          <div className="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between">
            <span className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--shop-border-gold)] bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--shop-gold)] backdrop-blur-sm">
              <Box className="h-3 w-3" />
              3D Preview
            </span>
          </div>
          <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setAutoRotate((current) => !current)}
              className="pointer-events-auto rounded-lg border border-[var(--shop-border-light)] bg-white/90 px-3 py-1.5 text-xs font-semibold text-[var(--shop-text-secondary)] backdrop-blur-sm transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
            >
              {autoRotate ? 'Pause rotation' : 'Auto-rotate'}
            </button>
            <button
              type="button"
              onClick={() => setIsFullscreen((current) => !current)}
              className="pointer-events-auto rounded-lg border border-[var(--shop-border-light)] bg-white/90 p-2 text-[var(--shop-text-secondary)] backdrop-blur-sm transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen 3D view'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>
          {largestDimension > 0 && (
            <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-[var(--shop-border-light)] bg-white/80 px-2 py-1 text-[10px] font-medium text-[var(--shop-text-muted)] backdrop-blur-sm">
              {`${model.dimensions.x.toFixed(1)} × ${model.dimensions.y.toFixed(1)} × ${model.dimensions.z.toFixed(1)} mm`}
            </div>
          )}
        </>
      )}
    </div>
  )

  if (!isFullscreen) return viewer

  return (
    <div
      className="fixed inset-0 z-[150] flex flex-col bg-[var(--shop-bg-base)] p-4 sm:p-6"
      onClick={(event) => {
        if (event.target === event.currentTarget) setIsFullscreen(false)
      }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-[var(--shop-font-heading)] text-xl font-semibold text-[var(--shop-text-primary)]">
          {productName || '3D Preview'}
        </h3>
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          className="rounded-lg border border-[var(--shop-border-light)] bg-white p-2 text-[var(--shop-text-secondary)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
        >
          <Minimize2 className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)]">
        {!loading && !error && model && (
          <ProductModelCanvas
            object={model.object}
            autoRotate={autoRotate && !reduceMotion}
            productName={productName}
          />
        )}
        {loading && <ModelSkeleton />}
        {error && <ModelError message={error} onRetry={() => setError(null)} />}
      </div>
    </div>
  )
}
