'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone,
  Loader2,
  IndianRupee,
  Tag,
  Eye,
  Target,
  MapPin,
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ImageIcon,
} from 'lucide-react'

type ProductPreview = {
  id: string
  name: string
  slug: string
  price: number
  imageUrl: string | null
  skuCode: string
}

type CreateCampaignFormProps = {
  onSuccess: (data: Record<string, unknown>) => void
  onError: (message: string) => void
}

export default function CreateCampaignForm({ onSuccess, onError }: CreateCampaignFormProps) {
  const [step, setStep] = useState(1)
  const [categoryName, setCategoryName] = useState('3D Printed Home Decor')
  const [dailyBudget, setDailyBudget] = useState(150)
  const [createDpa, setCreateDpa] = useState(true)
  const [pageId, setPageId] = useState('')
  const [products, setProducts] = useState<ProductPreview[]>([])
  const [productsLoading, setProductsLoading] = useState(() => false)
  const [creating, setCreating] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)

  const shouldLoadProducts = step === 2 && products.length === 0 && !productsLoading

  useEffect(() => {
    if (!shouldLoadProducts) return
    let cancelled = false

    fetch(`/api/3d-shop/products?search=${encodeURIComponent(categoryName)}&limit=10&sort=newest`)
      .then((res) => res.json())
      .then((data: { products: Array<Record<string, unknown>> }) => {
        if (cancelled) return
        const previews: ProductPreview[] = []
        for (const product of data.products ?? []) {
          const p = product as Record<string, unknown>
          const skus = (p.skus ?? []) as Array<Record<string, unknown>>
          const firstSku = skus.find((s) => s.is_available)
          if (!firstSku) continue

          previews.push({
            id: String(p.id),
            name: String(p.name),
            slug: String(p.slug),
            price: Number(firstSku.price || p.base_price || 0),
            imageUrl: String(firstSku.variant_image_url || p.thumbnail_url || ''),
            skuCode: String(firstSku.sku_code),
          })

          if (previews.length >= 6) break
        }
        setProducts(previews)
      })
      .catch(() => {
        if (!cancelled) setProducts([])
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false)
      })

    return () => { cancelled = true }
  }, [shouldLoadProducts, categoryName])

  async function handleCreate() {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName,
          dailyBudgetPaise: dailyBudget * 100,
          createDpa,
          pageId: pageId || undefined,
        }),
      })

      const data = (await res.json()) as Record<string, unknown>

      if (!res.ok) {
        throw new Error((data.error as string) ?? 'Creation failed')
      }

      onSuccess(data)
      setStep(1)
      setCategoryName('3D Printed Home Decor')
      setDailyBudget(150)
      setCreateDpa(true)
      setPageId('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Creation failed')
    } finally {
      setCreating(false)
    }
  }

  const steps = [
    { number: 1, label: 'Configure', icon: Target },
    { number: 2, label: 'Preview', icon: ImageIcon },
    { number: 3, label: 'Audience', icon: Users },
    { number: 4, label: 'Launch', icon: Sparkles },
  ]

  const canProceed =
    step === 1
      ? categoryName.trim().length > 0 && dailyBudget >= 50
      : step === 2
        ? products.length > 0
        : true

  return (
    <div className="rounded-2xl border border-[rgba(109,40,217,0.15)] bg-white p-6">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => {
          const Icon = s.icon
          const isActive = step === s.number
          const isCompleted = step > s.number
          return (
            <div key={s.number} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#6d28d9] text-white'
                    : isCompleted
                      ? 'bg-[#6d28d9]/10 text-[#6d28d9]'
                      : 'bg-gray-100 text-[#6F7192]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-[#6F7192]" />
              )}
            </div>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Configure */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-[#0F1B3D] flex items-center gap-2">
              <Target className="w-5 h-5 text-[#6d28d9]" />
              Campaign Configuration
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-[#6F7192] mb-1.5">
                  Product Category
                </label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
                  <input
                    type="text"
                    value={categoryName}
                    onChange={(e) => setCategoryName(e.target.value)}
                    placeholder="e.g. 3D Printed Home Decor"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109,40,217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6F7192] mb-1.5">
                  Daily Budget (₹)
                </label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
                  <input
                    type="number"
                    min={50}
                    max={50000}
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109,40,217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#6F7192] mb-1.5">
                  Facebook Page ID
                </label>
                <div className="relative">
                  <Eye className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6F7192]" />
                  <input
                    type="text"
                    value={pageId}
                    onChange={(e) => setPageId(e.target.value)}
                    placeholder="Optional — falls back to META_PAGE_ID"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[rgba(109,40,217,0.2)] bg-white text-sm text-[#0F1B3D] outline-none focus:border-[#6d28d9] transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createDpa}
                    onChange={(e) => setCreateDpa(e.target.checked)}
                    className="w-4 h-4 rounded border-[rgba(109,40,217,0.3)] text-[#6d28d9] focus:ring-[#6d28d9]"
                  />
                  <span className="text-sm text-[#0F1B3D]">Also create DPA retargeting</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Product Preview */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-[#0F1B3D] flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-[#6d28d9]" />
              Product Preview
            </h2>
            <p className="text-sm text-[#6F7192]">
              These products from <strong>&ldquo;{categoryName}&rdquo;</strong> will be featured in your carousel ad.
            </p>

            {productsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#6d28d9] animate-spin" />
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12 rounded-xl border border-dashed border-[rgba(109,40,217,0.2)] bg-gray-50">
                <ImageIcon className="mx-auto w-12 h-12 text-[#6F7192] mb-3" />
                <p className="text-[#6F7192]">No products found in this category</p>
                <p className="text-xs text-[#6F7192] mt-1">
                  Try a different category name or add products first.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {products.map((product, index) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`rounded-xl border overflow-hidden transition-all ${
                        previewIndex === index
                          ? 'border-[#6d28d9] ring-2 ring-[#6d28d9]/20'
                          : 'border-gray-200 hover:border-[rgba(109,40,217,0.3)]'
                      }`}
                      onClick={() => setPreviewIndex(index)}
                    >
                      <div className="aspect-square bg-gray-100 relative">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6F7192]">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="text-xs font-medium text-[#0F1B3D] truncate">{product.name}</div>
                        <div className="text-xs text-[#6d28d9] mt-0.5">
                          ₹{Math.round(product.price).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {products[previewIndex] && (
                  <div className="rounded-xl border border-[rgba(109,40,217,0.15)] bg-gray-50 p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0">
                        {products[previewIndex].imageUrl ? (
                          <img
                            src={products[previewIndex].imageUrl}
                            alt={products[previewIndex].name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6F7192]">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-[#0F1B3D]">{products[previewIndex].name}</div>
                        <div className="text-sm text-[#6d28d9] mt-0.5">
                          ₹{Math.round(products[previewIndex].price).toLocaleString('en-IN')}
                        </div>
                        <div className="text-xs text-[#6F7192] mt-1">
                          SKU: {products[previewIndex].skuCode}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Step 3: Audience Summary */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-[#0F1B3D] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6d28d9]" />
              Audience & Targeting
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-[rgba(109,40,217,0.12)] bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#0F1B3D] mb-2">
                  <MapPin className="w-4 h-4 text-[#6d28d9]" />
                  Location
                </div>
                <div className="text-sm text-[#6F7192]">India — all states</div>
                <div className="text-xs text-[#6F7192] mt-1">Home + Recent location</div>
              </div>

              <div className="rounded-xl border border-[rgba(109,40,217,0.12)] bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#0F1B3D] mb-2">
                  <Users className="w-4 h-4 text-[#6d28d9]" />
                  Demographics
                </div>
                <div className="text-sm text-[#6F7192]">Ages 25 — 55</div>
                <div className="text-xs text-[#6F7192] mt-1">All genders</div>
              </div>

              <div className="rounded-xl border border-[rgba(109,40,217,0.12)] bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#0F1B3D] mb-2">
                  <Target className="w-4 h-4 text-[#6d28d9]" />
                  Interests
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Home Decor', 'Interior Design', 'Office Supplies', 'Corporate Gifts', 'Small Business'].map(
                    (interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-[#6d28d9] bg-[rgba(109,40,217,0.1)] border border-[rgba(109,40,217,0.15)]"
                      >
                        {interest}
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[rgba(109,40,217,0.12)] bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#0F1B3D] mb-2">
                  <Megaphone className="w-4 h-4 text-[#6d28d9]" />
                  Placements
                </div>
                <div className="text-sm text-[#6F7192]">Facebook + Instagram</div>
                <div className="text-xs text-[#6F7192] mt-1">Feed, Stories, Reels, Marketplace</div>
              </div>

              <div className="rounded-xl border border-[rgba(109,40,217,0.12)] bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#0F1B3D] mb-2">
                  <IndianRupee className="w-4 h-4 text-[#6d28d9]" />
                  Budget
                </div>
                <div className="text-sm text-[#6F7192]">₹{dailyBudget}/day</div>
                <div className="text-xs text-[#6F7192] mt-1">Optimized for Purchases</div>
              </div>

              <div className="rounded-xl border border-[rgba(109,40,217,0.12)] bg-gray-50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-[#0F1B3D] mb-2">
                  <Sparkles className="w-4 h-4 text-[#6d28d9]" />
                  Objective
                </div>
                <div className="text-sm text-[#6F7192]">Sales (OUTCOME_SALES)</div>
                <div className="text-xs text-[#6F7192] mt-1">Conversion optimization</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 4: Launch */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-semibold text-[#0F1B3D] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#6d28d9]" />
              Ready to Launch
            </h2>

            <div className="rounded-xl border border-[rgba(109,40,217,0.15)] bg-gray-50 p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6F7192]">Category</span>
                <span className="font-medium text-[#0F1B3D]">{categoryName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6F7192]">Daily Budget</span>
                <span className="font-medium text-[#0F1B3D]">₹{dailyBudget}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6F7192]">Products</span>
                <span className="font-medium text-[#0F1B3D]">{products.length} items</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6F7192]">DPA Retargeting</span>
                <span className="font-medium text-[#0F1B3D]">{createDpa ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6F7192]">Status</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)]">
                  Will be created PAUSED
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="inline-flex items-center gap-2 bg-[#6d28d9] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#4c1d95] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating…
                  </>
                ) : (
                  <>
                    <Megaphone className="w-4 h-4" />
                    Create Campaign
                  </>
                )}
              </button>
              <span className="text-xs text-[#6F7192]">
                You&apos;ll publish it manually in Meta Ads Manager when ready.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-[#6F7192] hover:bg-gray-100 transition-all disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          {step < 4 && (
            <button
              onClick={() => setStep((s) => Math.min(4, s + 1))}
              disabled={!canProceed}
              className="inline-flex items-center gap-1 bg-[#6d28d9] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#4c1d95] transition-all disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
