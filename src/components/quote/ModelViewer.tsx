'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AdaptiveDpr, Bounds, OrbitControls } from '@react-three/drei'
import { Canvas, type RootState } from '@react-three/fiber'
import type { Object3D } from 'three'
import type { ParsedModel } from '@/lib/quote/types'

type ModelViewerProps = {
  model: ParsedModel | null
  isLoading: boolean
}

function ViewerModel({
  object,
}: {
  object: Object3D
}) {
  const clone = useMemo(() => object.clone(true), [object])

  return <primitive object={clone} />
}

function ViewerFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-[#6F7192]">
      Loading interactive preview...
    </div>
  )
}

function ViewerCanvas({ object }: { object: Object3D }) {
  const [contextLost, setContextLost] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleCreated = useCallback((state: RootState) => {
    const renderer = state.gl
    renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault()
      setContextLost(true)
    })
    renderer.domElement.addEventListener('webglcontextrestored', () => {
      setContextLost(false)
    })
  }, [])

  useEffect(() => {
    if (contextLost) {
      const timer = setInterval(() => {
        if (canvasRef.current) {
          const gl = canvasRef.current.getContext('webgl2') || canvasRef.current.getContext('webgl')
          if (gl) {
            setContextLost(false)
            clearInterval(timer)
          }
        }
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [contextLost])

  if (contextLost) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-sm text-[#6F7192]">3D preview unavailable. Reload the page to restore.</p>
      </div>
    )
  }

  return (
    <Canvas
      ref={canvasRef}
      camera={{ position: [140, 120, 140], fov: 34 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      onCreated={handleCreated}
      gl={{ powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false }}
    >
      <AdaptiveDpr pixelated />
      <color attach="background" args={['#FFFFFF']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[120, 120, 80]} intensity={1.1} />
      <directionalLight position={[-80, -50, -60]} intensity={0.35} />
      <gridHelper args={[260, 26, '#1f2a44', '#101929']} position={[0, -55, 0]} />
      <Bounds fit clip observe margin={1.3}>
        <ViewerModel object={object} />
      </Bounds>
      <OrbitControls makeDefault enablePan enableZoom enableRotate />
    </Canvas>
  )
}

export default function ModelViewer({ model, isLoading }: ModelViewerProps) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,#FFFFFF,#FFFFFF)]">
      <div className="flex items-center justify-between border-b border-[#6d28d9]/10 px-5 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Interactive Viewer</div>
          <div className="mt-1 text-sm font-medium text-[#0F1B3D]">
            {model ? model.fileName : 'Upload a model to begin'}
          </div>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
          Rotate · Zoom · Pan
        </div>
      </div>

      <div className="relative aspect-[16/11] min-h-[360px]">
        {model ? (
          <Suspense fallback={<ViewerFallback />}>
            <ViewerCanvas object={model.object} />
          </Suspense>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl border border-[#6d28d9]/10 bg-white/5" />
            <div className="font-[var(--font-syne)] text-xl font-bold text-[#0F1B3D]">Preview unavailable</div>
            <p className="max-w-[420px] text-sm leading-7 text-[#6F7192]">
              Upload a supported 3D model to inspect geometry, auto-fit the camera, and calculate instant pricing.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,8,16,0.56)] backdrop-blur-sm">
            <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D]">
              Parsing model geometry...
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-[#6d28d9]/10 px-5 py-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Bounding Box</div>
          <div className="mt-2 text-sm text-[#0F1B3D]">
            {model
              ? `${model.dimensionsMm.x.toFixed(1)} × ${model.dimensionsMm.y.toFixed(1)} × ${model.dimensionsMm.z.toFixed(1)} mm`
              : 'Waiting for file'}
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Triangles</div>
          <div className="mt-2 text-sm text-[#0F1B3D]">
            {model ? model.triangleCount.toLocaleString() : '0'}
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Volume</div>
          <div className="mt-2 text-sm text-[#0F1B3D]">
            {model ? `${(model.volumeMm3 / 1000).toFixed(2)} cm³` : '0 cm³'}
          </div>
        </div>
      </div>
    </div>
  )
}
