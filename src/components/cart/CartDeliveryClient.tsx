'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, PackageCheck, Truck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createCartOrderAction } from '@/app/cart/delivery/actions'
import AddressForm from '@/components/instant-quote/AddressForm'
import Toast, { type ToastState } from '@/components/quote/Toast'
import { useCart } from '@/lib/cart/context'
import type { AppUserProfile } from '@/lib/auth/server'
import { normalizeOwnedStoragePath } from '@/lib/quote/storage-path'
import { getCartFromStorage, getCartStorageKey } from '@/lib/cart/utils'
import type { CartItem } from '@/lib/cart/types'
import {
  addressesEqual,
  formatAddressSummary,
  initialAddressFields,
  validateAddressFields,
  type AddressFieldErrors,
  type AddressFields,
  type SavedAddress,
} from '@/lib/orders'

type CartDeliveryClientProps = {
  user: AppUserProfile
  savedAddresses: SavedAddress[]
}

export default function CartDeliveryClient({
  user,
  savedAddresses,
}: CartDeliveryClientProps) {
  const router = useRouter()
  const { items, summary, clearItems } = useCart()
  const [localItems] = useState<CartItem[]>(() => {
    const key = getCartStorageKey(user.id)
    return getCartFromStorage(key)
  })
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>(
    savedAddresses[0]?.id ?? 'new'
  )
  const [address, setAddress] = useState<AddressFields>(
    savedAddresses[0]
      ? {
          fullName: savedAddresses[0].fullName,
          phone: savedAddresses[0].phone,
          addressLine1: savedAddresses[0].addressLine1,
          addressLine2: savedAddresses[0].addressLine2,
          city: savedAddresses[0].city,
          state: savedAddresses[0].state,
          pincode: savedAddresses[0].pincode,
          landmark: savedAddresses[0].landmark,
        }
      : initialAddressFields
  )
  const [errors, setErrors] = useState<AddressFieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<ToastState>(null)
  const [confirmation, setConfirmation] = useState<{
    orderId: string
    orderNumber: string
    itemCount: number
    totalPrice: number
  } | null>(null)

  useEffect(() => {
    if (confirmation) {
      const orderData = {
        orderId: confirmation.orderId,
        orderNumber: confirmation.orderNumber,
        itemCount: confirmation.itemCount,
      }
      sessionStorage.setItem('flux3d-order-success', JSON.stringify(orderData))
      router.push('/order-success')
    }
  }, [confirmation, router])
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lastLookupPincode, setLastLookupPincode] = useState(savedAddresses[0]?.pincode ?? '')

  const payableTotal = summary.grandTotal
  const itemsTotal = summary.itemsTotal
  const cartDiscountPercent = Math.round(summary.cartDiscountPercent)

  useEffect(() => {
    if (localItems.length === 0 && !confirmation) {
      router.replace('/cart')
    }
  }, [localItems, confirmation, router])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer = window.setTimeout(() => setToast(null), 3200)
    return () => window.clearTimeout(timer)
  }, [toast])

  const handleAddressChange = (field: keyof AddressFields, value: string) => {
    setAddress((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))

    const matchingAddress = savedAddresses.find((savedAddress) =>
      addressesEqual(
        {
          ...address,
          [field]: value,
        },
        savedAddress
      )
    )
    setSelectedAddressId(matchingAddress?.id ?? 'new')
  }

  const handleSavedAddressSelect = (savedAddress: SavedAddress) => {
    setSelectedAddressId(savedAddress.id)
    setLastLookupPincode(savedAddress.pincode)
    setErrors({})
    setAddress({
      fullName: savedAddress.fullName,
      phone: savedAddress.phone,
      addressLine1: savedAddress.addressLine1,
      addressLine2: savedAddress.addressLine2,
      city: savedAddress.city,
      state: savedAddress.state,
      pincode: savedAddress.pincode,
      landmark: savedAddress.landmark,
    })
  }

  const lookupPincode = useCallback(async (pincode: string) => {
    if (!/^\d{6}$/.test(pincode)) {
      return
    }

    try {
      setLookupLoading(true)
      const response = await fetch(`/api/pincode/${pincode}`)
      if (!response.ok) {
        throw new Error('Could not fetch city and state for this pincode.')
      }

      const result = (await response.json()) as { city: string; state: string }
      setAddress((current) => ({
        ...current,
        city: result.city,
        state: result.state,
      }))
      setLastLookupPincode(pincode)
      setErrors((current) => ({ ...current, city: undefined, state: undefined, pincode: undefined }))
    } catch (error) {
      setToast({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Could not fetch city and state for this pincode.',
      })
    } finally {
      setLookupLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedAddressId !== 'new') {
      return
    }

    const pincode = address.pincode.trim()
    if (!/^\d{6}$/.test(pincode) || pincode === lastLookupPincode) {
      return
    }

    const timer = window.setTimeout(() => {
      void lookupPincode(pincode)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [address.pincode, lastLookupPincode, lookupPincode, selectedAddressId])

  const handleSubmitOrder = async () => {
    if (items.length === 0) {
      setToast({ type: 'error', message: 'Your cart is empty. Add items before ordering.' })
      return
    }

    try {
      items.forEach((item) => {
        normalizeOwnedStoragePath(item.fileUrl ?? '', user.id)
      })
    } catch (error) {
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'One or more cart items has an invalid file upload. Re-open the quote and upload the model again.',
      })
      return
    }

    const validationErrors = validateAddressFields(address)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      setToast({ type: 'error', message: 'Please complete the delivery address.' })
      return
    }

    try {
      setSubmitting(true)
      const result = await createCartOrderAction({
        items: items.map((item) => ({
          quoteId: item.quoteId ?? item.id ?? '',
          fileUrl: item.fileUrl ?? '',
          fileName: item.fileName ?? item.name ?? '',
          material: item.material ?? '',
          color: item.color ?? '',
          quantity: item.quantity ?? 1,
          infill: item.infill ?? 20,
          layerHeight: item.layerHeight ?? 0.2,
          postProcessingLevel: item.config?.postProcessingLevel ?? 'none',
          supports: item.supports ?? false,
          materialCost: item.materialCost ?? 0,
          machineCost: item.machineCost ?? 0,
          subtotal: item.subtotal ?? item.price ?? 0,
          postProcessingCharges: item.postProcessingCharges ?? 0,
          overheadPercentage: item.overheadPercentage ?? 0,
          overheadAmount: item.overheadAmount ?? 0,
          marginPercentage: item.marginPercentage ?? 0,
          marginAmount: item.marginAmount ?? 0,
          totalPrice: item.totalPrice ?? item.price ?? 0,
          cartDiscountAmount: item.cartDiscountAmount ?? 0,
          cartDiscountPercent: item.cartDiscountPercent ?? 0,
          finalPrice: item.finalPrice ?? item.totalPrice ?? item.price ?? 0,
          deliveryCharge: item.deliveryCharge ?? 0,
          grandTotal: item.grandTotal ?? (item.finalPrice ?? item.totalPrice ?? item.price ?? 0) + (item.deliveryCharge ?? 0),
          price: item.price ?? 0,
	          estimatedTime: item.estimatedTime ?? 0,
	          weight: item.weight ?? 0,
	          difficultyFactor: item.difficultyFactor ?? 1,
	          dimensions: item.dimensions ?? { x: 0, y: 0, z: 0 },
        })),
        subtotal: summary.itemsTotal,
        itemsTotal: summary.itemsTotal,
        cartDiscountAmount: summary.cartDiscountAmount,
        cartDiscountPercent: summary.cartDiscountPercent,
        couponDiscountAmount: summary.couponDiscountAmount,
        couponCode: summary.couponCode,
        couponId: summary.couponId,
        couponDiscountType: summary.couponDiscountType,
        offerId: summary.offerId,
        offerDiscountAmount: summary.offerDiscountAmount,
        offerName: summary.offerName,
        offerCode: summary.offerCode,
        offerDiscountType: summary.offerDiscountType,
        discount: summary.discount,
        finalPrice: summary.finalPrice,
        deliveryCharge: summary.deliveryCharge,
        grandTotal: summary.grandTotal,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
      })

      setConfirmation({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        itemCount: result.itemCount,
        totalPrice: payableTotal,
      })
      clearItems()
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit your order.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (localItems.length === 0 && !confirmation) {
    return null
  }

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(109, 40, 217,0.08),transparent_24%),radial-gradient(circle_at_right,rgba(168, 85, 247,0.08),transparent_28%),#FFFFFF] px-4 pb-16 pt-8 text-[#0F1B3D] md:px-8 md:pt-10 xl:px-10">
        <div className="mx-auto max-w-[1500px]">
          <Link
            href="/cart"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6d28d9] transition-colors hover:text-[#0F1B3D]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Link>

          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/25 bg-[#6d28d9]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#6d28d9]">
                Cart Delivery
              </div>
              <h1 className="mt-5 font-[var(--font-syne)] text-[clamp(2.3rem,5vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-2px] text-[#0F1B3D]">
                Confirm Delivery for <span className="text-[#6d28d9]">{items.length} Item{items.length !== 1 ? 's' : ''}</span>
              </h1>
              <p className="mt-5 max-w-[720px] text-base leading-8 text-[#6F7192]">
                Review your cart items, choose a saved address or add a new one, and we will calculate shipping automatically before your order is sent.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#6d28d9]/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Signed in</div>
              <div className="mt-2 font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">{user.name}</div>
              <div className="mt-1 text-sm text-[#6F7192]">{user.email}</div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              {savedAddresses.length > 0 ? (
                <motion.section
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-[28px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                        Saved Addresses
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#6F7192]">
                        Use an existing delivery address or switch to a new one.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#6d28d9]/20 bg-[#6d28d9]/10 p-3 text-[#6d28d9]">
                      <MapPin className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {savedAddresses.map((savedAddress) => {
                      const summaryText = formatAddressSummary(savedAddress)

                      return (
                        <button
                          key={savedAddress.id}
                          type="button"
                          onClick={() => handleSavedAddressSelect(savedAddress)}
                          className={`rounded-[22px] border p-4 text-left transition ${
                            selectedAddressId === savedAddress.id
                              ? 'border-[#6d28d9] bg-[#6d28d9]/12'
                              : 'border-[#6d28d9]/10 bg-white/[0.02] hover:border-[#6d28d9]/10 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="text-sm font-semibold text-[#0F1B3D]">{savedAddress.fullName}</div>
                          <div className="mt-1 text-sm text-[#6F7192]">{savedAddress.phone}</div>
                          <div className="mt-3 space-y-1 text-xs leading-6 text-[#6F7192]">
                            {summaryText.map((line) => (
                              <div key={line}>{line}</div>
                            ))}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAddressId('new')
                      setLastLookupPincode('')
                      setAddress(initialAddressFields)
                    }}
                    className="mt-4 text-sm font-medium text-[#6d28d9]"
                  >
                    Use a new address
                  </button>
                </motion.section>
              ) : null}

              <AddressForm values={address} errors={errors} onChange={handleAddressChange} />

              <div className="text-sm text-[#6F7192]">
                {lookupLoading
                  ? 'Fetching city and state from your pincode...'
                  : 'City and state will auto-fill after you enter a valid 6-digit pincode.'}
              </div>
            </div>

            <motion.aside
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="h-fit rounded-[28px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.96))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.3)]"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">
                    Order Summary
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#6F7192]">
                    Final review before your {items.length} item{items.length !== 1 ? 's are' : ' is'} submitted.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#6d28d9]/20 bg-[#6d28d9]/10 p-3 text-[#6d28d9]">
                  <Truck className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={`${item.id}-${item.addedAt}-${index}`}
                      className="rounded-[16px] border border-[#6d28d9]/10 bg-white/[0.02] p-3"
                    >
                      <div className="text-sm font-semibold text-[#0F1B3D]">{item.name}</div>
                      <div className="mt-1 text-xs text-[#6F7192]">
                        {item.material}, {item.color}, {item.infill}% infill
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#6d28d9]">
                        ₹{item.price.toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>

              <div className="rounded-[24px] border border-[#6d28d9]/20 bg-[linear-gradient(180deg,rgba(109, 40, 217,0.12),rgba(109, 40, 217,0.06))] p-5 shadow-[0_12px_48px_rgba(109, 40, 217,0.1)]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Grand Total</div>
                  <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-[#0F1B3D]">
                    ₹{payableTotal.toFixed(2)}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[#6F7192]">
	                    <div className="flex justify-between">
	                      <span>Items Total ({items.length} items)</span>
	                      <span>₹{itemsTotal.toFixed(2)}</span>
	                    </div>
                    {summary.cartDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Cart Discount {cartDiscountPercent}%</span>
                        <span>-₹{summary.cartDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {summary.couponDiscountAmount > 0 && summary.appliedCoupon && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Coupon ({summary.appliedCoupon.code})</span>
                        <span>-₹{summary.couponDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {summary.offerDiscountAmount > 0 && summary.appliedOffer && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Offer ({summary.appliedOffer.title})</span>
                        <span>-₹{summary.offerDiscountAmount.toFixed(2)}</span>
                      </div>
                    )}
	                    <div className="flex justify-between">
	                      <span>Final Price</span>
	                      <span>₹{summary.finalPrice.toFixed(2)}</span>
	                    </div>
                    <div className="flex justify-between">
                      <span>Delivery charge</span>
                      <span>
                        {summary.deliveryCharge === 0
                          ? 'FREE'
                          : `₹${summary.deliveryCharge.toFixed(0)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {confirmation ? (
                  <div className="rounded-[22px] border border-emerald-400/15 bg-emerald-400/10 p-4">
                    <div className="text-sm font-semibold text-[#0F1B3D]">
                      Your order has been submitted
                    </div>
                    <div className="mt-3 text-sm text-emerald-50">
                      Order ID: {confirmation.orderNumber}
                    </div>
                    <div className="mt-1 text-xs text-emerald-100/80">
                      {confirmation.itemCount} item{confirmation.itemCount !== 1 ? 's' : ''} included
                    </div>
                    <Link
                      href="/my-orders"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#0F1B3D] underline underline-offset-4"
                    >
                      View all orders
                    </Link>
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitting || confirmation !== null}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#6d28d9] px-5 py-4 text-sm font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting ? 'Submitting Order...' : confirmation ? 'Order Submitted' : `Place Order (${items.length} items)`}
                  <PackageCheck className="h-4 w-4" />
                </button>
                <Link
                  href="/cart"
                  className="inline-flex w-full items-center justify-center rounded-[18px] border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#0F1B3D] transition-colors hover:bg-white/[0.07]"
                >
                  Back to cart
                </Link>
              </div>
            </motion.aside>
          </div>
        </div>
      </div>

      <Toast toast={toast} />
    </>
  )
}
