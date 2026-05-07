'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, PackageCheck, Truck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createOrderAction } from '@/app/instant-quote/actions'
import AddressForm from '@/components/instant-quote/AddressForm'
import Toast, { type ToastState } from '@/components/quote/Toast'
import type { AppUserProfile } from '@/lib/auth/server'
import { normalizeOwnedStoragePath } from '@/lib/quote/storage-path'
import {
  addressesEqual,
  calculateOrderTotal,
  formatAddressSummary,
  initialAddressFields,
  ORDER_DRAFT_STORAGE_KEY,
  validateAddressFields,
  type AddressFieldErrors,
  type AddressFields,
  type OrderDraft,
  type SavedAddress,
} from '@/lib/orders'

type DeliveryStepClientProps = {
  user: AppUserProfile
  savedAddresses: SavedAddress[]
}

export default function DeliveryStepClient({
  user,
  savedAddresses,
}: DeliveryStepClientProps) {
  const router = useRouter()
  const [draft] = useState<OrderDraft | null>(() => {
    if (typeof window === 'undefined') {
      return null
    }

    const raw = window.sessionStorage.getItem(ORDER_DRAFT_STORAGE_KEY)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as OrderDraft
      if (!parsed.fileUrl?.trim() || !parsed.material?.trim()) {
        return null
      }

      const normalizedFileUrl = normalizeOwnedStoragePath(parsed.fileUrl, user.id)
      return {
        ...parsed,
        fileUrl: normalizedFileUrl,
      }
    } catch {
      return null
    }
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
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lastLookupPincode, setLastLookupPincode] = useState(savedAddresses[0]?.pincode ?? '')

  const pricing = useMemo(
    () => calculateOrderTotal(draft?.price ?? 0),
    [draft]
  )

  useEffect(() => {
    if (!draft) {
      router.replace('/instant-quote')
    }
  }, [draft, router])

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
    if (!draft) {
      setToast({ type: 'error', message: 'Your quote draft is missing. Start again from instant quote.' })
      return
    }

    try {
      normalizeOwnedStoragePath(draft.fileUrl, user.id)
    } catch (error) {
      setToast({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Your quote file is missing or invalid. Re-upload the model from instant quote.',
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
      const result = await createOrderAction({
        fileUrl: draft.fileUrl,
        material: draft.material,
        color: draft.color,
        infill: draft.infill,
        layerHeight: draft.layerHeight,
        supports: draft.supports,
        price: draft.price,
        estimatedTime: draft.estimatedTime,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        landmark: address.landmark,
        notes: draft.notes,
      })

      window.sessionStorage.removeItem(ORDER_DRAFT_STORAGE_KEY)
      const orderData = {
        orderId: result.id,
        orderNumber: result.orderNumber,
        totalPrice: result.totalPrice ?? draft.price,
      }
      sessionStorage.setItem('flux3d-order-success', JSON.stringify(orderData))
      router.push('/order-success')
    } catch (error) {
      setToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit your print request.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!draft) {
    return null
  }

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,92,26,0.08),transparent_24%),radial-gradient(circle_at_right,rgba(34,211,238,0.08),transparent_28%),#050810] px-4 pb-16 pt-28 text-[#e8eaf0] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[1500px]">
          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/25 bg-[#FF5C1A]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#FF9A72]">
                Delivery Step
              </div>
              <h1 className="mt-5 font-[var(--font-syne)] text-[clamp(2.3rem,5vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-2px] text-white">
                Confirm Delivery and Submit <span className="text-[#7dd3fc]">Your Print Request</span>
              </h1>
              <p className="mt-5 max-w-[720px] text-base leading-8 text-[#7a82a0]">
                Review your quote, choose a saved address or add a new one, and we will calculate shipping automatically before your order request is sent.
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
                      const summary = formatAddressSummary(savedAddress)

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
                            {summary.map((line) => (
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
                    Delivery Summary
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#97a1c2]">
                    Final review before your request is submitted to the admin.
                  </p>
                </div>
                <div className="rounded-2xl border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 p-3 text-[#FF9A72]">
                  <Truck className="h-5 w-5" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">Quote</div>
                  <div className="mt-2 text-lg font-semibold text-white">{draft.quoteId}</div>
                  <div className="mt-2 text-sm text-[#c8d0e9]">
                    {draft.material}, {draft.color}, {draft.infill}% infill, {draft.layerHeight} mm
                  </div>
                </div>

                <div className="rounded-[24px] border border-[#FF8A57]/20 bg-[linear-gradient(180deg,rgba(255,92,26,0.12),rgba(255,92,26,0.06))] p-5 shadow-[0_12px_48px_rgba(255,92,26,0.1)]">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[#ffd3c1]">Total Price</div>
                  <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-white">
                    ₹{pricing.totalPrice.toFixed(0)}
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-[#ffe0d4]">
                    <div className="flex justify-between">
                      <span>Print cost</span>
                      <span>₹{draft.price.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery charge</span>
                      <span>
                        {pricing.deliveryCharge === 0
                          ? 'FREE'
                          : `₹${pricing.deliveryCharge.toFixed(0)}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated print time</span>
                      <span>{draft.estimatedTime.toFixed(1)} hr</span>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#FF5C1A] px-5 py-4 text-sm font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting ? 'Submitting Request...' : 'Place Order Request'}
                  <PackageCheck className="h-4 w-4" />
                </button>
                <Link
                  href="/instant-quote"
                  className="inline-flex w-full items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
                >
                  Back to quote
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
