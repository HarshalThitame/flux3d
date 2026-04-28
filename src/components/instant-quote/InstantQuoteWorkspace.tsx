'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { AppUserProfile } from '@/lib/auth/server'
import MaterialPanel from '@/components/instant-quote/MaterialPanel'
import QuoteSummary from '@/components/instant-quote/QuoteSummary'
import SettingsPanel from '@/components/instant-quote/SettingsPanel'
import UploadSection from '@/components/instant-quote/UploadSection'
import ViewerSection from '@/components/instant-quote/ViewerSection'
import Toast, { type ToastState } from '@/components/quote/Toast'
import {
  calculateOrderTotal,
  ORDER_DRAFT_STORAGE_KEY,
  type OrderDraft,
} from '@/lib/orders'
import { getMaterialById, quoteMaterials } from '@/lib/quote/materials'
import { parseModelFile } from '@/lib/quote/model-utils'
import { calculateInstantQuote } from '@/lib/quote/pricing-engine'
import { saveQuoteToSupabase, uploadFileToSupabaseStorage, validateModelFile } from '@/lib/quote/supabase-storage'
import { hasSupabaseConfig } from '@/lib/supabase/config'
import type { ParsedModel, QuoteConfig, UploadState } from '@/lib/quote/types'

const initialUploadState: UploadState = {
  status: 'idle',
  progress: 0,
}

type InstantQuoteWorkspaceProps = {
  user: AppUserProfile | null
  initialQuoteId: string
}

export default function InstantQuoteWorkspace({
  user,
  initialQuoteId,
}: InstantQuoteWorkspaceProps) {
  const router = useRouter()
  const supabaseEnabled = hasSupabaseConfig()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedModel, setSelectedModel] = useState<ParsedModel | null>(null)
  const [config, setConfig] = useState<QuoteConfig>({
    materialId: quoteMaterials[0].id,
    colorHex: quoteMaterials[0].colors[0].hex,
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
  const [orderNotes, setOrderNotes] = useState('')

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const priceBreakdown = useMemo(
    () => calculateInstantQuote(selectedModel, config),
    [selectedModel, config]
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
        const suggestedMaterial = getMaterialById(parsedModel.suggestedMaterialId)
        setConfig((current) => ({
          ...current,
          materialId: suggestedMaterial.id,
          colorHex: suggestedMaterial.colors[0].hex,
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
    const nextMaterial = getMaterialById(materialId)
    setHasUserSelectedMaterial(true)
    setConfig((current) => ({
      ...current,
      materialId,
      colorHex: nextMaterial.colors[0].hex,
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

  const handleOrderPrint = async () => {
    if (!priceBreakdown || !selectedModel) {
      setToast({ type: 'error', message: 'Upload a model and generate a quote before ordering.' })
      return
    }

    if (!user) {
      router.push('/login?next=%2Finstant-quote')
      return
    }

    if (!supabaseEnabled) {
      setToast({
        type: 'error',
        message: 'Supabase is not configured. Ordering is unavailable until storage and database are connected.',
      })
      return
    }
    let filePath = uploadState.path
    if (!filePath) {
      if (!selectedFile) {
        setToast({ type: 'error', message: 'Please upload your model again before placing the order.' })
        return
      }

      try {
        setUploadState({ status: 'uploading', progress: 0 })
        const uploadResult = await uploadFileToSupabaseStorage(
          selectedFile,
          user.id,
          initialQuoteId,
          (progress) => setUploadState({ status: 'uploading', progress })
        )
        setUploadState(uploadResult)
        filePath = uploadResult.path
      } catch (error) {
        setToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to sync the uploaded file.',
        })
        return
      }
    }

    if (!filePath) {
      setToast({ type: 'error', message: 'Your model upload could not be linked to this order.' })
      return
    }

    const material = getMaterialById(config.materialId)
    const selectedColor =
      material.colors.find((color) => color.hex === config.colorHex)?.name ?? config.colorHex

    const draft: OrderDraft = {
      quoteId: initialQuoteId,
      fileUrl: filePath,
      material: material.name,
      color: selectedColor,
      infill: config.infill,
      layerHeight: config.layerHeight,
      supports: config.supports,
      price: priceBreakdown.total,
      estimatedTime: priceBreakdown.estimatedHours,
      notes: orderNotes,
    }

    window.sessionStorage.setItem(ORDER_DRAFT_STORAGE_KEY, JSON.stringify(draft))
    router.push('/instant-quote/delivery')
  }

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,92,26,0.08),transparent_24%),radial-gradient(circle_at_right,rgba(34,211,238,0.08),transparent_28%),#050810] px-4 pb-16 pt-28 text-[#e8eaf0] md:px-8 xl:px-10">
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
        <div className="mx-auto max-w-[1500px]">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"
          >
            <div className="max-w-[760px]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.35 }}
                className="inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/25 bg-[#FF5C1A]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#FF9A72]"
              >
                Instant Pricing Experience
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.45 }}
                className="mt-5 font-[var(--font-syne)] text-[clamp(2.3rem,5vw,4.8rem)] font-extrabold leading-[0.98] tracking-[-2px] text-white"
              >
                Turn Your 3D Model Into a <span className="text-[#7dd3fc]">Ready-to-Print Quote in Seconds</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16, duration: 0.45 }}
                className="mt-5 max-w-[720px] text-base leading-8 text-[#7a82a0]"
              >
                Upload your design, watch it come alive in 3D, and unlock a fast, high-confidence estimate built for prototypes, production parts, and serious makers who want clarity before checkout.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.18, duration: 0.4 }}
              whileHover={{ y: -3 }}
              className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl"
            >
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Quote Session</div>
              <div className="mt-2 font-[var(--font-syne)] text-2xl font-bold text-white">{initialQuoteId}</div>
              <div className="mt-1 text-sm text-[#7a82a0]">
                {user
                  ? `Signed in as ${user.email}`
                  : supabaseEnabled
                    ? 'Live preview active, account sync available anytime'
                    : 'Fast local preview mode is active'}
              </div>
            </motion.div>
          </motion.div>

          <div className="grid gap-6 xl:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <UploadSection
                error={fileError}
                isSignedIn={Boolean(user)}
                selectedFileName={selectedModel?.fileName}
                uploadState={uploadState}
                onSelectFile={handleFileSelect}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <ViewerSection
                model={selectedModel}
                scalePercent={config.scalePercent}
                isLoading={viewerLoading}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="grid min-h-[620px] gap-4 md:grid-cols-2"
            >
              <MaterialPanel
                variant="material"
                selectedMaterialId={config.materialId}
                onMaterialChange={handleMaterialChange}
              />
              <MaterialPanel
                variant="color"
                selectedMaterialId={config.materialId}
                selectedColorHex={config.colorHex}
                onColorChange={(hex) => setConfig((current) => ({ ...current, colorHex: hex }))}
              />
              <SettingsPanel
                variant="settings"
                infill={config.infill}
                layerHeight={config.layerHeight}
                supports={config.supports}
                scalePercent={config.scalePercent}
                onInfillChange={(value) => setConfig((current) => ({ ...current, infill: value }))}
                onLayerHeightChange={(value) =>
                  setConfig((current) => ({ ...current, layerHeight: value }))
                }
                onSupportsChange={(value) => setConfig((current) => ({ ...current, supports: value }))}
                onScaleChange={(value) =>
                  setConfig((current) => ({ ...current, scalePercent: value }))
                }
              />
              <SettingsPanel
                variant="account"
                isSignedIn={Boolean(user)}
                userName={user?.name}
                userEmail={user?.email}
                isSaving={savingQuote}
                canSave={Boolean(selectedModel && priceBreakdown)}
                onSaveQuote={handleSaveQuote}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <QuoteSummary
                materialId={config.materialId}
                quoteId={initialQuoteId}
                priceBreakdown={priceBreakdown}
                isSignedIn={Boolean(user)}
                canOrder={Boolean(priceBreakdown && selectedModel)}
                isSubmittingOrder={uploadState.status === 'uploading'}
                orderNotes={orderNotes}
                deliveryCharge={deliveryPricing.deliveryCharge}
                totalPrice={deliveryPricing.totalPrice}
                onOrderNotesChange={setOrderNotes}
                onOrderPrint={handleOrderPrint}
              />
            </motion.div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  )
}
