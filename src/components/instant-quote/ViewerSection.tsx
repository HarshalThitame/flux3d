'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Compass,
  Cuboid,
  Eye,
  Grid3X3,
  Layers,
  Maximize2,
  Minimize2,
  Move3D,
  Scissors,
  Sparkles,
  X,
} from 'lucide-react'
import type { ParsedModel } from '@/lib/quote/types'
import ModelPreviewCanvas from '@/components/instant-quote/ModelPreviewCanvas'

type ViewerSectionProps = {
  model: ParsedModel | null
  isLoading: boolean
  materialId?: string
  colorName?: string
}

export default function ViewerSection({
  model,
  isLoading,
  materialId = 'pla',
  colorName = 'Default',
}: ViewerSectionProps) {
  const [displayMode, setDisplayMode] = useState<'solid' | 'wireframe' | 'xray'>('solid')
  const [showBuildVolume, setShowBuildVolume] = useState(false)
  const [clippingZPercent, setClippingZPercent] = useState(100)
  const [showClippingSlider, setShowClippingSlider] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'top' | 'front' | 'side' | null>(null)

  return (
    <>
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

        {/* Header */}
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                3D File Viewer
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/20 bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-700">
                <Sparkles className="h-3 w-3" /> PBR Engine 5.0
              </span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#6F7192]">
              Real-time studio rendering with physical materials, wireframe mode, 3D build envelope, and cross-section inspection.
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

        {/* 3D Inspection Toolbar */}
        {model && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#6d28d9]/10 bg-white/80 p-2 backdrop-blur-md">
            {/* Shading Mode */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDisplayMode('solid')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  displayMode === 'solid'
                    ? 'bg-[#6d28d9] text-white shadow-sm'
                    : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
                }`}
              >
                <Eye className="h-3.5 w-3.5" /> Solid
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('wireframe')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  displayMode === 'wireframe'
                    ? 'bg-[#6d28d9] text-white shadow-sm'
                    : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" /> Wireframe
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('xray')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                  displayMode === 'xray'
                    ? 'bg-[#6d28d9] text-white shadow-sm'
                    : 'text-[#6F7192] hover:bg-gray-100 hover:text-[#0F1B3D]'
                }`}
              >
                <Layers className="h-3.5 w-3.5" /> X-Ray
              </button>
            </div>

            {/* Quick Actions & Toggles */}
            <div className="flex items-center gap-1.5">
              {/* Build Box Cage */}
              <button
                type="button"
                onClick={() => setShowBuildVolume(!showBuildVolume)}
                title="Toggle 220x220x250mm 3D Printer Build Volume Box"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  showBuildVolume
                    ? 'border-cyan-400/40 bg-cyan-50 text-cyan-700'
                    : 'border-[#6d28d9]/10 bg-white text-[#6F7192] hover:bg-gray-50'
                }`}
              >
                <Box className="h-3.5 w-3.5" /> Build Box
              </button>

              {/* Cross Section Slice */}
              <button
                type="button"
                onClick={() => setShowClippingSlider(!showClippingSlider)}
                title="Toggle Cross-Section Slice"
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all ${
                  showClippingSlider || clippingZPercent < 100
                    ? 'border-purple-400/40 bg-purple-50 text-purple-700'
                    : 'border-[#6d28d9]/10 bg-white text-[#6F7192] hover:bg-gray-50'
                }`}
              >
                <Scissors className="h-3.5 w-3.5" /> Slice
              </button>

              {/* Camera Presets */}
              <div className="hidden items-center gap-1 sm:flex">
                <button
                  type="button"
                  onClick={() => setCameraPreset('iso')}
                  className="rounded-lg border border-[#6d28d9]/10 bg-white px-2 py-1 text-[11px] text-[#6F7192] hover:bg-gray-50"
                  title="Isometric View"
                >
                  ISO
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('top')}
                  className="rounded-lg border border-[#6d28d9]/10 bg-white px-2 py-1 text-[11px] text-[#6F7192] hover:bg-gray-50"
                  title="Top View"
                >
                  TOP
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('front')}
                  className="rounded-lg border border-[#6d28d9]/10 bg-white px-2 py-1 text-[11px] text-[#6F7192] hover:bg-gray-50"
                  title="FRONT View"
                >
                  FRONT
                </button>
                <button
                  type="button"
                  onClick={() => setCameraPreset('side')}
                  className="rounded-lg border border-[#6d28d9]/10 bg-white px-2 py-1 text-[11px] text-[#6F7192] hover:bg-gray-50"
                  title="SIDE View"
                >
                  SIDE
                </button>
              </div>

              {/* Fullscreen Modal Toggle */}
              <button
                type="button"
                onClick={() => setIsFullScreen(true)}
                title="Full Screen Inspection"
                className="rounded-xl border border-[#6d28d9]/10 bg-white p-1.5 text-[#6F7192] hover:bg-gray-50 hover:text-[#0F1B3D]"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Slice Slider Bar */}
        {showClippingSlider && model && (
          <div className="mb-3 flex items-center gap-3 rounded-xl border border-purple-400/20 bg-purple-50/80 px-4 py-2 text-xs text-purple-900">
            <span className="shrink-0 font-medium">Cross-Section Cut:</span>
            <input
              type="range"
              min={5}
              max={100}
              value={clippingZPercent}
              onChange={(e) => setClippingZPercent(Number(e.target.value))}
              className="w-full accent-[#6d28d9]"
            />
            <span className="shrink-0 font-mono text-[11px]">{clippingZPercent}%</span>
            {clippingZPercent < 100 && (
              <button
                type="button"
                onClick={() => setClippingZPercent(100)}
                className="text-[10px] text-purple-700 underline underline-offset-2"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {/* 3D Canvas Stage */}
        <motion.div
          whileHover={{ scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 240, damping: 22 }}
          className="relative min-h-[320px] flex-1 overflow-hidden rounded-[24px] border border-[#6d28d9]/10 bg-[#070a12]"
        >
          {model ? (
            <>
              <ModelPreviewCanvas
                object={model.object}
                materialId={materialId}
                colorName={colorName}
                displayMode={displayMode}
                showBuildVolume={showBuildVolume}
                clippingZPercent={clippingZPercent}
                cameraPreset={cameraPreset}
                onPresetApplied={() => setCameraPreset(null)}
              />

              {/* Material Live Badge Overlay */}
              <div className="pointer-events-none absolute left-4 top-4 rounded-xl border border-white/10 bg-[#070a12]/80 px-3 py-1.5 text-xs text-white/90 backdrop-blur-md">
                <span className="text-white/40">Shading:</span>{' '}
                <span className="font-semibold text-cyan-400">{materialId.toUpperCase()}</span> ·{' '}
                <span className="text-purple-300">{colorName}</span>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
                className="flex h-18 w-18 items-center justify-center rounded-[22px] border border-white/10 bg-white/5 text-cyan-400"
              >
                <Move3D className="h-7 w-7" />
              </motion.div>
              <div className="font-[var(--font-syne)] text-2xl font-semibold text-white">
                Awaiting 3D Model
              </div>
              <p className="max-w-md text-sm leading-7 text-white/50">
                Upload an STL, OBJ, or 3MF file above to render a studio-quality PBR 3D preview with dynamic materials, environment lighting, and inspection tools.
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,8,16,0.62)] backdrop-blur-sm">
              <div className="rounded-2xl border border-white/10 bg-[#070a12] px-4 py-3 text-sm text-white">
                Building 3D preview engine...
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* Stats Grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-[#6d28d9]/10 bg-white px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Controls</div>
            <div className="mt-2 text-sm text-[#0F1B3D]">Rotate · Zoom · Pan</div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-[#6d28d9]/10 bg-white px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Bounding Box</div>
            <div className="mt-2 text-sm text-[#0F1B3D]">
              {model
                ? `${model.dimensionsMm.x.toFixed(1)} × ${model.dimensionsMm.y.toFixed(1)} × ${model.dimensionsMm.z.toFixed(1)} mm`
                : 'Waiting for geometry'}
            </div>
          </motion.div>
          <motion.div whileHover={{ y: -2 }} className="rounded-2xl border border-[#6d28d9]/10 bg-white px-4 py-3">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Mesh Density</div>
            <div className="mt-2 text-sm text-[#0F1B3D]">
              {model ? `${model.triangleCount.toLocaleString()} tris` : '0 tris'}
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Full Screen Viewport Modal */}
      {isFullScreen && model && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#070a12] p-4 text-white">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-[var(--font-syne)] text-xl font-bold">{model.fileName}</h3>
              <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300">
                {materialId.toUpperCase()} ({colorName})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsFullScreen(false)}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black">
            <ModelPreviewCanvas
              object={model.object}
              materialId={materialId}
              colorName={colorName}
              displayMode={displayMode}
              showBuildVolume={showBuildVolume}
              clippingZPercent={clippingZPercent}
              cameraPreset={cameraPreset}
              onPresetApplied={() => setCameraPreset(null)}
            />
          </div>
        </div>
      )}
    </>
  )
}
