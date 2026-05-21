'use client'

import { motion } from 'framer-motion'
import { Suspense, useMemo } from 'react'
import { Bounds, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Cuboid, Move3D } from 'lucide-react'
import type { Object3D } from 'three'
import type { ParsedModel } from '@/lib/quote/types'

type ViewerSectionProps = {
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
    <div className="absolute inset-0 animate-pulse rounded-[22px] bg-white/[0.03]" />
  )
}

export default function ViewerSection({
  model,
  isLoading,
}: ViewerSectionProps) {
  return (
    <motion.section
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.94))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)] transition-all duration-300 hover:border-cyan-400/20 hover:shadow-[0_24px_90px_rgba(56,189,248,0.08)]"
    >
      <motion.div
        aria-hidden
        animate={{ x: [0, -20, 0], y: [0, 8, 0], opacity: [0.24, 0.38, 0.24] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl"
      />
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
            3D File Viewer
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#6F7192]">
            Explore your part in a clean interactive viewer, inspect the geometry from every angle, and move forward with more confidence before printing.
          </p>
        </div>
        <motion.div
          animate={{ rotate: [0, 4, 0, -4, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-2xl border border-cyan-400/20 bg-cyan-50 p-3 text-cyan-700"
        >
          <Cuboid className="h-5 w-5" />
        </motion.div>
      </div>

      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 240, damping: 22 }}
        className="relative min-h-[320px] flex-1 overflow-hidden rounded-[24px] border border-[#6d28d9]/10 bg-[radial-gradient(circle_at_top,rgba(168, 85, 247,0.12),transparent_42%),linear-gradient(180deg,#FFFFFF,#FFFFFF)]"
      >
        {model ? (
          <Suspense fallback={<ViewerFallback />}>
            <Canvas camera={{ position: [140, 120, 140], fov: 34 }} dpr={[1, 1.7]}>
              <color attach="background" args={['#FFFFFF']} />
              <ambientLight intensity={0.95} />
              <directionalLight position={[120, 120, 80]} intensity={1.15} />
              <directionalLight position={[-80, -50, -60]} intensity={0.4} />
              <gridHelper args={[280, 28, '#1f2a44', '#0f172a']} position={[0, -55, 0]} />
              <Bounds fit clip observe margin={1.3}>
                <ViewerModel object={model.object} />
              </Bounds>
              <OrbitControls makeDefault enablePan enableZoom enableRotate />
            </Canvas>
          </Suspense>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-18 w-18 items-center justify-center rounded-[22px] border border-[#6d28d9]/10 bg-white text-cyan-700"
            >
              <Move3D className="h-7 w-7" />
            </motion.div>
            <div className="font-[var(--font-syne)] text-2xl font-semibold text-[#0F1B3D]">
              Awaiting model preview
            </div>
            <p className="max-w-md text-sm leading-7 text-[#6F7192]">
              Your model will appear here with smooth rotate, zoom, and pan controls as soon as a supported file is loaded.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,8,16,0.62)] backdrop-blur-sm">
            <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D]">
              Building your live 3D preview...
            </div>
          </div>
        ) : null}
      </motion.div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Controls</div>
          <div className="mt-2 text-sm text-[#0F1B3D]">Rotate · Zoom · Pan</div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Bounding Box</div>
          <div className="mt-2 text-sm text-[#0F1B3D]">
            {model
              ? `${model.dimensionsMm.x.toFixed(1)} × ${model.dimensionsMm.y.toFixed(1)} × ${model.dimensionsMm.z.toFixed(1)} mm`
              : 'Waiting for geometry'}
          </div>
        </motion.div>
        <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-3">
          <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Mesh Density</div>
          <div className="mt-2 text-sm text-[#0F1B3D]">
            {model ? `${model.triangleCount.toLocaleString()} tris` : '0 tris'}
          </div>
        </motion.div>
      </div>
    </motion.section>
  )
}
