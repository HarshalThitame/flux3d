'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Cpu, Download, Layers2, ReceiptText, Save, Sparkles } from 'lucide-react'
import type { AppUserProfile } from '@/lib/auth/server'
import type { QuoteMaterial } from '@/lib/quote/types'
import FileUpload from '@/components/quote/FileUpload'
import MaterialSelector from '@/components/quote/MaterialSelector'
import ModelViewer from '@/components/quote/ModelViewer'
import Toast, { ToastState } from '@/components/quote/Toast'
import { getMaterialById, layerHeightOptions } from '@/lib/quote/materials'
import { calculateInstantQuote, formatDurationMinutes, postProcessingOptions } from '@/lib/quote/pricing-engine'
import { parseModelFile } from '@/lib/quote/model-utils'
import { saveQuoteToSupabase, uploadFileToSupabaseStorage, validateModelFile } from '@/lib/quote/supabase-storage'
import type { ParsedModel, QuoteConfig, UploadState } from '@/lib/quote/types'

const initialUploadState: UploadState = {
  status: 'idle',
  progress: 0,
}

type QuotePageProps = {
  user: AppUserProfile
  initialQuoteId: string
}

export default function QuotePage({ user, initialQuoteId }: QuotePageProps) {
  const [quoteId] = useState(initialQuoteId)
  const [selectedModel, setSelectedModel] = useState<ParsedModel | null>(null)
  const [config, setConfig] = useState<QuoteConfig>({
    materialId: '',
    color: '',
    infill: 20,
    layerHeight: 0.2,
    quantity: 1,
    postProcessingLevel: 'none',
    supports: false,
  })
  const [materials, setMaterials] = useState<QuoteMaterial[]>([])
  const [toast, setToast] = useState<ToastState>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [viewerLoading, setViewerLoading] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>(initialUploadState)
  const [savingQuote, setSavingQuote] = useState(false)
  const [hasUserSelectedMaterial, setHasUserSelectedMaterial] = useState(false)
  const [contact, setContact] = useState({
    name: user.name,
    email: user.email,
    phone: '',
    notes: '',
  })

  useEffect(() => {
    async function fetchMaterials() {
      try {
        const res = await fetch('/api/materials')
        if (res.ok) {
          const data = await res.json()
          setMaterials(data)
          if (data.length > 0) {
            const defaultMaterial = getMaterialById('pla', data) ?? data[0]
            setConfig(prev => ({
              ...prev,
              materialId: defaultMaterial.id,
              color: defaultMaterial.colors[0]?.name ?? '',
            }))
          }
        }
      } catch {
        // Failed to fetch materials
      }
    }
    fetchMaterials()
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const activeMaterial = useMemo(() => getMaterialById(config.materialId, materials), [config.materialId, materials])
  const priceBreakdown = useMemo(
    () => calculateInstantQuote(selectedModel, config, materials),
    [selectedModel, config, materials]
  )
  const formatMoney = (value: number) => `₹${value.toFixed(2)}`

  const handleFileSelect = async (file: File) => {
    const validationError = validateModelFile(file)
    if (validationError) {
      setFileError(validationError)
      setToast({ type: 'error', message: validationError })
      return
    }

    setFileError(null)
    setViewerLoading(true)
    setUploadState({ status: 'uploading', progress: 0 })

    const [parsedResult, uploadResult] = await Promise.allSettled([
      parseModelFile(file),
      uploadFileToSupabaseStorage(file, user.id, quoteId, (progress) =>
        setUploadState({ status: 'uploading', progress })
      ),
    ])

    if (parsedResult.status === 'fulfilled') {
      setSelectedModel(parsedResult.value)

      if (!hasUserSelectedMaterial) {
        const suggestedMaterial = getMaterialById(parsedResult.value.suggestedMaterialId)
        setConfig((current) => ({
          ...current,
          materialId: suggestedMaterial.id,
          color: suggestedMaterial.colors[0]?.name ?? '',
        }))
        setToast({
          type: 'info',
          message: `Suggested material: ${suggestedMaterial.name} based on your model size.`,
        })
      }
    } else {
      setSelectedModel(null)
      setFileError(parsedResult.reason instanceof Error ? parsedResult.reason.message : 'Could not parse the uploaded model.')
      setToast({
        type: 'error',
        message: parsedResult.reason instanceof Error ? parsedResult.reason.message : 'Could not parse the uploaded model.',
      })
    }

    if (uploadResult.status === 'fulfilled') {
      setUploadState(uploadResult.value)
    } else {
      setUploadState({
        status: 'error',
        progress: 0,
        error: uploadResult.reason instanceof Error ? uploadResult.reason.message : 'Supabase upload failed.',
      })
      setToast({
        type: 'error',
        message: uploadResult.reason instanceof Error ? uploadResult.reason.message : 'Supabase upload failed.',
      })
    }

    setViewerLoading(false)
  }

  const handleMaterialChange = (materialId: string) => {
    const nextMaterial = getMaterialById(materialId)
    setHasUserSelectedMaterial(true)
    setConfig((current) => ({
      ...current,
      materialId,
      color: nextMaterial.colors[0]?.name ?? '',
    }))
  }

  const handleSaveQuote = async () => {
    if (!selectedModel || !priceBreakdown) {
      setToast({ type: 'error', message: 'Upload a model before saving a quote.' })
      return
    }

    if (!contact.name || !contact.email) {
      setToast({ type: 'error', message: 'Name and email are required to save the quote.' })
      return
    }

    try {
      setSavingQuote(true)
      await saveQuoteToSupabase({
        userId: user.id,
        quoteId,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        filePath: uploadState.path,
        config,
        notes: contact.notes,
        estimate: {
          total: priceBreakdown.total,
          estimatedHours: priceBreakdown.estimatedHours,
          dimensions: priceBreakdown.dimensionsMm,
        },
      })
      setToast({ type: 'success', message: `Quote ${quoteId} saved to your account.` })
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save quote.',
      })
    } finally {
      setSavingQuote(false)
    }
  }

  const handleDownloadSummary = () => {
    if (!priceBreakdown || !selectedModel) {
      setToast({ type: 'error', message: 'Upload a model before downloading the quote summary.' })
      return
    }

    const summary = {
      quoteId,
      model: selectedModel.fileName,
      material: activeMaterial.name,
      color: config.color,
      dimensionsMm: priceBreakdown.dimensionsMm,
      estimatedHours: priceBreakdown.estimatedHours,
      total: priceBreakdown.total,
      generatedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${quoteId.toLowerCase()}-summary.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="min-h-screen bg-[#FFFFFF] px-4 pb-16 pt-28 text-[#0F1B3D] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/25 bg-[#7C5CFF]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#A78BFA]">
                <Sparkles className="h-3.5 w-3.5" />
                Instant Quote Engine
              </div>
              <h1 className="mt-5 font-[var(--font-syne)] text-[clamp(2.5rem,5vw,4.8rem)] font-extrabold leading-[0.98] tracking-[-2px] text-[#0F1B3D]">
                Upload a Model, Tune the Print, <span className="text-[#6F7192]">See the Price Live</span>
              </h1>
              <p className="mt-5 max-w-[720px] text-base leading-8 text-[#6F7192]">
                This quote workspace parses your 3D file, previews geometry interactively, and recalculates production pricing instantly as material, quality, infill, and scale change.
              </p>
            </div>

            <div className="rounded-[26px] border border-[#7C5CFF]/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Quote Session</div>
              <div className="mt-2 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">{quoteId}</div>
              <div className="mt-1 text-sm text-[#6F7192]">Supabase storage + live pricing ready</div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.92fr)_340px] xl:items-start">
            <div className="space-y-6 xl:min-w-0">
              <FileUpload
                error={fileError}
                uploadState={uploadState}
                selectedFileName={selectedModel?.fileName}
                onSelectFile={handleFileSelect}
              />

              <ModelViewer
                model={selectedModel}
                isLoading={viewerLoading}
              />
            </div>

            <div className="space-y-6 xl:min-w-0">
              <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/5 p-4 text-sm leading-7 text-[#d2d8ef]">
                <div className="font-medium text-[#0F1B3D]">How to use this quote tool</div>
                <div className="mt-2">
                  Upload the model on the left, change materials and print settings here, and keep an eye on the sticky price rail on the right while the estimate updates instantly.
                </div>
              </div>

              <div className="space-y-6 rounded-[30px] border border-[#7C5CFF]/10 bg-[rgba(255,255,255,0.9)] p-5 backdrop-blur-2xl">
                <MaterialSelector
                  selectedMaterialId={config.materialId}
                  selectedColor={config.color}
                  materials={materials}
                  onMaterialChange={handleMaterialChange}
                  onColorChange={(name) => setConfig((current) => ({ ...current, color: name }))}
                />

                <div className="rounded-[24px] border border-[#7C5CFF]/10 bg-white/[0.03] p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#0F1B3D]">
                    <Layers2 className="h-4 w-4 text-[#7C5CFF]" />
                    Print Settings
                  </div>

                  <div className="space-y-5">
                    <label className="block">
                      <div className="mb-2 flex items-center justify-between text-sm text-[#0F1B3D]">
                        <span>Infill Density</span>
                        <span className="text-[#7C5CFF]">{config.infill}%</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        step={5}
                        value={config.infill}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            infill: Number(event.target.value),
                          }))
                        }
                        className="w-full accent-[#7C5CFF]"
                      />
                    </label>

                    <div>
                      <div className="mb-2 text-sm text-[#0F1B3D]">Layer Height</div>
                      <div className="grid gap-2">
                        {layerHeightOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setConfig((current) => ({
                                ...current,
                                layerHeight: option.value,
                              }))
                            }
                            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                              config.layerHeight === option.value
                                ? 'border-[#7C5CFF]/40 bg-[#1C3B52]'
                                : 'border-[#7C5CFF]/10 bg-white/[0.02] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="text-sm font-medium text-[#0F1B3D]">{option.label}</div>
                            <div className="mt-1 text-xs leading-6 text-[#6F7192]">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>



                    <label className="block">
                      <div className="mb-2 flex items-center justify-between text-sm text-[#0F1B3D]">
                        <span>Quantity</span>
                        <span className="text-[#7C5CFF]">{config.quantity} pcs</span>
                      </div>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        step={1}
                        value={config.quantity}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            quantity: Math.max(1, Math.floor(Number(event.target.value) || 1)),
                          }))
                        }
                        className="w-full rounded-2xl border border-[#7C5CFF]/10 bg-white/[0.02] px-4 py-3 text-sm text-[#0F1B3D] outline-none"
                      />
                    </label>

                    <div>
                      <div className="mb-2 text-sm text-[#0F1B3D]">Post-processing</div>
                      <div className="grid gap-2">
                        {postProcessingOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setConfig((current) => ({
                                ...current,
                                postProcessingLevel: option.value,
                              }))
                            }
                            className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                              config.postProcessingLevel === option.value
                                ? 'border-[#7C5CFF]/40 bg-[#1C3B52]'
                                : 'border-[#7C5CFF]/10 bg-white/[0.02] hover:bg-white/[0.05]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-[#0F1B3D]">{option.label}</div>
                              <div className="text-xs uppercase tracking-[0.18em] text-[#7C5CFF]">
                                {formatMoney(option.cost)}
                              </div>
                            </div>
                            <div className="mt-1 text-xs leading-6 text-[#6F7192]">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                <div className="rounded-[24px] border border-[#7C5CFF]/10 bg-white/[0.03] p-4">
                  <div className="mb-4 flex items-center gap-2 text-sm font-medium text-[#0F1B3D]">
                    <Cpu className="h-4 w-4 text-[#7C5CFF]" />
                    Saved to Your Account
                  </div>
                  <div className="mb-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/8 px-4 py-3 text-sm text-[#d7f8ea]">
                    Signed in as <span className="font-medium text-[#0F1B3D]">{user.email}</span>. Quotes and uploads will be linked to your profile automatically.
                  </div>
                  <div className="grid gap-3">
                    <input
                      value={contact.name}
                      onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Name"
                      className="rounded-xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
                    />
                    <input
                      value={contact.email}
                      onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                      type="email"
                      placeholder="Email"
                      className="rounded-xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
                    />
                    <input
                      value={contact.phone}
                      onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="WhatsApp Number"
                      className="rounded-xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
                    />
                    <textarea
                      value={contact.notes}
                      onChange={(event) => setContact((current) => ({ ...current, notes: event.target.value }))}
                      rows={4}
                      placeholder="Project notes, tolerances, finish requirements..."
                      className="rounded-xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
                    />
                  </div>
                </div>

                <Link
                  href="/pricing"
                  className="inline-flex text-sm font-medium text-[#7C5CFF] hover:text-[#A78BFA]"
                >
                  Compare with pricing guide →
                </Link>
              </div>
            </div>

            <div className="space-y-4 xl:sticky xl:top-24 xl:h-fit">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[30px] border border-[#7C5CFF]/10 bg-[rgba(255,255,255,0.95)] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Live Estimate</div>
                    <div className="mt-1 text-sm text-[#b7bed7]">Always visible while you edit</div>
                  </div>
                  <ReceiptText className="h-5 w-5 text-[#7C5CFF]" />
                </div>

                <div className="rounded-[24px] border border-[#7C5CFF]/20 bg-[#7C5CFF]/8 px-5 py-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#A78BFA]">Estimated Price</div>
                  <div className="mt-3 font-[var(--font-syne)] text-4xl font-extrabold text-[#0F1B3D]">
                    {priceBreakdown ? `₹${priceBreakdown.total.toFixed(0)}` : '—'}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#A78BFA]">
                    Rounded to nearest ₹5
                  </div>
                  <div className="mt-2 text-sm text-[#ffd7c5]">
                    {priceBreakdown
                      ? `${formatDurationMinutes(priceBreakdown.estimatedMinutes)} total · ${priceBreakdown.materialWeightGrams.toFixed(2)}g material`
                      : 'Upload a file to start estimating'}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {[
                    ['Quantity', priceBreakdown ? `${priceBreakdown.quantity} pcs` : '—'],
                    ['Base weight', priceBreakdown ? `${priceBreakdown.baseWeightGrams.toFixed(2)} g` : '—'],
                    ['Infill factor', priceBreakdown ? priceBreakdown.infillMultiplier.toFixed(2) : '—'],
                    ['Material usage / unit', priceBreakdown ? `${priceBreakdown.materialUsageGramsPerUnit.toFixed(2)} g` : '—'],
                    ['Material cost', priceBreakdown ? formatMoney(priceBreakdown.materialCost) : '—'],
                    ['Base print time', priceBreakdown ? `${formatDurationMinutes(priceBreakdown.basePrintTimeMinutesPerUnit)} / unit` : '—'],
                    ['Layer multiplier', priceBreakdown ? `${(0.2 / config.layerHeight).toFixed(2)}x` : '—'],
                    ['Machine cost', priceBreakdown ? formatMoney(priceBreakdown.timeCost) : '—'],
                    ['Post-processing', priceBreakdown ? `${postProcessingOptions.find((option) => option.value === config.postProcessingLevel)?.label ?? 'Basic cleanup'} · ${formatMoney(priceBreakdown.labourCost)}` : '—'],
                    ['Subtotal', priceBreakdown ? formatMoney(priceBreakdown.subtotal) : '—'],
                    ['Overhead (15%)', priceBreakdown ? formatMoney(priceBreakdown.overheadAmount) : '—'],
                    ['Margin (40%)', priceBreakdown ? formatMoney(priceBreakdown.profitMargin) : '—'],
                    ['Quantity discount', priceBreakdown ? `${priceBreakdown.quantityDiscountPercent}% · ${priceBreakdown.quantityDiscountAmount > 0 ? '-' : ''}${formatMoney(priceBreakdown.quantityDiscountAmount)}` : '—'],
                    ['Pre-round total', priceBreakdown ? formatMoney(priceBreakdown.totalBeforeRounding) : '—'],
                    ['Dimensions', priceBreakdown ? `${priceBreakdown.dimensionsMm.x.toFixed(0)} × ${priceBreakdown.dimensionsMm.y.toFixed(0)} × ${priceBreakdown.dimensionsMm.z.toFixed(0)} mm` : '—'],
                    ['Material Type', activeMaterial.name],
                    ['Selected Color', config.color],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-[#7C5CFF]/10 bg-white/[0.03] px-4 py-3">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">{label}</div>
                      <div className="mt-2 text-sm text-[#0F1B3D]">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={handleSaveQuote}
                    disabled={savingQuote}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7C5CFF] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {savingQuote ? 'Saving Quote...' : 'Save Quote to Account'}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSummary}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#7C5CFF]/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#0F1B3D] transition-colors hover:bg-white/[0.06]"
                  >
                    <Download className="h-4 w-4" />
                    Download Quote Summary
                  </button>
                </div>
              </motion.div>

              <div className="rounded-[24px] border border-emerald-400/15 bg-emerald-400/5 p-4 text-sm leading-7 text-[#d2d8ef]">
                <div className="font-medium text-[#0F1B3D]">Advanced guidance</div>
                <div className="mt-2">
                  {selectedModel
                    ? `Based on your uploaded model, ${getMaterialById(selectedModel.suggestedMaterialId).name} is a reasonable starting point. Switch materials to compare finish, strength, and price instantly.`
                    : 'Once a model is uploaded, the system will auto-detect size, estimate build volume, and suggest a starting material.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  )
}
