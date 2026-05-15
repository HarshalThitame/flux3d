'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  UploadCloud,
  CheckCircle2,
  LoaderCircle,
  Palette,
  Package2,
  Layers3,
  ShieldCheck,
  BookmarkPlus,
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
import { getMaterialById, layerHeightOptions } from '@/lib/quote/materials'
import { parseModelFile } from '@/lib/quote/model-utils'
import { calculateInstantQuote, formatDurationMinutes, getPostProcessingCharge, postProcessingOptions } from '@/lib/quote/pricing-engine'
import type { PricingSettingsInput } from '@/lib/quote/pricing-waterfall'
import { saveQuoteToSupabase, uploadFileToSupabaseStorage, validateModelFile } from '@/lib/quote/supabase-storage'
import { hasSupabaseConfig } from '@/lib/supabase/config'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import type { ParsedModel, QuoteConfig, QuoteMaterial, UploadState } from '@/lib/quote/types'
import type { Object3D } from 'three'
import { useCart } from '@/lib/cart/context'
import type { CartItem } from '@/lib/cart/types'
import Toast, { type ToastState } from '@/components/quote/Toast'
import Link from 'next/link'
import { ORDER_DRAFT_STORAGE_KEY, type OrderDraft } from '@/lib/orders'

const initialUploadState: UploadState = {
  status: 'idle',
  progress: 0,
}

type InstantQuoteWorkspaceProps = {
  user: AppUserProfile | null
  materials: QuoteMaterial[]
  initialMaterialId?: string
  pricingSettings: PricingSettingsInput
  bulkOrderContact: {
    email: string
    whatsappNumber: string
  }
}

export default function InstantQuoteWorkspace({
  user,
  materials,
  initialMaterialId,
  pricingSettings,
  bulkOrderContact,
}: InstantQuoteWorkspaceProps) {
  if (materials.length === 0) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] px-4 pb-16 pt-28 text-[#0F1B3D] md:px-8 xl:px-10">
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
      materials={materials}
      initialMaterialId={initialMaterialId}
      pricingSettings={pricingSettings}
      bulkOrderContact={bulkOrderContact}
    />
  )
}

const WORKSPACE_STORAGE_KEY = 'flux3d-workspace-draft'
const QUOTE_ID_STORAGE_KEY = 'flux3d-quote-id'

function getInitialQuoteId() {
  if (typeof window === 'undefined') {
    return ''
  }

  const stored = sessionStorage.getItem(QUOTE_ID_STORAGE_KEY)
  if (stored) {
    return stored
  }

  const newId = `F3D-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
  sessionStorage.setItem(QUOTE_ID_STORAGE_KEY, newId)
  return newId
}

function getInitialWorkspaceConfig(defaultConfig: QuoteConfig, forceMaterialSelection: boolean) {
  if (typeof window === 'undefined') {
    return defaultConfig
  }

  const raw = sessionStorage.getItem(WORKSPACE_STORAGE_KEY)
  if (!raw) {
    return defaultConfig
  }

  try {
    const parsed = JSON.parse(raw) as { config?: QuoteConfig }
    const merged = { ...defaultConfig, ...parsed.config }
    return forceMaterialSelection
      ? { ...merged, materialId: defaultConfig.materialId, color: defaultConfig.color }
      : merged
  } catch {
    return defaultConfig
  }
}

function CartEnabledWorkspace({
  user,
  materials,
  initialMaterialId,
  pricingSettings,
  bulkOrderContact,
}: InstantQuoteWorkspaceProps) {
  const { addItem, isInCart } = useCart()
  const supabaseEnabled = hasSupabaseConfig()
  const preferredMaterial = initialMaterialId ? getMaterialById(initialMaterialId, materials) : undefined
  const defaultMaterial = preferredMaterial ?? getMaterialById('pla', materials) ?? getMaterialById('pla-plus', materials) ?? materials[0]
  const [initialQuoteId, setInitialQuoteId] = useState(getInitialQuoteId)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedModel, setSelectedModel] = useState<ParsedModel | null>(null)
  const defaultConfig: QuoteConfig = {
    materialId: defaultMaterial.id,
    color: defaultMaterial.colors[0]?.name ?? 'Default',
    infill: 20,
    layerHeight: 0.2,
    quantity: 1,
    postProcessingLevel: 'none',
    supports: false,
  }
  const [config, setConfig] = useState<QuoteConfig>(() => getInitialWorkspaceConfig(defaultConfig, Boolean(initialMaterialId)))
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [hasUserSelectedMaterial, setHasUserSelectedMaterial] = useState(Boolean(initialMaterialId))
  const [savingQuote, setSavingQuote] = useState(false)
  const uploadRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<HTMLDivElement>(null)
  const materialRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const trackedQuoteRef = useRef<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const draft = { config }
    sessionStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(draft))
  }, [config])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const priceBreakdown = useMemo(
    () => calculateInstantQuote(selectedModel, config, materials, pricingSettings),
    [selectedModel, config, materials, pricingSettings]
  )

  useEffect(() => {
    if (!selectedModel || !priceBreakdown || !initialQuoteId || trackedQuoteRef.current === initialQuoteId) {
      return
    }

    trackedQuoteRef.current = initialQuoteId
    void trackFeatureUsage(user?.id ?? null, 'instant_quote', {
      quoteId: initialQuoteId,
      fileName: selectedModel.fileName,
      materialId: config.materialId,
      color: config.color,
      quantity: config.quantity,
      grandTotal: priceBreakdown.grandTotal,
    }).catch(() => {})
  }, [config.color, config.materialId, config.quantity, initialQuoteId, priceBreakdown, selectedModel, user?.id])
  const selectedMaterial = getMaterialById(config.materialId, materials)
  const postProcessingBaseAmount = priceBreakdown ? priceBreakdown.materialCost + priceBreakdown.machineCost : 0
  const selectedColorName = config.color
  const orderDraft = useMemo<OrderDraft | null>(() => {
    if (!initialQuoteId || !selectedMaterial || !selectedModel || !priceBreakdown || uploadState.status !== 'success' || !uploadState.path) {
      return null
    }

    return {
      quoteId: initialQuoteId,
      fileUrl: uploadState.path,
      material: selectedMaterial.name,
      color: selectedColorName,
      infill: config.infill,
      layerHeight: config.layerHeight,
      quantity: config.quantity,
      postProcessingLevel: config.postProcessingLevel,
      materialCost: priceBreakdown.materialCost,
      machineCost: priceBreakdown.machineCost,
      subtotal: priceBreakdown.subtotal,
      postProcessingCharges: priceBreakdown.postProcessingCharges,
      totalPrice: priceBreakdown.priceBeforeDiscount,
      cartDiscountAmount: priceBreakdown.cartDiscountAmount,
      cartDiscountPercent: priceBreakdown.cartDiscountPercent,
      finalPrice: priceBreakdown.finalPrice,
      deliveryCharge: priceBreakdown.deliveryCharge,
      grandTotal: priceBreakdown.grandTotal,
      supports: config.supports,
      price: priceBreakdown.finalPrice,
      estimatedTime: priceBreakdown.estimatedHours,
      weight: priceBreakdown.materialWeightGrams,
      difficultyFactor: priceBreakdown.difficultyFactor,
      overheadPercentage: priceBreakdown.overheadPercentage,
      overheadAmount: priceBreakdown.overheadAmount,
      marginPercentage: priceBreakdown.marginPercentage,
      marginAmount: priceBreakdown.marginAmount,
      priceBreakdown: {
        materialCost: priceBreakdown.materialCost,
        machineCost: priceBreakdown.machineCost,
        postProcessingCharges: priceBreakdown.postProcessingCharges,
        subtotal: priceBreakdown.subtotal,
        overheadPercentage: priceBreakdown.overheadPercentage,
        overheadAmount: priceBreakdown.overheadAmount,
        marginPercentage: priceBreakdown.marginPercentage,
        marginAmount: priceBreakdown.marginAmount,
        totalPrice: priceBreakdown.priceBeforeDiscount,
        cartDiscountAmount: priceBreakdown.cartDiscountAmount,
        cartDiscountPercent: priceBreakdown.cartDiscountPercent,
        finalPrice: priceBreakdown.finalPrice,
        deliveryCharge: priceBreakdown.deliveryCharge,
        grandTotal: priceBreakdown.grandTotal,
      },
      notes: '',
    }
  }, [
    config.infill,
    config.layerHeight,
    config.quantity,
    config.postProcessingLevel,
    config.supports,
    initialQuoteId,
    priceBreakdown,
    selectedColorName,
    selectedMaterial,
    selectedModel,
    uploadState.path,
    uploadState.status,
  ])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (orderDraft) {
      window.sessionStorage.setItem(ORDER_DRAFT_STORAGE_KEY, JSON.stringify(orderDraft))
      return
    }

    window.sessionStorage.removeItem(ORDER_DRAFT_STORAGE_KEY)
  }, [orderDraft])

  const handleFileSelect = async (file: File) => {
    const validationError = validateModelFile(file)
    if (validationError) {
      setFileError(validationError)
      setToast({ type: 'error', message: validationError })
      return
    }

    const newQuoteId = `F3D-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
    sessionStorage.setItem('flux3d-quote-id', newQuoteId)
    setInitialQuoteId(newQuoteId)

    setFileError(null)
    setSelectedFile(file)
    setViewerLoading(true)
    setUploadState({ status: 'uploading', progress: user && supabaseEnabled ? 0 : 12 })

    try {
      const parsedModel = await parseModelFile(file)
      setSelectedModel(parsedModel)

      if (!hasUserSelectedMaterial) {
        const suggestedMaterial = getMaterialById(parsedModel.suggestedMaterialId, materials) ?? materials[0]
        if (!suggestedMaterial) {
          throw new Error('No printable material is available for this model.')
        }
        setConfig((current) => ({
          ...current,
          materialId: suggestedMaterial.id,
          color: suggestedMaterial.colors[0]?.name ?? current.color,
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
          newQuoteId,
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
    const nextMaterial = getMaterialById(materialId, materials) ?? materials[0]
    if (!nextMaterial) {
      return
    }
    setHasUserSelectedMaterial(true)
    setConfig((current) => ({
      ...current,
      materialId,
      color: nextMaterial.colors[0]?.name ?? current.color,
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
          total: priceBreakdown.grandTotal,
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
    if (!priceBreakdown || !selectedModel || !selectedMaterial) {
      setToast({ type: 'error', message: 'Upload a model and generate a quote before adding to cart.' })
      return
    }

    if (!uploadState.path) {
      setToast({
        type: 'error',
        message: 'Sign in and upload the model to storage before adding this quote to cart.',
      })
      return
    }

    const cartItem: CartItem = {
      id: initialQuoteId,
      name: selectedModel?.fileName ?? 'model',
      quoteId: initialQuoteId,
      fileUrl: uploadState.path,
      fileName: selectedModel?.fileName ?? 'model',
      material: selectedMaterial.name,
      color: selectedColorName ?? '',
      infill: config.infill,
      layerHeight: config.layerHeight,
      quantity: config.quantity,
      supports: config.supports,
      materialCost: priceBreakdown?.materialCost ?? 0,
      machineCost: priceBreakdown?.machineCost ?? 0,
      subtotal: priceBreakdown?.subtotal ?? 0,
      postProcessingCharges: priceBreakdown?.postProcessingCharges ?? 0,
      overheadPercentage: priceBreakdown?.overheadPercentage ?? 0,
      overheadAmount: priceBreakdown?.overheadAmount ?? 0,
      marginPercentage: priceBreakdown?.marginPercentage ?? 0,
      marginAmount: priceBreakdown?.marginAmount ?? 0,
      totalPrice: priceBreakdown?.priceBeforeDiscount ?? 0,
      cartDiscountAmount: priceBreakdown?.cartDiscountAmount ?? 0,
      cartDiscountPercent: priceBreakdown?.cartDiscountPercent ?? 0,
      finalPrice: priceBreakdown?.finalPrice ?? 0,
      deliveryCharge: priceBreakdown?.deliveryCharge ?? 0,
      grandTotal: priceBreakdown?.grandTotal ?? 0,
      price: priceBreakdown?.finalPrice ?? 0,
      estimatedTime: priceBreakdown?.estimatedHours ?? 0,
      weight: priceBreakdown?.materialWeightGrams ?? 0,
      difficultyFactor: priceBreakdown?.difficultyFactor ?? selectedMaterial.difficultyFactor,
      dimensions: priceBreakdown?.dimensionsMm ?? { x: 0, y: 0, z: 0 },
      config: {
        materialId: selectedMaterial.id,
        color: selectedColorName ?? '',
        infill: config.infill,
        layerHeight: config.layerHeight,
        quantity: config.quantity,
        postProcessingLevel: config.postProcessingLevel,
        supports: config.supports,
      },
      addedAt: new Date().toISOString(),
    }

    addItem(cartItem)
    setToast({ type: 'success', message: `${selectedModel.fileName} added to cart.` })
  }

  const handleStepClick = (ref: React.RefObject<HTMLDivElement | null>) => {
    const el = ref.current
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const getStepDone = (stepId: string) => {
    switch(stepId) {
      case 'upload': return uploadState.status === 'success'
      case 'viewer': return selectedModel !== null
      case 'material': return selectedModel !== null
      case 'settings': return false
      default: return false
    }
  }

  const stepConfigs = [
    { id: 'upload', label: 'Upload' },
    { id: 'viewer', label: 'Preview' },
    { id: 'material', label: 'Configure' },
    { id: 'settings', label: 'Settings' },
  ]

  const stepRefs = {
    upload: uploadRef,
    viewer: viewerRef,
    material: materialRef,
    settings: settingsRef,
  }
  const whatsappDigits = bulkOrderContact.whatsappNumber.replace(/[^0-9]/g, '')

  return (
    <>
      <div className="relative min-h-screen bg-[#FFFFFF] text-[#0F1B3D]">
        <motion.div
          aria-hidden
          animate={{ x: [0, 50, 0], y: [0, -20, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute left-[-8rem] top-28 h-72 w-72 rounded-full bg-[#7C5CFF]/8 blur-3xl"
        />
        <motion.div
          aria-hidden
          animate={{ x: [0, -45, 0], y: [0, 25, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute right-[-7rem] top-36 h-80 w-80 rounded-full bg-cyan-400/8 blur-3xl"
        />

        {/* Header */}
        <div className="relative px-4 pb-6 pt-32 md:px-8 xl:px-10 md:pt-28">
          <div className="mx-auto max-w-[1500px]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/25 bg-[#7C5CFF]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#7C5CFF]">
                  Instant Pricing Experience
                </div>
                <h1 className="mt-4 font-[var(--font-syne)] text-[clamp(1.8rem,4vw,3.2rem)] font-extrabold leading-[0.98] tracking-[-2px] text-[#0F1B3D]">
                  Get Your <span className="text-[#7C5CFF]">Instant Quote</span>
                </h1>
                <p className="mt-3 max-w-[600px] text-sm leading-7 text-[#6F7192]">
                  Upload, preview, configure, and get pricing in one streamlined workflow.
                </p>
              </div>

                {/* Step Navigator */}
                <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-[#7C5CFF]/10 bg-white/[0.03] p-1.5 backdrop-blur-xl scrollbar-hide">
                  {stepConfigs.map((step, i) => {
                    const done = getStepDone(step.id)
                    const ref = stepRefs[step.id as keyof typeof stepRefs]
                    return (
                    <button
                      key={step.id}
                      onClick={() => handleStepClick(ref)}
                      className="flex items-center gap-2 whitespace-nowrap rounded-xl px-2.5 py-2.5 text-xs font-medium transition-colors hover:bg-white/5 flex-shrink-0 min-h-[44px]"
                    >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                      done
                        ? 'bg-emerald-700/20 text-emerald-700'
                        : 'bg-white/10 text-[#6F7192]'
                    }`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={done ? 'text-emerald-700' : 'text-[#6F7192]'}>
                      {step.label}
                    </span>
                    {i < stepConfigs.length - 1 && (
                      <ArrowRight className="ml-1 h-3 w-3 text-[#0F1B3D]/20" />
                    )}
                  </button>
                    )
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 pb-16 md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1500px]">
            <div className="grid gap-6 lg:gap-8 xl:grid-cols-[1fr_380px]">
              {/* Left Column */}
              <div className="space-y-6">
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3 text-sm text-[#0F1B3D]">
                  For bulk orders contact{' '}
                  <a className="font-medium text-[#7C5CFF] hover:underline" href={`mailto:${bulkOrderContact.email}`}>
                    {bulkOrderContact.email}
                  </a>{' '}
                  or{' '}
                  <a
                    className="font-medium text-[#7C5CFF] hover:underline"
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp us
                  </a>
                  .
                </div>

                {/* Upload Section */}
                <motion.div
                  ref={uploadRef}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.05 }}
                >
                  <div className="rounded-[24px] border border-[#7C5CFF]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-5 sm:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 p-2.5 text-[#7C5CFF]">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#0F1B3D]">1. Upload Your Model</h2>
                        <p className="text-xs text-[#6F7192]">STL, OBJ, 3MF, STEP, DXF, or DWG files supported</p>
                      </div>
                    </div>

                    <div
                      className="relative flex min-h-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-[#7C5CFF]/10 bg-white/[0.02] p-6 text-center transition-colors hover:border-[#7C5CFF]/30"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        const files = e.dataTransfer.files
                        if (files[0]) handleFileSelect(files[0])
                      }}
                    >
                      <input
                        type="file"
                        accept=".stl,.step,.obj,.3mf,.dxf,.dwg"
                        className="absolute inset-0 cursor-pointer opacity-0"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFileSelect(e.target.files[0])
                        }}
                      />
                      <div>
                        <motion.div
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                          className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[#7C5CFF]/25 bg-[#7C5CFF]/12 text-[#7C5CFF]"
                        >
                          <UploadCloud className="h-6 w-6" />
                        </motion.div>
                        <div className="text-base font-semibold text-[#0F1B3D]">
                          {selectedFile ? selectedFile.name : 'Drop your file or click to browse'}
                        </div>
                        {!selectedFile && (
<div className="mt-2 text-xs text-[#6F7192]">
  STL · OBJ · 3MF · STEP · DXF · DWG supported
</div>
                        )}
                        {selectedFile && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#7C5CFF]/10 bg-white/[0.03] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">
                            <FileArchive className="h-3 w-3" />
                            {selectedFile.name}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    {uploadState.status === 'uploading' && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-center justify-between text-xs text-[#6F7192]">
                          <span className="inline-flex items-center gap-1.5">
                            <LoaderCircle className="h-3 w-3 animate-spin" />
                            Uploading...
                          </span>
                          <span>{uploadState.progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                          <div
                            className="h-full rounded-full bg-[#7C5CFF] transition-all duration-300"
                            style={{ width: `${uploadState.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {uploadState.status === 'success' && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Upload complete
                      </div>
                    )}
                    {uploadState.status === 'error' && uploadState.error && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-rose-600">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {uploadState.error}
                      </div>
                    )}
                    {fileError && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-amber-700">
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
                  <div className="rounded-[24px] border border-[#7C5CFF]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-5 sm:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-2.5 text-cyan-200">
                        <Cuboid className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#0F1B3D]">2. 3D Preview</h2>
                        <p className="text-xs text-[#6F7192]">Inspect your model from any angle</p>
                      </div>
                    </div>

                    <div className="relative h-[280px] sm:h-[400px] overflow-hidden rounded-2xl border border-[#7C5CFF]/10 bg-[radial-gradient(circle_at_top,rgba(183, 167, 255,0.08),transparent_42%),linear-gradient(180deg,#FFFFFF,#FFFFFF)]">
                      {selectedModel ? (
                        <Suspense fallback={<div className="absolute inset-0 animate-pulse rounded-2xl bg-white/[0.03]" />}>
                          <Canvas className="!absolute !inset-0" camera={{ position: [140, 120, 140], fov: 34 }} dpr={[1, 1.7]}>
                            <color attach="background" args={['#FFFFFF']} />
                            <ambientLight intensity={0.95} />
                            <directionalLight position={[120, 120, 80]} intensity={1.15} />
                            <directionalLight position={[-80, -50, -60]} intensity={0.4} />
                            <gridHelper args={[280, 28, '#1f2a44', '#0f172a']} position={[0, -55, 0]} />
                            <Bounds fit clip observe margin={1.3}>
                              <ViewerModel object={selectedModel.object} />
                            </Bounds>
                            <OrbitControls makeDefault enablePan enableZoom enableRotate />
                          </Canvas>
                        </Suspense>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#7C5CFF]/10 bg-white/[0.03] text-cyan-200">
                            <Move3D className="h-6 w-6" />
                          </div>
                          <div className="text-sm font-semibold text-[#0F1B3D]">No model loaded</div>
                          <p className="max-w-xs text-xs leading-6 text-[#6F7192]">
                            Upload a file above to see your model in the interactive 3D viewer.
                          </p>
                        </div>
                      )}

                      {viewerLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(4,8,16,0.62)] backdrop-blur-sm">
                          <div className="rounded-xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-3 text-xs text-[#0F1B3D]">
                            Building 3D preview...
                          </div>
                        </div>
                      )}
                    </div>

                    {selectedModel && (
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Dimensions</div>
                          <div className="mt-1 text-xs text-[#0F1B3D]">
                            {selectedModel.dimensionsMm.x.toFixed(0)} × {selectedModel.dimensionsMm.y.toFixed(0)} × {selectedModel.dimensionsMm.z.toFixed(0)} mm
                          </div>
                        </div>
                        <div className="rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Triangles</div>
                          <div className="mt-1 text-xs text-[#0F1B3D]">{selectedModel.triangleCount.toLocaleString()}</div>
                        </div>
                        <div className="rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2.5">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Controls</div>
                          <div className="mt-1 text-xs text-[#0F1B3D]">Rotate · Zoom · Pan</div>
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
                  <div className="rounded-[24px] border border-[#7C5CFF]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-5 sm:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl border border-violet-400/20 bg-violet-400/10 p-2.5 text-violet-200">
                        <Palette className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#0F1B3D]">3. Material & Color</h2>
                        <p className="text-xs text-[#6F7192]">Choose the best material and finish for your part</p>
                      </div>
                    </div>

                    {/* Material Selection */}
                    <div className="mb-5">
                      <label className="mb-2 block text-xs font-medium text-[#6F7192]">Material</label>
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
                                  ? 'border-[#7C5CFF]/35 bg-[#1C3B52] shadow-[0_4px_16px_rgba(124, 92, 255,0.1)]'
                                  : 'border-[#7C5CFF]/10 bg-white/[0.02] hover:border-[#7C5CFF]/10'
                              }`}
                            >
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7C5CFF]/10 text-base">
                                {material.icon}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className={`truncate text-sm font-medium ${isActive ? 'text-white' : 'text-[#0F1B3D]'}`}>{material.name}</span>
                                  {isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-[#7C5CFF]" />}
                                </div>
                                <p className={`mt-0.5 truncate text-[11px] ${isActive ? 'text-[#c9d0e7]' : 'text-[#6F7192]'}`}>{material.summary}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Color Selection */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-[#6F7192]">
                        Color — {selectedMaterial?.name ?? 'Material'}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(selectedMaterial?.colors ?? []).map((color, idx) => {
                          const isActive = color.name === config.color
                          return (
                            <button
                              key={`${color.name}-${idx}`}
                              type="button"
                              onClick={() => setConfig((c) => ({ ...c, color: color.name }))}
                              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left transition-all ${
                                isActive
                                  ? 'border-[#7C5CFF]/40 bg-[#1C3B52]'
                                  : 'border-[#7C5CFF]/10 bg-white/[0.02] hover:border-[#7C5CFF]/10'
                              }`}
                            >
                              <span className={`text-xs font-medium ${isActive ? 'text-white' : 'text-[#0F1B3D]'}`}>{color.name}</span>
                              {isActive && <CheckCircle2 className="h-3.5 w-3.5 text-[#7C5CFF]" />}
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
                  <div className="rounded-[24px] border border-[#7C5CFF]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-5 sm:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 p-2.5 text-sky-200">
                        <Layers3 className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-[#0F1B3D]">4. Print Settings</h2>
                        <p className="text-xs text-[#6F7192]">Fine-tune quality, strength, and scale</p>
                      </div>
                    </div>

                    <div className="grid gap-6 sm:grid-cols-2">
                      {/* Infill */}
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-[#6F7192]">Infill Density</span>
                          <span className="font-semibold text-[#0F1B3D]">{config.infill}%</span>
                        </div>
                        <input
                          type="range"
                          min={5}
                          max={100}
                          step={5}
                          value={config.infill}
                          onChange={(e) => setConfig((c) => ({ ...c, infill: Number(e.target.value) }))}
                          className="w-full accent-[#7C5CFF]"
                        />
                        <div className="mt-1 flex justify-between text-[10px] text-[#6F7192]">
                          <span>Hollow</span>
                          <span>Solid</span>
                        </div>
                      </div>

                      {/* Quantity */}
                      <div>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="text-[#6F7192]">Quantity</span>
                          <span className="font-semibold text-[#0F1B3D]">{config.quantity} pcs</span>
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          step={1}
                          value={config.quantity}
                          onChange={(e) => setConfig((c) => ({ ...c, quantity: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))}
                          className="w-full rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
                        />
                      </div>

                      {/* Post-processing */}
                      <div>
                        <div className="mb-2 text-sm text-[#6F7192]">Post-processing</div>
                        <div className="grid gap-2">
                          {postProcessingOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setConfig((c) => ({ ...c, postProcessingLevel: option.value }))}
                              className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                                option.value === config.postProcessingLevel
                                  ? 'border-[#7C5CFF]/35 bg-[#1C3B52]'
                                  : 'border-[#7C5CFF]/10 bg-white/[0.02] hover:border-[#7C5CFF]/10'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className={`text-xs font-medium ${option.value === config.postProcessingLevel ? 'text-white' : 'text-[#0F1B3D]'}`}>{option.label}</div>
                                <div className="text-[10px] uppercase tracking-[0.18em] text-[#7C5CFF]">
                                  {priceBreakdown
                                    ? `₹${getPostProcessingCharge(
                                        option.value,
                                        postProcessingBaseAmount,
                                        selectedMaterial?.difficultyFactor ?? 0,
                                        pricingSettings.postProcessingMultipliers
                                      ).toFixed(2)}`
                                    : '—'}
                                </div>
                              </div>
                              <div className={`mt-0.5 text-[10px] ${option.value === config.postProcessingLevel ? 'text-[#c9d0e7]' : 'text-[#6F7192]'}`}>{option.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Layer Height */}
                      <div>
                        <div className="mb-2 text-sm text-[#6F7192]">Layer Height</div>
                        <div className="grid gap-2">
                          {layerHeightOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setConfig((c) => ({ ...c, layerHeight: option.value }))}
                              className={`rounded-xl border px-3 py-2.5 text-left transition-all ${
                                option.value === config.layerHeight
                                  ? 'border-[#7C5CFF]/35 bg-[#1C3B52]'
                                  : 'border-[#7C5CFF]/10 bg-white/[0.02] hover:border-[#7C5CFF]/10'
                              }`}
                            >
                              <div className={`text-xs font-medium ${option.value === config.layerHeight ? 'text-white' : 'text-[#0F1B3D]'}`}>{option.label}</div>
                              <div className={`mt-0.5 text-[10px] ${option.value === config.layerHeight ? 'text-[#c9d0e7]' : 'text-[#6F7192]'}`}>{option.description}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Save Quote */}
                    {user && (
                      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] p-4">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="h-5 w-5 text-emerald-700" />
                          <div>
                            <div className="text-xs font-medium text-[#0F1B3D]">{user.name}</div>
                            <div className="text-[10px] text-[#6F7192]">{user.email}</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSaveQuote}
                          disabled={!selectedModel || savingQuote || uploadState.status === 'uploading'}
                          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-xs font-medium text-[#0F1B3D] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                <div className="rounded-[24px] border border-[#7C5CFF]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.96))] p-5 sm:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.2)] sm:shadow-[0_18px_70px_rgba(0,0,0,0.3)]">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0F1B3D]">Quote Summary</h2>
                      <p className="text-xs text-[#6F7192]">{initialQuoteId}</p>
                    </div>
                    <div className="rounded-xl border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 p-2 text-[#7C5CFF]">
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
                      <div className="mb-4 rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] p-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#0F1B3D]">{selectedMaterial?.name ?? 'Material'}</span>
                          <span className="text-[#6F7192]">·</span>
                          <span className="text-[#6F7192]">{config.infill}% infill</span>
                          <span className="text-[#6F7192]">·</span>
                          <span className="text-[#6F7192]">{config.layerHeight}mm</span>
                        </div>
                      </div>

                      {/* Price Breakdown */}
                      <div className="rounded-xl border border-[#7C5CFF]/20 bg-[linear-gradient(180deg,rgba(124, 92, 255,0.12),rgba(124, 92, 255,0.06))] p-4">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-[#6F7192]">Total Price</div>
                        <div className="mt-1 font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">
                          ₹{priceBreakdown.priceBeforeDiscount.toFixed(0)}
                        </div>
                        <div className="mt-3 space-y-1.5 text-xs text-[#6F7192]">
                          <div className="flex justify-between">
                            <span>Quantity</span>
                            <span>{priceBreakdown.quantity} pcs</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Material usage</span>
                            <span>{priceBreakdown.materialWeightGrams.toFixed(2)} g</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Material cost</span>
                            <span>₹{priceBreakdown.materialCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Machine time</span>
                            <span>{formatDurationMinutes(priceBreakdown.estimatedMinutes)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Machine cost</span>
                            <span>₹{priceBreakdown.machineCost.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Post-processing</span>
                            <span>₹{priceBreakdown.postProcessingCharges.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-[#7C5CFF]/10 pt-1.5 flex justify-between font-medium text-[#0F1B3D]">
                            <span>Subtotal</span>
                            <span>₹{priceBreakdown.subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Overhead ({priceBreakdown.overheadPercentage}%)</span>
                            <span>₹{priceBreakdown.overheadAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Margin ({priceBreakdown.marginPercentage}%)</span>
                            <span>₹{priceBreakdown.marginAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cart discount</span>
                            <span>{priceBreakdown.cartDiscountPercent}% · {priceBreakdown.cartDiscountAmount > 0 ? '-' : ''}₹{priceBreakdown.cartDiscountAmount.toFixed(2)}</span>
                          </div>
                          <div className="border-t border-[#7C5CFF]/10 pt-1.5 flex justify-between font-medium text-[#0F1B3D]">
                            <span>Total price</span>
                            <span>₹{priceBreakdown.priceBeforeDiscount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Final price</span>
                            <span>₹{priceBreakdown.finalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delivery</span>
                            <span>{priceBreakdown.deliveryCharge === 0 ? 'FREE' : `₹${priceBreakdown.deliveryCharge.toFixed(0)}`}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Grand total</span>
                            <span>₹{priceBreakdown.grandTotal.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Weight</div>
                          <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{priceBreakdown.materialUsageGramsPerUnit.toFixed(2)} g / unit</div>
                        </div>
                        <div className="rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] p-3">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">Print time</div>
                          <div className="mt-1 text-sm font-medium text-[#0F1B3D]">{formatDurationMinutes(priceBreakdown.estimatedMinutes)}</div>
                        </div>
                        <div className="rounded-xl border border-[#7C5CFF]/10 bg-white/[0.02] p-3 col-span-2">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-[#6F7192]">
                            <Cuboid className="h-3 w-3" />
                            Dimensions
                          </div>
                          <div className="mt-1 text-xs text-[#0F1B3D]">
                            {priceBreakdown.dimensionsMm.x.toFixed(0)} × {priceBreakdown.dimensionsMm.y.toFixed(0)} × {priceBreakdown.dimensionsMm.z.toFixed(0)} mm
                          </div>
                        </div>
                      </div>

                      {/* Delivery */}
                      <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-3">
                        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-700">
                          <Truck className="h-3 w-3" />
                          Delivery
                        </div>
                        <div className="mt-1 text-xs font-medium text-[#0F1B3D]">~48 hour print and delivery</div>
                      </div>

                      {/* Actions */}
                      <div className="mt-5 space-y-2.5">
                        <button
                          type="button"
                          onClick={handleAddToCart}
                          disabled={!selectedModel || uploadState.status === 'uploading'}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                            cartItemCheck
                              ? 'border border-emerald-700/30 bg-emerald-700/10 text-emerald-700'
                              : 'bg-[#7C5CFF] text-white hover:opacity-95'
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
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#7C5CFF]/30 bg-[#7C5CFF]/10 px-4 py-2.5 text-xs font-medium text-[#7C5CFF] transition-colors hover:bg-[#7C5CFF]/20"
                          >
                            View Cart
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>

                      {!user && (
                        <Link
                          href="/login?next=%2Finstant-quote"
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#7C5CFF]/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-[#0F1B3D] transition-colors hover:bg-white/[0.07]"
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
}: {
  object: Object3D
}) {
  const clone = useMemo(() => object.clone(true), [object])

  return <primitive object={clone} />
}
