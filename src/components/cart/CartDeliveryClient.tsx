'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Loader2, MapPin, PackageCheck, ShieldCheck, TriangleAlert, Truck, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { prepareCartPaymentAction, verifyCartPaymentAndCreateOrder, type PrepareCartPaymentResult } from '@/app/cart/delivery/actions'
import { trackPixelEvent, generateEventId } from '@/lib/meta/event-utils'
import { useGlobalLoading } from '@/hooks/useGlobalLoading'
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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'creating' | 'opened' | 'verifying' | 'paid' | 'failed'>('idle')
  const [paymentMessage, setPaymentMessage] = useState('')
  const [paymentResult, setPaymentResult] = useState<{ orderId: string; orderNumber: string; amount: number } | null>(null)
  const { withLoading } = useGlobalLoading()
  const checkoutRef = useRef<{ open: () => void; on?: (event: string, handler: (response: Record<string, string>) => void) => void; close?: () => void } | null>(null)
  type RazorpayWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on?: (eventName: string, handler: (response: Record<string, string>) => void) => void; close?: () => void } }
  let razorpayScriptPromise: Promise<boolean> | null = null
  function loadRazorpayScript(): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false)
    if ((window as RazorpayWindow).Razorpay) return Promise.resolve(true)
    if (razorpayScriptPromise) return razorpayScriptPromise
    razorpayScriptPromise = new Promise<boolean>((resolve) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="checkout"]')
      if (existing) { existing.addEventListener('load', () => resolve(true), { once: true }); existing.addEventListener('error', () => resolve(false), { once: true }); return }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true; script.defer = true; script.dataset.razorpay = 'checkout'
      script.onload = () => resolve(true); script.onerror = () => resolve(false)
      document.head.appendChild(script)
    })
    return razorpayScriptPromise
  }
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lastLookupPincode, setLastLookupPincode] = useState(savedAddresses[0]?.pincode ?? '')

  const payableTotal = summary.grandTotal
  const itemsTotal = summary.itemsTotal
  const cartDiscountPercent = Math.round(summary.cartDiscountPercent)

  useEffect(() => {
    if (localItems.length === 0 && !paymentResult) {
      router.replace('/cart')
    }
  }, [localItems, paymentResult, router])

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
        message: error instanceof Error ? error.message : 'One or more cart items has an invalid file upload.',
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
      setPaymentStatus('creating')
      setPaymentMessage('Preparing secure payment...')

      const paymentResult = await withLoading(async () => {
        const result = await prepareCartPaymentAction({
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
          modelVolumeMm3: (item as { modelVolumeMm3?: number }).modelVolumeMm3 ?? 0,
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
        const loaded = await loadRazorpayScript()
        if (!loaded) throw new Error('Secure payment script failed to load.')
        return result
      }, 'Preparing secure payment…')

      const RazorpayCtor = (window as RazorpayWindow).Razorpay
      if (!RazorpayCtor) throw new Error('Secure payment script is unavailable.')

      const options = {
        key: paymentResult.session.keyId,
        amount: paymentResult.session.amount,
        currency: paymentResult.session.currency,
        order_id: paymentResult.session.orderId,
        name: 'Flux3D',
        description: `Cart Payment — ${items.length} item(s)`,
        prefill: {
          name: paymentResult.customer.name,
          email: paymentResult.customer.email,
          contact: paymentResult.customer.contact,
        },
        notes: { quote_capture_reference: paymentResult.reference },
        theme: { color: '#6d28d9' },
        modal: {
          escape: false,
          backdropclose: false,
          ondismiss: () => {
            if (paymentStatus !== 'paid') {
              setPaymentStatus('failed')
              setPaymentMessage('Payment dialog was closed before completion.')
            }
            setSubmitting(false)
          },
        },
        retry: { enabled: true, max_count: 2 },
        handler: async (response: Record<string, string>) => {
          setPaymentStatus('verifying')
          setPaymentMessage('Verifying payment...')
          try {
            const orderResult = await verifyCartPaymentAndCreateOrder({
              reference: paymentResult.reference,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })

            trackPixelEvent({
              eventName: 'Purchase',
              eventId: generateEventId(),
              customData: { value: payableTotal, currency: 'INR', content_ids: [orderResult.orderId], content_type: 'product' },
            })

            setPaymentStatus('paid')
            setPaymentResult({
              orderId: orderResult.orderId,
              orderNumber: orderResult.orderNumber,
              amount: payableTotal,
            })
            clearItems()
            const successData = {
              orderId: orderResult.orderId,
              orderNumber: orderResult.orderNumber,
              itemCount: orderResult.itemCount,
            }
            sessionStorage.setItem('flux3d-order-success', JSON.stringify(successData))
          } catch (error) {
            setPaymentStatus('failed')
            setPaymentMessage(error instanceof Error ? error.message : 'Payment verification failed.')
          } finally {
            setSubmitting(false)
          }
        },
      }

      checkoutRef.current = new RazorpayCtor(options)
      checkoutRef.current.on?.('payment.failed', (response: Record<string, string>) => {
        setPaymentStatus('failed')
        setSubmitting(false)
        setPaymentMessage(response.error_description || response.error_reason || 'Payment failed.')
      })

      setPaymentStatus('opened')
      checkoutRef.current.open()
    } catch (error) {
      setPaymentStatus('failed')
      setPaymentMessage(error instanceof Error ? error.message : 'Could not start payment. Please try again.')
      setSubmitting(false)
    }
  }

  if (localItems.length === 0 && !paymentResult) {
    return null
  }

  return (
    <>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(109, 40, 217,0.08),transparent_24%),radial-gradient(circle_at_right,rgba(168, 85, 247,0.08),transparent_28%),#FFFFFF] px-4 pb-16 pt-8 text-[#070b1d] md:px-8 md:pt-10 xl:px-10">
        <div className="mx-auto max-w-[1500px]">
          <Link
            href="/cart"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6d28d9] transition-colors hover:text-[#070b1d]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Link>

          <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-[760px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/25 bg-[#6d28d9]/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-[#6d28d9]">
                Cart Delivery
              </div>
              <h1 className="mt-5 font-[var(--font-syne)] text-[clamp(2.3rem,5vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-2px] text-[#070b1d]">
                Confirm Delivery for <span className="text-[#6d28d9]">{items.length} Item{items.length !== 1 ? 's' : ''}</span>
              </h1>
              <p className="mt-5 max-w-[720px] text-base leading-8 text-[#6F7192]">
                Review your cart items, choose a saved address or add a new one, and we will calculate shipping automatically before your order is sent.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#6d28d9]/10 bg-white/[0.03] px-5 py-4 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Signed in</div>
              <div className="mt-2 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">{user.name}</div>
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
                      <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
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
                          <div className="text-sm font-semibold text-[#070b1d]">{savedAddress.fullName}</div>
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
                  <h2 className="font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
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
                      <div className="text-sm font-semibold text-[#070b1d]">{item.name}</div>
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
                  <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-[#070b1d]">
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


              </div>

              <div className="mt-6 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleSubmitOrder}
                  disabled={submitting || paymentStatus === 'verifying'}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-[#6d28d9] px-5 py-4 text-sm font-semibold text-white transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {submitting || paymentStatus === 'verifying' || paymentStatus === 'opened' ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Processing Payment...</>
                  ) : (
                    <><ShieldCheck className="h-4 w-4" /> Pay & Place Order ({items.length} items)</>
                  )}
                </button>
                <Link
                  href="/cart"
                  className="inline-flex w-full items-center justify-center rounded-[18px] border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#070b1d] transition-colors hover:bg-white/[0.07]"
                >
                  Back to cart
                </Link>
              </div>
            </motion.aside>
          </div>
        </div>
      </div>

      <Toast toast={toast} />

      <AnimatePresence>
        {paymentStatus === 'paid' && paymentResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] grid place-items-center bg-white/95 backdrop-blur-md"
          >
            <div className="text-center px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-emerald-100"
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl font-black text-[#070b1d]">Payment Successful!</motion.h2>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-2 text-lg text-[#6b7280]">₹{paymentResult.amount.toFixed(0)} · {paymentResult.orderNumber}</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 text-sm text-emerald-600 font-semibold">Your order has been placed successfully!</motion.p>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="mt-6 text-sm text-[#6b7280]">Redirecting to your order...</motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentStatus === 'failed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] grid place-items-center bg-white/95 backdrop-blur-md"
          >
            <div className="text-center max-w-sm px-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-red-100"
              >
                <TriangleAlert className="h-12 w-12 text-red-600" />
              </motion.div>
              <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-3xl font-black text-[#070b1d]">Payment Failed</motion.h2>
              <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-2 text-sm leading-6 text-[#6b7280]">{paymentMessage || 'Your payment could not be processed.'}</motion.p>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-6 flex flex-col gap-3">
                <button type="button" onClick={() => setPaymentStatus('idle')} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#6d28d9] px-6 text-sm font-bold text-white shadow-[0_8px_24px_rgba(109,40,217,0.3)] transition hover:bg-[#5b21b6]">Try Again</button>
                <a href="mailto:support@flux3d.com" className="text-sm font-medium text-[#6b7280] transition hover:text-[#070b1d]">Contact Support</a>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {paymentStatus === 'paid' && paymentResult && (
        <CartRedirect orderId={paymentResult.orderId} />
      )}
    </>
  )
}

function CartRedirect({ orderId }: { orderId: string }) {
  const router = useRouter()
  useEffect(() => {
    const timer = setTimeout(() => router.replace(`/my-orders/${orderId}?payment=success`), 2000)
    return () => clearTimeout(timer)
  }, [router, orderId])
  return null
}
