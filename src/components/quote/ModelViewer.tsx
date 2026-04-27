'use client'

import { Suspense, useMemo } from 'react'
import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import type { Object3D } from 'three'
import type { ParsedModel } from '@/lib/quote/types'

type ModelViewerProps = {
  model: ParsedModel | null
  scalePercent: number
  isLoading: boolean
}

function ViewerModel({
  object,
  scalePercent,
}: {
  object: Object3D
  scalePercent: number
}) {
  const clone = useMemo(() => object.clone(true), [object])
  const scale = scalePercent / 100

  return <primitive object={clone} scale={[scale, scale, scale]} />
}

function ViewerFallback() {
  return (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-[#7a82a0]">
      Loading interactive preview...
    </div>
  )
}

export default function ModelViewer({ model, scalePercent, isLoading }: ModelViewerProps) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#0a0f1d,#070b15)]">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Interactive Viewer</div>
          <div className="mt-1 text-sm font-medium text-white">
            {model ? model.fileName : 'Upload a model to begin'}
          </div>
        </div>
        <div className="rounded-full border border-emerald-400/15 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
          Rotate · Zoom · Pan
        </div>
      </div>

      <div className="relative aspect-[16/11] min-h-[360px]">
        {model ? (
          <Suspense fallback={<ViewerFallback />}>
            <Canvas
              camera={{ position: [140, 120, 140], fov: 34 }}
              dpr={[1, 1.7]}
            >
              <color attach="background" args={['#070b15']} />
              <ambientLight intensity={0.9} />
              <directionalLight position={[120, 120, 80]} intensity={1.1} />
              <directionalLight position={[-80, -50, -60]} intensity={0.35} />
              <gridHelper args={[260, 26, '#1f2a44', '#101929']} position={[0, -55, 0]} />
              <Bounds fit clip observe margin={1.3}>
                <ViewerModel object={model.object} scalePercent={scalePercent} />
              </Bounds>
              <OrbitControls makeDefault enablePan enableZoom enableRotate />
            </Canvas>
          </Suspense>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="h-16 w-16 rounded-2xl border border-white/10 bg-white/5" />
            <div className="font-[var(--font-syne)] text-xl font-bold text-white">Preview unavailable</div>
            <p className="max-w-[420px] text-sm leading-7 text-[#7a82a0]">
              Upload a supported 3D model to inspect geometry, auto-fit the camera, and calculate instant pricing.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,8,16,0.56)] backdrop-blur-sm">
            <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-3 text-sm text-white">
              Parsing model geometry...
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-white/8 px-5 py-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Bounding Box</div>
          <div className="mt-2 text-sm text-white">
            {model
              ? `${model.dimensionsMm.x.toFixed(1)} × ${model.dimensionsMm.y.toFixed(1)} × ${model.dimensionsMm.z.toFixed(1)} mm`
              : 'Waiting for file'}
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Triangles</div>
          <div className="mt-2 text-sm text-white">
            {model ? model.triangleCount.toLocaleString() : '0'}
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Volume</div>
          <div className="mt-2 text-sm text-white">
            {model ? `${(model.volumeMm3 / 1000).toFixed(2)} cm³` : '0 cm³'}
          </div>
        </div>
      </div>
    </div>
  )
}

