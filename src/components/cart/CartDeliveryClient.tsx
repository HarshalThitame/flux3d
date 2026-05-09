'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import {
  addressesEqual,
  calculateOrderTotal,
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

  const pricing = useMemo(
    () => calculateOrderTotal(summary.subtotal),
    [summary.subtotal]
  )

  useEffect(() => {
    if (items.length === 0 && !confirmation) {
      router.replace('/cart')
    }
  }, [items, confirmation, router])

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
          supports: item.supports ?? false,
          postProcessingCharges: item.postProcessingCharges ?? 0,
          price: item.price ?? 0,
          estimatedTime: item.estimatedTime ?? 0,
          weight: item.weight ?? 0,
          dimensions: item.dimensions ?? { x: 0, y: 0, z: 0 },
        })),
        subtotal: summary.subtotal,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
      })

      const { totalPrice } = calculateOrderTotal(summary.subtotal)
      setConfirmation({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        itemCount: result.itemCount,
        totalPrice,
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

  if (items.length === 0 && !confirmation) {
    return null
  }

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,92,26,0.08),transparent_24%),radial-gradient(circle_at_right,rgba(34,211,238,0.08),transparent_28%),#050810] px-4 pb-16 pt-28 text-[#e8eaf0] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[1500px]">
          <Link
            href="/cart"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#7dd3fc] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Link>

          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/25 bg-[#FF5C1A]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#FF9A72]">
                Cart Delivery
              </div>
              <h1 className="mt-5 font-[var(--font-syne)] text-[clamp(2.3rem,5vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-2px] text-white">
                Confirm Delivery for <span className="text-[#7dd3fc]">{items.length} Item{items.length !== 1 ? 's' : ''}</span>
              </h1>
              <p className="mt-5 max-w-[720px] text-base leading-8 text-[#7a82a0]">
                Review your cart items, choose a saved address or add a new one, and we will calculate shipping automatically before your order is sent.
              </p>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Signed in</div>
              <div className="mt-2 font-[var(--font-syne)] text-2xl font-bold text-white">{user.name}</div>
              <div className="mt-1 text-sm text-[#7a82a0]">{user.email}</div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              {savedAddresses.length > 0 ? (
                <motion.section
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.96),rgba(7,11,22,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
                        Saved Addresses
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-[#97a1c2]">
                        Use an existing delivery address or switch to a new one.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[#c9d0e7]">
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
                              ? 'border-[#FF8A57]/35 bg-[#11182b]'
                              : 'border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="text-sm font-semibold text-white">{savedAddress.fullName}</div>
                          <div className="mt-1 text-sm text-[#c8d0e9]">{savedAddress.phone}</div>
                          <div className="mt-3 space-y-1 text-xs leading-6 text-[#8d97b8]">
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
                    className="mt-4 text-sm font-medium text-[#7dd3fc]"
                  >
                    Use a new address
                  </button>
                </motion.section>
              ) : null}

              <AddressForm values={address} errors={errors} onChange={handleAddressChange} />

              <div className="text-sm text-[#8d97b8]">
                {lookupLoading
                  ? 'Fetching city and state from your pincode...'
                  : 'City and state will auto-fill after you enter a valid 6-digit pincode.'}
              </div>
            </div>

            <motion.aside
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="h-fit rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(12,18,34,0.98),rgba(6,10,20,0.96))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.3)]"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
                    Order Summary
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#97a1c2]">
                    Final review before your {items.length} item{items.length !== 1 ? 's are' : ' is'} submitted.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 p-3 text-[#FF9A72]">
                  <Truck className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={`${item.id}-${item.addedAt}-${index}`}
                      className="rounded-[16px] border border-white/8 bg-white/[0.02] p-3"
                    >
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="mt-1 text-xs text-[#c8d0e9]">
                        {item.material}, {item.color}, {item.infill}% infill
                      </div>
                      <div className="mt-1 text-sm font-medium text-[#FF9A72]">
                        ₹{item.price.toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[24px] border border-[#FF8A57]/20 bg-[linear-gradient(180deg,rgba(255,92,26,0.12),rgba(255,92,26,0.06))] p-5 shadow-[0_12px_48px_rgba(255,92,26,0.1)]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#ffd3c1]">Total Price</div>
                  <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-white">
                    ₹{pricing.totalPrice.toFixed(0)}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[#ffe0d4]">
                    <div className="flex justify-between">
                      <span>Print cost ({items.length} items)</span>
                      <span>₹{summary.subtotal.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery charge</span>
                      <span>
                        {pricing.deliveryCharge === 0
                          ? 'FREE'
                          : `₹${pricing.deliveryCharge.toFixed(0)}`}
                      </span>
                    </div>
                  </div>
                </div>

                {confirmation ? (
                  <div className="rounded-[22px] border border-emerald-400/15 bg-emerald-400/10 p-4">
                    <div className="text-sm font-semibold text-white">
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
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white underline underline-offset-4"
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#FF5C1A] px-5 py-4 text-sm font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting ? 'Submitting Order...' : confirmation ? 'Order Submitted' : `Place Order (${items.length} items)`}
                  <PackageCheck className="h-4 w-4" />
                </button>
                <Link
                  href="/cart"
                  className="inline-flex w-full items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
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
