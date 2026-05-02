'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  UploadCloud,
  CheckCircle2,
  LoaderCircle,
  Palette,
  Package2,
  Layers3,
  ShieldCheck,
  BookmarkPlus,
  Clock3,
  Scale,
  Truck,
  ShoppingCart,
  PackageCheck,
  ArrowRight,
  AlertTriangle,
  FileArchive,
  Move3D,
  Cuboid,
} from 'lucide-react'
import { Canvas } from '@react-three/fiber'
import { Bounds, OrbitControls } from '@react-three/drei'
import { Suspense } from 'react'
import EmptyState from '@/components/admin/EmptyState'
import type { AppUserProfile } from '@/lib/auth/server'
import {
  calculateOrderTotal,
} from '@/lib/orders'
import { getMaterialById, layerHeightOptions } from '@/lib/quote/materials'
import { parseModelFile } from '@/lib/quote/model-utils'
import { calculateInstantQuote } from '@/lib/quote/pricing-engine'
import { saveQuoteToSupabase, uploadFileToSupabaseStorage, validateModelFile } from '@/lib/quote/supabase-storage'
import { hasSupabaseConfig } from '@/lib/supabase/config'
import type { ParsedModel, QuoteConfig, QuoteMaterial, UploadState } from '@/lib/quote/types'
import type { Object3D } from 'three'
import { useCart } from '@/lib/cart/context'
import type { CartItem } from '@/lib/cart/types'
import Toast, { type ToastState } from '@/components/quote/Toast'
import Link from 'next/link'

const initialUploadState: UploadState = {
  status: 'idle',
  progress: 0,
}

type InstantQuoteWorkspaceProps = {
  user: AppUserProfile | null
  initialQuoteId: string
  materials: QuoteMaterial[]
}

export default function InstantQuoteWorkspace({
  user,
  initialQuoteId,
  materials,
}: InstantQuoteWorkspaceProps) {
  if (materials.length === 0) {
    return (
      <div className="min-h-screen bg-[#050810] px-4 pb-16 pt-28 text-[#e8eaf0] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[1100px]">
          <EmptyState
            title="No materials available"
            description="The admin catalog is empty right now, so ordering is disabled until a material is added in the admin panel."
          />
        </div>
      </div>
    )
  }

  return (
    <CartEnabledWorkspace
      user={user}
      initialQuoteId={initialQuoteId}
      materials={materials}
    />
  )
}

function CartEnabledWorkspace({
  user,
  initialQuoteId,
  materials,
}: InstantQuoteWorkspaceProps) {
  const { addItem, isInCart } = useCart()
  const router = useRouter()
  const supabaseEnabled = hasSupabaseConfig()
  const defaultMaterial = materials[0] ?? getMaterialById('pla-plus', materials)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedModel, setSelectedModel] = useState<ParsedModel | null>(null)
  const [config, setConfig] = useState<QuoteConfig>({
    materialId: defaultMaterial.id,
    colorHex: defaultMaterial.colors[0]?.hex ?? '#ff5c1a',
    infill: 20,
    layerHeight: 0.2,
    supports: false,
    scalePercent: 100,
  })
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [hasUserSelectedMaterial, setHasUserSelectedMaterial] = useState(false)
  const [savingQuote, setSavingQuote] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>('upload')
  const uploadRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const materialRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const priceBreakdown = useMemo(
    () => calculateInstantQuote(selectedModel, config, materials),
    [selectedModel, config, materials]
  )
  const deliveryPricing = useMemo(
    () => calculateOrderTotal(priceBreakdown?.total ?? 0),
    [priceBreakdown]
  )

  const handleFileSelect = async (file: File) => {
    const validationError = validateModelFile(file)
    if (validationError) {
      setFileError(validationError)
      setToast({ type: 'error', message: validationError })
      return
    }

    setFileError(null)
    setSelectedFile(file)
    setViewerLoading(true)
    setUploadState({ status: 'uploading', progress: user && supabaseEnabled ? 0 : 12 })

    try {
      const parsedModel = await parseModelFile(file)
      setSelectedModel(parsedModel)

      if (!hasUserSelectedMaterial) {
        const suggestedMaterial = getMaterialById(parsedModel.suggestedMaterialId, materials)
        setConfig((current) => ({
          ...current,
          materialId: suggestedMaterial.id,
          colorHex: suggestedMaterial.colors[0]?.hex ?? current.colorHex,
        }))
        setToast({
          type: 'info',
          message: `Suggested material: ${suggestedMaterial.name} based on your model size.`,
        })
      }

      if (user && supabaseEnabled) {
        const uploadResult = await uploadFileToSupabaseStorage(
          file,
          user.id,
          initialQuoteId,
          (progress) => setUploadState({ status: 'uploading', progress })
        )
        setUploadState(uploadResult)
      } else {
        setUploadState({
          status: 'success',
          progress: 100,
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not process the uploaded model.'
      setSelectedModel(null)
      setUploadState({
        status: 'error',
        progress: 0,
        error: message,
      })
      setFileError(message)
      setToast({ type: 'error', message })
    } finally {
      setViewerLoading(false)
    }
  }

  const handleMaterialChange = (materialId: string) => {
    const nextMaterial = getMaterialById(materialId, materials)
    setHasUserSelectedMaterial(true)
    setConfig((current) => ({
      ...current,
      materialId,
      colorHex: nextMaterial.colors[0]?.hex ?? current.colorHex,
    }))
  }

  const handleSaveQuote = async () => {
    if (!supabaseEnabled) {
      setToast({
        type: 'error',
        message: 'Supabase is not configured. Local preview works, but account save is unavailable.',
      })
      return
    }

    if (!user) {
      setToast({ type: 'error', message: 'Sign in to save this quote to your account.' })
      return
    }

    if (!selectedModel || !priceBreakdown) {
      setToast({ type: 'error', message: 'Upload a model before saving a quote.' })
      return
    }

    try {
      setSavingQuote(true)
      await saveQuoteToSupabase({
        userId: user.id,
        quoteId: initialQuoteId,
        name: user.name,
        email: user.email,
        phone: '',
        filePath: uploadState.path,
        config,
        notes: '',
        estimate: {
          total: priceBreakdown.total,
          estimatedHours: priceBreakdown.estimatedHours,
          dimensions: priceBreakdown.dimensionsMm,
        },
      })
      setToast({ type: 'success', message: `Quote ${initialQuoteId} saved to your account.` })
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save quote.',
      })
    } finally {
      setSavingQuote(false)
    }
  }

  const cartItemCheck = isInCart(initialQuoteId)

  const handleAddToCart = () => {
    if (!priceBreakdown || !selectedModel) {
      setToast({ type: 'error', message: 'Upload a model and generate a quote before adding to cart.' })
      return
    }

    const material = getMaterialById(config.materialId, materials)
    const selectedColor =
      material.colors.find((color) => color.hex === config.colorHex)?.name ?? config.colorHex

    const cartItem: CartItem = {
      id: initialQuoteId,
      name: selectedModel?.fileName ?? 'model',
      quoteId: initialQuoteId,
      fileUrl: uploadState.path ?? '',
      fileName: selectedModel?.fileName ?? 'model',
      material: material?.name ?? '',
      color: selectedColor ?? '',
      colorHex: selectedColor ?? '',
      infill: config.infill,
      layerHeight: config.layerHeight,
      supports: config.supports,
      price: priceBreakdown?.total ?? 0,
      estimatedTime: priceBreakdown?.estimatedHours ?? 0,
      weight: priceBreakdown?.materialWeightGrams ?? 0,
      dimensions: priceBreakdown?.dimensionsMm ?? { x: 0, y: 0, z: 0 },
      config: {
        materialId: material?.id ?? '',
        colorHex: selectedColor ?? '',
        infill: config.infill,
        layerHeight: config.layerHeight,
        supports: config.supports,
        scalePercent: config.scalePercent,
      },
      addedAt: new Date().toISOString(),
    }

    addItem(cartItem)
    setToast({ type: 'success', message: `${selectedModel.fileName} added to cart.` })
  }

  const steps = [
    { id: 'upload', label: 'Upload', ref: uploadRef, done: uploadState.status === 'success' },
    { id: 'viewer', label: 'Preview', ref: viewerRef, done: selectedModel !== null },
    { id: 'material', label: 'Configure', ref: materialRef, done: selectedModel !== null },
    { id: 'settings', label: 'Settings', ref: settingsRef, done: false },
  ]

  return (
    <>
      <div className="relative min-h-screen bg-[#050810] text-[#e8eaf0]">
        <motion.div
          aria-hidden
          animate={{ x: [0, 50, 0], y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute left-[-8rem] top-28 h-72 w-72 rounded-full bg-[#FF5C1A]/8 blur-3xl"
        />
        <motion.div
          aria-hidden
          animate={{ x: [0, -45, 0], y: [0, 25, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute right-[-7rem] top-36 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl"
        />

        {/* Header */}
        <div className="relative px-4 pb-6 pt-28 md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/25 bg-[#FF5C1A]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#FF9A72]">
                  Instant Pricing Experience
                </div>
                <h1 className="mt-4 font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3.2rem)] font-extrabold leading-[0.98] tracking-[-2px] text-white">
                  Get Your <span className="text-[#7dd3fc]">Instant Quote</span>
                </h1>
                <p className="mt-3 max-w-[600px] text-sm leading-7 text-[#7a82a0]">
                  Upload, preview, configure, and get pricing in one streamlined workflow.
                </p>
              </div>

              {/* Step Navigator */}
              <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-xl">
                {steps.map((step, i) => (
                  <button
                    key={step.id}
                    onClick={() => step.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    className="flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-medium transition-colors hover:bg-white/5"
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      step.done
                        ? 'bg-emerald-400/20 text-emerald-400'
                        : activeSection === step.id
                          ? 'bg-[#FF5C1A]/20 text-[#FF9A72]'
                          : 'bg-white/10 text-[#7a82a0]'
                    }`}>
                      {step.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={step.done ? 'text-emerald-400' : activeSection === step.id ? 'text-white' : 'text-[#7a82a0]'}>
                      {step.label}
                    </span>
                    {i < steps.length - 1 && (
                      <ArrowRight className="ml-1 h-3 w-3 text-white/20" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 pb-16 md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
              {/* Left Column */}
              <div className="space-y-6">
                {/* Upload Section */}
                <motion.div
                  ref={uploadRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                >
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,22,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 p-2.5 text-[#FF9A72]">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">1. Upload Your Model</h2>
                        <p className="text-xs text-[#7a82a0]">STL, OBJ, or 3MF files supported</p>
                      </div>
                    </div>

                    <div
                      className="relative flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-6 text-center transition-colors hover:border-[#FF5C1A]/30"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const files = e.dataTransfer.files
                        if (files[0]) handleFileSelect(files[0])
                      }}
                    >
                      <input
                        type="file"
                        accept=".stl,.obj,.3mf"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                        }}
                      />
                      <div>
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#FF5C1A]/25 bg-[#FF5C1A]/12 text-[#FF9A72]"
                        >
                          <UploadCloud className="h-6 w-6" />
                        </motion.div>
                        <div className="text-base font-semibold text-white">
                          {selectedFile ? selectedFile.name : 'Drop your file or click to browse'}
                        </div>
                        {!selectedFile && (
                          <div className="mt-2 text-xs text-[#7a82a0]">
                            STL · OBJ · 3MF supported
                          </div>
                        )}
                        {selectedFile && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">
                            <FileArchive className="h-3 w-3" />
                            {selectedFile.name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {uploadState.status === 'uploading' && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs text-[#f4d0bf]">
                          <span className="inline-flex items-center gap-1.5">
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                            Uploading...
                          </span>
                          <span>{uploadState.progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-[#FF5C1A] transition-all duration-300"
                            style={{ width: `${uploadState.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {uploadState.status === 'success' && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Upload complete
                      </div>
                    )}
                    {uploadState.status === 'error' && uploadState.error && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-rose-200">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {uploadState.error}
                      </div>
                    )}
                    {fileError && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-amber-200">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {fileError}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Viewer Section */}
                <motion.div
                  ref={viewerRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,22,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2.5 text-cyan-200">
                        <Cuboid className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">2. 3D Preview</h2>
                        <p className="text-xs text-[#7a82a0]">Inspect your model from any angle</p>
                      </div>
                    </div>

                    <div className="relative h-[400px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_42%),linear-gradient(180deg,#09101e,#070b15)]">
                      {selectedModel ? (
                        <Suspense fallback={<div className="absolute inset-0 animate-pulse rounded-2xl bg-white/[0.03]" />}>
                          <Canvas className="!absolute !inset-0" camera={{ position: [140, 120, 140], fov: 34 }} dpr={[1, 1.7]}>
                            <color attach="background" args={['#070b15']} />
                            <ambientLight intensity={0.95} />
                            <directionalLight position={[120, 120, 80]} intensity={1.15} />
                            <directionalLight position={[-80, -50, -60]} intensity={0.4} />
                            <gridHelper args={[280, 28, '#1f2a44', '#0f172a']} position={[0, -55, 0]} />
                            <Bounds fit clip observe margin={1.3}>
                              <ViewerModel object={selectedModel.object} scalePercent={config.scalePercent} />
                            </Bounds>
                            <OrbitControls makeDefault enablePan enableZoom enableRotate />
                          </Canvas>
                        </Suspense>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-cyan-200">
                            <Move3D className="h-6 w-6" />
                          </div>
                          <div className="text-sm font-semibold text-white">No model loaded</div>
                          <p className="max-w-xs text-xs leading-6 text-[#7a82a0]">
                            Upload a file above to see your model in the interactive 3D viewer.
                          </p>
                        </div>
                      )}

                      {viewerLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,8,16,0.62)] backdrop-blur-sm">
                          <div className="rounded-xl border border-white/10 bg-[#0d1120] px-4 py-3 text-xs text-white">
                            Building 3D preview...
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedModel && (
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Dimensions</div>
                          <div className="mt-1 text-xs text-white">
                            {selectedModel.dimensionsMm.x.toFixed(0)} × {selectedModel.dimensionsMm.y.toFixed(0)} × {selectedModel.dimensionsMm.z.toFixed(0)} mm
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Triangles</div>
                          <div className="mt-1 text-xs text-white">{selectedModel.triangleCount.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Controls</div>
                          <div className="mt-1 text-xs text-white">Rotate · Zoom · Pan</div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Material & Color Section */}
                <motion.div
                  ref={materialRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,22,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-2.5 text-violet-200">
                        <Palette className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">3. Material & Color</h2>
                        <p className="text-xs text-[#7a82a0]">Choose the best material and finish for your part</p>
                      </div>
                    </div>

                    {/* Material Selection */}
                    <div className="mb-5">
                      <label className="mb-2 block text-xs font-medium text-[#aeb8d8]">Material</label>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {materials.map((material) => {
                          const isActive = material.id === config.materialId
                          return (
                            <button
                              key={material.id}
                              type="button"
                              onClick={() => handleMaterialChange(material.id)}
                              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                isActive
                                  ? 'border-[#FF8A57]/35 bg-[#11182b] shadow-[0_4px_16px_rgba(255,92,26,0.1)]'
                                  : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                              }`}
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FF5C1A]/10 text-base">
                                {material.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="truncate text-sm font-medium text-white">{material.name}</span>
                                  {isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#FF9A72]" />}
                                </div>
                                <p className="mt-0.5 truncate text-[11px] text-[#8d97b8]">{material.summary}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-[#aeb8d8]">
                        Color — {getMaterialById(config.materialId, materials).name}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {getMaterialById(config.materialId, materials).colors.map((color) => {
                          const isActive = color.hex === config.colorHex
                          return (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setConfig((c) => ({ ...c, colorHex: color.hex }))}
                              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left transition-all ${
                                isActive
                                  ? 'border-[#FF8A57]/40 bg-[#11182b]'
                                  : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                              }`}
                            >
                              <span
                                className="h-5 w-5 rounded-full border border-white/20 shadow-[0_0_8px_rgba(255,255,255,0.06)]"
                                style={{ backgroundColor: color.hex }}
                              />
                              <span className="text-xs font-medium text-white">{color.name}</span>
                              {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-[#FF9A72]" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Settings Section */}
                <motion.div
                  ref={settingsRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,22,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-2.5 text-sky-200">
                        <Layers3 className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">4. Print Settings</h2>
                        <p className="text-xs text-[#7a82a0]">Fine-tune quality, strength, and scale</p>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Infill */}
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-[#aeb8d8]">Infill Density</span>
                          <span className="font-semibold text-white">{config.infill}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={100}
                          step={5}
                          value={config.infill}
                          onChange={(e) => setConfig((c) => ({ ...c, infill: Number(e.target.value) }))}
                          className="w-full accent-[#FF5C1A]"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-[#7a82a0]">
                          <span>Hollow</span>
                          <span>Solid</span>
                        </div>
                      </div>

                      {/* Scale */}
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-[#aeb8d8]">Scale</span>
                          <span className="font-semibold text-white">{config.scalePercent}%</span>
                        </div>
                        <input
                          type="range"
                          min={50}
                          max={150}
                          step={5}
                          value={config.scalePercent}
                          onChange={(e) => setConfig((c) => ({ ...c, scalePercent: Number(e.target.value) }))}
                          className="w-full accent-cyan-400"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-[#7a82a0]">
                          <span>50%</span>
                          <span>150%</span>
                        </div>
                      </div>

                      {/* Layer Height */}
                      <div>
                        <div className="mb-2 text-sm text-[#aeb8d8]">Layer Height</div>
                        <div className="grid gap-2">
                          {layerHeightOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setConfig((c) => ({ ...c, layerHeight: option.value }))}
                              className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                                option.value === config.layerHeight
                                  ? 'border-[#FF8A57]/35 bg-[#11182b]'
                                  : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                              }`}
                            >
                              <div className="text-xs font-medium text-white">{option.label}</div>
                              <div className="mt-0.5 text-[10px] text-[#8d97b8]">{option.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Supports */}
                      <div>
                        <div className="mb-2 text-sm text-[#aeb8d8]">Supports</div>
                        <button
                          type="button"
                          onClick={() => setConfig((c) => ({ ...c, supports: !c.supports }))}
                          className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                            config.supports
                              ? 'border-[#FF8A57]/35 bg-[#11182b]'
                              : 'border-white/8 bg-white/[0.02] hover:border-white/15'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white">
                              {config.supports ? 'Enabled' : 'Disabled'}
                            </span>
                            <div className={`relative h-6 w-11 rounded-full transition-colors ${
                              config.supports ? 'bg-[#FF5C1A]' : 'bg-white/10'
                            }`}>
                              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                                config.supports ? 'translate-x-6' : 'translate-x-1'
                              }`} />
                            </div>
                          </div>
                          <div className="mt-2 text-[10px] text-[#8d97b8]">
                            Add support structures for overhangs
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Save Quote */}
                    {user && (
                      <div className="mt-6 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] p-4">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-emerald-400" />
                          <div>
                            <div className="text-xs font-medium text-white">{user.name}</div>
                            <div className="text-[10px] text-[#7a82a0]">{user.email}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveQuote}
                          disabled={!selectedModel || savingQuote}
                          className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <BookmarkPlus className="h-3.5 w-3.5" />
                          {savingQuote ? 'Saving...' : 'Save Quote'}
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Right Sidebar - Sticky Quote Summary */}
              <motion.aside
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="xl:sticky xl:top-24 xl:self-start"
              >
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.98),rgba(6,10,20,0.96))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.3)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Quote Summary</h2>
                      <p className="text-xs text-[#7a82a0]">{initialQuoteId}</p>
                    </div>
                    <div className="rounded-xl border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 p-2 text-[#FF9A72]">
                      <Package2 className="h-4 w-4" />
                    </div>
                  </div>

                  {!priceBreakdown ? (
                    <div className="space-y-3">
                      <div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
                      <div className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
                      <div className="h-20 animate-pulse rounded-xl bg-white/[0.04]" />
                    </div>
                  ) : (
                    <>
                      {/* Config Summary */}
                      <div className="mb-4 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: config.colorHex }} />
                          <span className="text-white">{getMaterialById(config.materialId, materials).name}</span>
                          <span className="text-[#7a82a0]">·</span>
                          <span className="text-[#aeb8d8]">{config.infill}% infill</span>
                          <span className="text-[#7a82a0]">·</span>
                          <span className="text-[#aeb8d8]">{config.layerHeight}mm</span>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="rounded-xl border border-[#FF8A57]/20 bg-[linear-gradient(180deg,rgba(255,92,26,0.12),rgba(255,92,26,0.06))] p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[#ffd3c1]">Total Price</div>
                        <div className="mt-1 font-[var(--font-syne)] text-3xl font-bold text-white">
                          ₹{deliveryPricing.totalPrice.toFixed(0)}
                        </div>
                        <div className="mt-3 space-y-1.5 text-xs text-[#ffe0d4]">
                          <div className="flex justify-between">
                            <span>Material</span>
                            <span>₹{priceBreakdown.materialCost.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Machine time</span>
                            <span>₹{priceBreakdown.timeCost.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Labour</span>
                            <span>₹{priceBreakdown.labourCost.toFixed(0)}</span>
                          </div>
                          {priceBreakdown.supportCost > 0 && (
                            <div className="flex justify-between">
                              <span>Supports</span>
                              <span>₹{priceBreakdown.supportCost.toFixed(0)}</span>
                            </div>
                          )}
                          <div className="border-t border-white/10 pt-1.5 flex justify-between font-medium text-white">
                            <span>Print total</span>
                            <span>₹{priceBreakdown.total.toFixed(0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delivery</span>
                            <span>{deliveryPricing.deliveryCharge === 0 ? 'FREE' : `₹${deliveryPricing.deliveryCharge.toFixed(0)}`}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Weight</div>
                          <div className="mt-1 text-sm font-medium text-white">{priceBreakdown.materialWeightGrams.toFixed(1)} g</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Print time</div>
                          <div className="mt-1 text-sm font-medium text-white">{priceBreakdown.estimatedHours.toFixed(1)} hr</div>
                        </div>
                        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3 col-span-2">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">
                            <Scale className="h-3 w-3" />
                            Dimensions
                          </div>
                          <div className="mt-1 text-xs text-white">
                            {priceBreakdown.dimensionsMm.x.toFixed(0)} × {priceBreakdown.dimensionsMm.y.toFixed(0)} × {priceBreakdown.dimensionsMm.z.toFixed(0)} mm
                          </div>
                        </div>
                      </div>

                      {/* Delivery */}
                      <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-3">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-200">
                          <Truck className="h-3 w-3" />
                          Delivery
                        </div>
                        <div className="mt-1 text-xs font-medium text-white">~48 hour print and delivery</div>
                      </div>

                      {/* Actions */}
                      <div className="mt-5 space-y-2.5">
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          disabled={!selectedModel}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                            cartItemCheck
                              ? 'border border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                              : 'bg-[#FF5C1A] text-white hover:opacity-95'
                          }`}
                        >
                          {cartItemCheck ? (
                            <>
                              <PackageCheck className="h-4 w-4" />
                              Added to Cart
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-4 w-4" />
                              Add to Cart
                            </>
                          )}
                        </button>

                        {cartItemCheck && (
                          <Link
                            href="/cart"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF5C1A]/30 bg-[#FF5C1A]/10 px-4 py-2.5 text-xs font-medium text-[#FF9A72] transition-colors hover:bg-[#FF5C1A]/20"
                          >
                            View Cart
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>

                      {!user && (
                        <Link
                          href="/login?next=%2Finstant-quote"
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-white transition-colors hover:bg-white/[0.07]"
                        >
                          Sign in to save quotes
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </motion.aside>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  )
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
