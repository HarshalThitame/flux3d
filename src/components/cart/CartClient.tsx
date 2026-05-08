'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trash2, ShoppingCart, ArrowRight, Plus, IndianRupee, ChevronDown, Edit2, Check, AlertTriangle, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/cart/context'
import type { AppUserProfile } from '@/lib/auth/server'
import EmptyState from '@/components/admin/EmptyState'
import type { QuoteMaterial } from '@/lib/quote/types'

type CartClientProps = {
  user: AppUserProfile | null
  materials: QuoteMaterial[]
}

type EditingItem = {
  id: string
  addedAt: string
  material?: string
  color?: string
  infill?: number
}

export default function CartClient({ user, materials }: CartClientProps) {
  const router = useRouter()
  const { items, summary, removeItem, updateItem, clearItems, isLoading } = useCart()
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleRemoveItem = (addedAt: string) => {
    removeItem(addedAt)
  }

  const handleClearCart = () => {
    clearItems()
    setShowClearConfirm(false)
  }

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?next=%2Fcart')
      return
    }
    router.push('/cart/delivery')
  }

  const handleEditItem = (item: typeof items[0]) => {
    setEditingItem({
      id: item.id ?? '',
      addedAt: item.addedAt ?? '',
      material: item.config?.materialId ?? item.material ?? '',
      color: item.color ?? '',
      infill: item.infill ?? 20,
    })
  }

  const handleSaveEdit = () => {
    if (!editingItem) return

    const materialId = editingItem.material || editingItem.id
    const selectedMaterial = materials.find((m) => m.id === materialId)
    if (!selectedMaterial) return

    const selectedColor = editingItem.color
      ? selectedMaterial.colors.find((c) => c.name === editingItem.color)
      : selectedMaterial.colors[0]
    if (!selectedColor) return

    const basePrice = items.find((i) => i.addedAt === editingItem.addedAt)?.price ?? 0
    const originalInfill = items.find((i) => i.addedAt === editingItem.addedAt)?.infill ?? 20
    const infillValue = editingItem.infill ?? 20
    const priceAdjustment = (infillValue - originalInfill) / 100 * basePrice * 0.3
    const existingItem = items.find((i) => i.addedAt === editingItem.addedAt)
    const existingConfig = existingItem?.config ?? { materialId: '', color: '', infill: 20, layerHeight: 0.2, quantity: 1, postProcessingLevel: 'sanded' as const, supports: false }

    updateItem(editingItem.addedAt, {
      material: selectedMaterial.name,
      color: selectedColor.name,
      infill: editingItem.infill ?? 20,
      config: {
        ...existingConfig,
        materialId: editingItem.material ?? existingConfig.materialId,
        color: editingItem.color ?? existingConfig.color,
        infill: editingItem.infill ?? existingConfig.infill,
      },
      price: Math.max(0, basePrice + priceAdjustment),
    })

    setEditingItem(null)
  }

  const handleCancelEdit = () => {
    setEditingItem(null)
  }

  const selectedMaterial = useMemo(() => {
    if (!editingItem) return null
    return materials.find((m) => m.id === editingItem.material)
  }, [editingItem, materials])

  const availableColors = useMemo(() => {
    return selectedMaterial?.colors ?? []
  }, [selectedMaterial])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="mx-auto h-12 w-12 animate-pulse text-[#FF5C1A]" />
          <p className="mt-4 text-sm text-[#7a82a0]">Loading your cart...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen px-4 pb-16 pt-28 md:px-8 xl:px-10">
        <div className="mx-auto max-w-[800px]">
          <EmptyState
            title="Your cart is empty"
            description="Add items from the instant quote page to build your cart."
            ctaLabel="Add Items to Cart"
            ctaHref="/instant-quote"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,92,26,0.08),transparent_24%),radial-gradient(circle_at_right,rgba(34,211,238,0.08),transparent_28%),#050810] px-4 pb-16 pt-28 md:px-8 xl:px-10">
      <div className="mx-auto max-w-[1400px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/25 bg-[#FF5C1A]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#FF9A72]">
            Shopping Cart
          </div>
          <h1 className="mt-5 font-[var(--font-syne)] text-[clamp(2rem,4vw,3.5rem)] font-extrabold leading-[0.98] tracking-[-2px] text-white">
            Review Your <span className="text-[#7dd3fc]">Print Items</span>
          </h1>
          <p className="mt-4 max-w-[600px] text-base leading-7 text-[#7a82a0]">
            You have {items.length} item{items.length !== 1 ? 's' : ''} in your cart. Modify settings and proceed to delivery.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {items.map((item, index) => {
              const isEditing = editingItem?.id === item.id && (editingItem?.addedAt ?? '') === (item.addedAt ?? '')
              const currentMaterial = materials.find((m) => m.id === (item.config?.materialId ?? '')) ?? materials.find((m) => m.name === item.material)

              return (
                <motion.div
                  key={`${item.id}-${item.addedAt ?? index}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`rounded-[24px] border bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,22,0.92))] p-5 shadow-[0_12px_50px_rgba(0,0,0,0.25)] transition-colors ${
                    isEditing ? 'border-[#FF5C1A]/40' : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                          <p className="mt-1 text-sm text-[#7a82a0]">Quote: {item.id}</p>
                        </div>
                        <div className="flex gap-2">
                          {!isEditing && (
                            <button
                              type="button"
                              onClick={() => handleEditItem(item)}
                              className="rounded-lg border border-[#7dd3fc]/20 bg-[#7dd3fc]/10 p-2.5 text-[#7dd3fc] transition-colors hover:bg-[#7dd3fc]/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                              aria-label={`Edit ${item.name} settings`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.addedAt ?? '')}
                            className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-2.5 text-rose-400 transition-colors hover:bg-rose-400/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Material</div>
                          {editingItem ? (
                            <select
                              value={editingItem.material}
                              onChange={(e) => {
                                const newMaterial = materials.find((m) => m.id === e.target.value)
                                if (newMaterial) {
                                  setEditingItem({
                                    ...editingItem,
                                    material: newMaterial.id,
                                    color: newMaterial.colors[0]?.name ?? editingItem.color,
                                  })
                                }
                              }}
                              className="mt-1 w-full bg-transparent text-sm font-medium text-white outline-none"
                            >
                              {materials.map((m) => (
                                <option key={m.id} value={m.id} className="bg-[#0d1120]">
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="mt-1 text-sm font-medium text-white">{item.material}</div>
                          )}
                        </div>

                        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Color</div>
                          {editingItem ? (
                            <select
                              value={editingItem.color}
                              onChange={(e) => setEditingItem({ ...editingItem, color: e.target.value })}
                              className="mt-1 w-full bg-transparent text-sm font-medium text-white outline-none"
                            >
                              {availableColors.map((c) => (
                                <option key={c.name} value={c.name} className="bg-[#0d1120]">
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="mt-1 text-sm font-medium text-white">
                              {item.color}
                            </div>
                          )}
                        </div>

                        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Infill</div>
                          {editingItem ? (
                            <select
                              value={editingItem.infill}
                              onChange={(e) => setEditingItem({ ...editingItem, infill: Number(e.target.value) })}
                              className="mt-1 w-full bg-transparent text-sm font-medium text-white outline-none"
                            >
                              {[10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100].map((val) => (
                                <option key={val} value={val} className="bg-[#0d1120]">
                                  {val}%
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="mt-1 text-sm font-medium text-white">{item.infill}%</div>
                          )}
                        </div>

                        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Layer Height</div>
                          <div className="mt-1 text-sm font-medium text-white">{item.layerHeight} mm</div>
                        </div>

                        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Weight</div>
                          <div className="mt-1 text-sm font-medium text-white">{(item.weight ?? 0).toFixed(1)} g</div>
                        </div>

                        <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[#7a82a0]">Print Time</div>
                           <div className="mt-1 text-sm font-medium text-white">{(item.estimatedTime ?? 0).toFixed(1)} hr</div>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="mt-4 flex gap-3">
                          <button
                            type="button"
                            onClick={handleSaveEdit}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#FF5C1A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-95"
                          >
                            <Check className="h-4 w-4" />
                            Save Changes
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#7a82a0]">
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1">
                          {(item.dimensions?.x ?? 0).toFixed(0)} × {(item.dimensions?.y ?? 0).toFixed(0)} × {(item.dimensions?.z ?? 0).toFixed(0)} mm
                        </span>
                        {item.supports && (
                          <span className="rounded-full border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 px-2 py-1 text-[#FF9A72]">
                            Supports included
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 md:w-40">
                      <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Price</div>
                      <div className="font-[var(--font-syne)] text-3xl font-bold text-white">
                        ₹{item.price.toFixed(0)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.98),rgba(6,10,20,0.96))] p-5 md:p-6 shadow-[0_18px_70px_rgba(0,0,0,0.3)]"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-[var(--font-syne)] text-xl font-bold text-white">
                  Order Summary
                </h2>
                <p className="mt-1 text-sm text-[#97a1c2]">
                  Before delivery
                </p>
              </div>
              <div className="rounded-xl border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 p-2.5 text-[#FF9A72]">
                <IndianRupee className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-3 rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#aeb8d8]">Items ({summary.itemCount})</span>
                <span className="font-medium text-white">₹{summary.subtotal.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#aeb8d8]">Delivery</span>
                <span className="font-medium text-white">
                  {summary.deliveryCharge === 0 ? 'FREE' : `₹${summary.deliveryCharge.toFixed(0)}`}
                </span>
              </div>
              <div className="border-t border-white/8 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">Total</span>
                  <span className="font-[var(--font-syne)] text-3xl font-bold text-white">
                    ₹{summary.total.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleCheckout}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#FF5C1A] px-4 py-4 text-sm font-semibold text-white transition-all hover:translate-y-[-1px] hover:opacity-95 min-h-[52px]"
              >
                Proceed to Delivery
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex w-full items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-3.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.07] min-h-[48px]"
              >
                Clear Cart
              </button>
              <Link
                href="/instant-quote"
                className="inline-flex w-full items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-transparent px-4 py-3.5 text-sm font-medium text-[#7dd3fc] transition-colors hover:border-[#7dd3fc]/30 min-h-[48px]"
              >
                <Plus className="h-4 w-4" />
                Add More Items
              </Link>
            </div>
          </motion.aside>
        </div>
      </div>

      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.98),rgba(6,10,20,0.96))] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            >
              <div className="relative p-6 pb-0">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="absolute right-4 top-4 rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-[#7a82a0] transition-colors hover:bg-white/[0.07] hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-400/20 bg-rose-400/10">
                  <AlertTriangle className="h-7 w-7 text-rose-400" />
                </div>

                <h3 className="text-center text-xl font-semibold text-white">Clear Your Cart?</h3>
                <p className="mt-2 text-center text-sm leading-6 text-[#7a82a0]">
                  This will remove all <span className="font-medium text-white">{items.length} item{items.length !== 1 ? 's' : ''}</span> from your cart. This action cannot be undone.
                </p>
              </div>

              <div className="mt-5 flex gap-3 border-t border-white/8 p-4">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
                >
                  Keep Items
                </button>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="flex-1 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-rose-500/90"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
