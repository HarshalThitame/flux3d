'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Banknote, CheckCircle2, MapPin, PackageCheck, Plus, ShieldCheck } from 'lucide-react'
import { useAddresses } from '@/hooks/useAddresses'
import { useGlobalLoading } from '@/hooks/useGlobalLoading'
import { calculateDeliveryChargeFromSettings } from '@/lib/quote/pricing-waterfall'
import { formatShopPrice } from '@/lib/shop/selection'
import { getShopCartTotals, type ShopCartItem, useShopCartStore } from '@/stores/shopCartStore'
import type { AddressRow } from '../../../../types/database'
import { trackMetaEvent } from '@/lib/meta/event-utils'

type AddressFormState = {
  name: string
  phone: string
  line1: string
  line2: string
  pincode: string
  city: string
  state: string
}

type PincodeState = 'idle' | 'checking' | 'serviceable' | 'error'

type ShopCheckoutClientProps = {
  deliveryChargeThreshold: number
  defaultDeliveryCharge: number
}

const emptyAddressForm: AddressFormState = {
  name: '',
  phone: '',
  line1: '',
  line2: '',
  pincode: '',
  city: '',
  state: '',
}

function savedAddressToShipping(address: AddressRow) {
  return {
    name: address.full_name,
    phone: address.phone,
    line1: address.address_line_1,
    line2: address.address_line_2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
  }
}

function formatAddressLine(address: AddressRow) {
  return [
    address.address_line_1,
    address.address_line_2,
    address.landmark,
    address.city,
    address.state,
    address.pincode,
  ].filter(Boolean).join(', ')
}

function validateAddressForm(form: AddressFormState) {
  const errors: Partial<Record<keyof AddressFormState, string>> = {}
  const phone = form.phone.replace(/\D/g, '')
  const pincode = form.pincode.replace(/\D/g, '')

  if (!form.name.trim()) errors.name = 'Full name is required.'
  if (!/^\d{10}$/.test(phone)) errors.phone = 'Enter a valid 10 digit phone number.'
  if (!form.line1.trim()) errors.line1 = 'Address line 1 is required.'
  if (!/^\d{6}$/.test(pincode)) errors.pincode = 'Enter a valid 6 digit pincode.'
  if (!form.city.trim()) errors.city = 'City is required.'
  if (!form.state.trim()) errors.state = 'State is required.'

  return errors
}

function getSkuWeight(item: ShopCartItem, weightsBySkuId: Record<string, number>) {
  const storedWeight = Number((item as ShopCartItem & { weightGrams?: number; weight_grams?: number }).weightGrams ?? (item as ShopCartItem & { weight_grams?: number }).weight_grams)
  if (Number.isFinite(storedWeight) && storedWeight > 0) return storedWeight
  return weightsBySkuId[item.skuId] ?? 0
}

export default function ShopCheckoutClient({
  deliveryChargeThreshold,
  defaultDeliveryCharge,
}: ShopCheckoutClientProps) {
  const router = useRouter()
  const orderCompletionRef = useRef(false)
  const { addresses, defaultAddress, loading: addressesLoading, addAddress } = useAddresses()
  const items = useShopCartStore((state) => state.items)
  const couponCode = useShopCartStore((state) => state.couponCode)
  const discountAmount = useShopCartStore((state) => state.discountAmount)
  const appliedCoupon = useShopCartStore((state) => state.appliedCoupon)
  const autoApplyOffer = useShopCartStore((state) => state.autoApplyOffer)
  const clearCart = useShopCartStore((state) => state.clearCart)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [useNewAddress, setUseNewAddress] = useState(false)
  const [saveAddress, setSaveAddress] = useState(false)
  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm)
  const [addressErrors, setAddressErrors] = useState<Partial<Record<keyof AddressFormState, string>>>({})
  const [pincodeState, setPincodeState] = useState<PincodeState>('idle')
  const [pincodeMessage, setPincodeMessage] = useState('')
  const [weightsBySkuId, setWeightsBySkuId] = useState<Record<string, number>>({})
  const [isPlacing, setIsPlacing] = useState(false)
  const [toast, setToast] = useState('')
  const [reviewBanner, setReviewBanner] = useState(false)
  const [affectedItemIds, setAffectedItemIds] = useState<string[]>([])
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const { withLoading } = useGlobalLoading()

  const totals = useMemo(
    () =>
      getShopCartTotals({
        items,
        couponCode,
        discountAmount,
        appliedCoupon,
        autoApplyOffer,
      }),
    [appliedCoupon, autoApplyOffer, couponCode, discountAmount, items]
  )
  const shippingCharge = totals.freeShipping
    ? 0
    : calculateDeliveryChargeFromSettings(totals.total, {
        deliveryChargeThreshold,
        defaultDeliveryCharge,
      })
  const qualifiesForFreeShipping = totals.freeShipping || shippingCharge === 0
  const payableTotal = totals.total + shippingCharge
  const totalWeight = useMemo(
    () => items.reduce((sum, item) => sum + getSkuWeight(item, weightsBySkuId) * item.quantity, 0),
    [items, weightsBySkuId]
  )
  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  )
  const showAddressForm = useNewAddress || addresses.length === 0

  useEffect(() => {
    if (items.length === 0 && !orderCompletionRef.current) router.replace('/3d-shop/cart')
  }, [items.length, router])

  useEffect(() => {
    if (items.length === 0) return
    trackMetaEvent('InitiateCheckout', {
      content_ids: items.map((i) => i.skuCode),
      content_type: 'product',
      contents: items.map((i) => ({ id: i.skuCode, quantity: i.quantity, item_price: i.price })),
      num_items: items.length,
      value: totals.subtotal,
      currency: 'INR',
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!completedOrderId) return

    router.push(`/3d-shop/payment/${encodeURIComponent(completedOrderId)}`)
    window.setTimeout(() => setCompletedOrderId(null), 0)
  }, [completedOrderId, router])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (addressesLoading) return
      if (addresses.length === 0) {
        setUseNewAddress(true)
        setSelectedAddressId(null)
        return
      }
      setUseNewAddress(false)
      setSelectedAddressId((current) => current ?? defaultAddress?.id ?? addresses[0].id)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [addresses, addressesLoading, defaultAddress])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let active = true
    const slugs = Array.from(new Set(items.map((item) => item.productSlug).filter(Boolean)))

    async function loadWeights() {
      const next: Record<string, number> = {}
      await Promise.all(slugs.map(async (slug) => {
        try {
          const response = await fetch(`/api/3d-shop/products/${slug}`)
          const data = await response.json() as {
            product?: { skus?: Array<{ id: string; weight_grams: number | null }> }
          }
          data.product?.skus?.forEach((sku) => {
            next[sku.id] = Number(sku.weight_grams ?? 0)
          })
        } catch {
          // Weight is not needed for the current flat-rate shipping amount.
        }
      }))
      if (active) setWeightsBySkuId(next)
    }

    void loadWeights()
    return () => {
      active = false
    }
  }, [items])

  const checkPincode = useCallback(async (pincode: string) => {
    const normalized = pincode.replace(/\D/g, '')
    if (!/^\d{6}$/.test(normalized)) {
      setPincodeState('error')
      setPincodeMessage('Enter a valid 6 digit pincode.')
      return false
    }

    setPincodeState('checking')
    setPincodeMessage('Checking serviceability...')
    try {
      const response = await fetch(`/api/3d-shop/pincode/${normalized}`)
      const data = await response.json() as { serviceable?: boolean; city?: string; state?: string; error?: string }
      if (!response.ok || !data.serviceable) {
        setPincodeState('error')
        setPincodeMessage(data.error || 'This pincode is not serviceable.')
        return false
      }

      setAddressForm((current) => ({
        ...current,
        pincode: normalized,
        city: data.city || current.city,
        state: data.state || current.state,
      }))
      setPincodeState('serviceable')
      setPincodeMessage('Delivery available.')
      return true
    } catch {
      setPincodeState('error')
      setPincodeMessage('Could not verify pincode.')
      return false
    }
  }, [])

  async function handlePlaceOrder() {
    if (isPlacing || items.length === 0) return

    trackMetaEvent('AddPaymentInfo', {
      content_ids: items.map((i) => i.skuCode),
      content_type: 'product',
      contents: items.map((i) => ({ id: i.skuCode, quantity: i.quantity, item_price: i.price })),
      value: totals.subtotal,
      currency: 'INR',
    })

    setToast('')
    setReviewBanner(false)
    setAffectedItemIds([])

    let shippingAddress
    if (showAddressForm) {
      const errors = validateAddressForm(addressForm)
      setAddressErrors(errors)
      if (Object.keys(errors).length > 0) return
      if (pincodeState !== 'serviceable') {
        const ok = await checkPincode(addressForm.pincode)
        if (!ok) return
      }

      shippingAddress = {
        name: addressForm.name.trim(),
        phone: addressForm.phone.replace(/\D/g, ''),
        line1: addressForm.line1.trim(),
        line2: addressForm.line2.trim() || null,
        city: addressForm.city.trim(),
        state: addressForm.state.trim(),
        pincode: addressForm.pincode.replace(/\D/g, ''),
      }
    } else if (selectedAddress) {
      shippingAddress = savedAddressToShipping(selectedAddress)
    } else {
      setToast('Select a delivery address.')
      return
    }

    setIsPlacing(true)
    try {
      await withLoading(async () => {
        if (showAddressForm && saveAddress) {
          await addAddress({
            full_name: shippingAddress.name,
            phone: shippingAddress.phone,
            address_line_1: shippingAddress.line1,
            address_line_2: shippingAddress.line2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode,
            country: 'India',
            is_default: addresses.length === 0,
          })
        }

        const payload = {
          items: items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productThumbnail: item.thumbnail,
            productSlug: item.productSlug,
            skuId: item.skuId,
            skuCode: item.skuCode,
            variantCombination: item.variantCombination,
            variantLabel: item.variantLabel,
            quantity: item.quantity,
            unitPrice: item.price,
            customizationText: item.customizationText || null,
          })),
          subtotal: totals.subtotal,
          discountAmount: totals.discount,
          couponCode: totals.couponCode,
          appliedCouponId: totals.appliedCoupon?.id ?? null,
          appliedOfferId: totals.appliedOffer?.id ?? null,
          shippingCharge,
          totalAmount: payableTotal,
          shippingAddress,
        }

        const response = await fetch('/api/3d-shop/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await response.json().catch(() => ({})) as { success?: boolean; orderId?: string; error?: string }
        if (!response.ok || !data.success || !data.orderId) {
          const message = data.error || 'Failed to place order.'
          setToast(message)
          if (/stock|quantity|price|available|refresh/i.test(message)) {
            setReviewBanner(true)
            setAffectedItemIds(
              items.filter((item) => message.toLowerCase().includes(item.productName.toLowerCase()))
                .map((item) => item.cartItemId)
            )
          }
          return
        }

        orderCompletionRef.current = true
        setCompletedOrderId(data.orderId)
      }, 'Placing your order…')
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Failed to place order.')
    } finally {
      setIsPlacing(false)
    }
  }

  if (items.length === 0) return null

  return (
    <main className="px-4 pb-20 pt-5 md:px-8 lg:px-16">
      {toast && (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[120] max-w-[calc(100vw-2rem)] rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-xl sm:right-5 sm:max-w-sm">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold text-[var(--shop-gold)]">3D Shop</p>
          <h1 className="font-[var(--shop-font-heading)] mt-2 text-[clamp(2rem,6vw,3rem)] font-semibold text-[var(--shop-text-primary)] md:text-4xl">Checkout</h1>
          <p className="mt-2 text-[var(--shop-text-secondary)]">Secure online payment through Razorpay for the confirmed order amount.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="space-y-6">
            <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-5 shadow-[var(--shop-shadow-sm)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
                  <MapPin className="h-5 w-5" />
                </span>
                <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">Delivery Address</h2>
              </div>

              {addressesLoading ? (
                <div className="mt-5 rounded-2xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-4 text-sm text-[var(--shop-text-secondary)]">
                  Loading saved addresses...
                </div>
              ) : addresses.length > 0 ? (
                <div className="mt-5 grid gap-3">
                  {addresses.map((address) => {
                    const selected = selectedAddressId === address.id && !useNewAddress
                    return (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => {
                          setSelectedAddressId(address.id)
                          setUseNewAddress(false)
                        }}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected
                            ? 'border-[var(--shop-gold)] bg-[var(--shop-gold-faint)]'
                            : 'border-[var(--shop-border-light)] bg-white hover:border-[var(--shop-border-gold)]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-[var(--shop-text-primary)]">{address.full_name}</div>
                            <div className="mt-1 text-sm text-[var(--shop-text-secondary)]">{address.phone}</div>
                            <div className="mt-2 text-sm leading-6 text-[var(--shop-text-secondary)]">{formatAddressLine(address)}</div>
                          </div>
                          <label className="flex shrink-0 items-center gap-2 text-sm font-bold text-[var(--shop-gold)]">
                            <input type="radio" checked={selected} onChange={() => undefined} />
                            Deliver here
                          </label>
                        </div>
                      </button>
                    )
                  })}

                  <button
                    type="button"
                    onClick={() => setUseNewAddress(true)}
                    className={`flex min-h-[52px] items-center gap-3 rounded-2xl border px-4 text-sm font-bold ${
                      useNewAddress
                        ? 'border-[var(--shop-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]'
                        : 'border-dashed border-[var(--shop-border-light)] bg-white text-[var(--shop-text-secondary)]'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    Add a new address
                  </button>
                </div>
              ) : null}

              {showAddressForm && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {([
                    ['name', 'Full Name'],
                    ['phone', 'Phone Number'],
                    ['line1', 'Address Line 1'],
                    ['line2', 'Address Line 2'],
                    ['pincode', 'Pincode'],
                    ['city', 'City'],
                    ['state', 'State'],
                  ] as Array<[keyof AddressFormState, string]>).map(([field, label]) => (
                    <label key={field} className={field === 'line1' || field === 'line2' ? 'sm:col-span-2' : ''}>
                      <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--shop-text-muted)]">{label}</span>
                      <input
                        value={addressForm[field]}
                        onChange={(event) => {
                          const value = event.target.value
                          setAddressForm((current) => ({ ...current, [field]: value }))
                          setAddressErrors((current) => ({ ...current, [field]: undefined }))
                          if (field === 'pincode') {
                            setPincodeState('idle')
                            setPincodeMessage('')
                          }
                        }}
                        onBlur={() => {
                          if (field === 'pincode') void checkPincode(addressForm.pincode)
                        }}
                        placeholder={
                          field === 'name' ? 'Full name' :
                          field === 'phone' ? '10-digit mobile number' :
                          field === 'line1' ? 'House number, street, area' :
                          field === 'line2' ? 'Area or landmark (optional)' :
                          field === 'pincode' ? '6-digit pincode' :
                          field === 'city' ? 'City' :
                          field === 'state' ? 'State' : ''
                        }
                        className={`mt-2 min-h-[48px] w-full rounded-xl border bg-white px-3 text-sm text-[var(--shop-text-primary)] outline-none transition ${
                          addressErrors[field]
                            ? 'border-red-400 ring-1 ring-red-400/30 focus:border-red-500'
                            : 'border-[var(--shop-border-light)] focus:border-[var(--shop-gold)]'
                        }`}
                      />
                      {addressErrors[field] && <span className="mt-1 block text-xs text-rose-600">{addressErrors[field]}</span>}
                    </label>
                  ))}
                  {pincodeMessage && (
                    <div className={`sm:col-span-2 text-sm ${pincodeState === 'serviceable' ? 'text-emerald-700' : pincodeState === 'checking' ? 'text-[var(--shop-text-secondary)]' : 'text-rose-600'}`}>
                      {pincodeMessage}
                    </div>
                  )}
                  <label className="sm:col-span-2 flex items-center gap-3 text-sm font-semibold text-[var(--shop-text-secondary)]">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(event) => setSaveAddress(event.target.checked)}
                      className="h-4 w-4"
                    />
                    Save this address
                  </label>
                </div>
              )}
            </div>

            <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-5 shadow-[var(--shop-shadow-sm)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
                  <Banknote className="h-5 w-5" />
                </span>
                <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">Payment</h2>
              </div>
              <div className="mt-5 rounded-2xl border border-[var(--shop-gold)] bg-[var(--shop-gold-faint)] p-4">
                <div className="flex items-center gap-3">
                  <Banknote className="h-6 w-6 text-[var(--shop-gold)]" />
                  <div>
                    <div className="font-bold text-[var(--shop-text-primary)]">Razorpay checkout</div>
                    <div className="mt-1 text-sm text-[var(--shop-text-secondary)]">Pay securely after the order is created</div>
                  </div>
                  <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-5 shadow-[var(--shop-shadow-sm)] lg:sticky lg:top-28">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
                <PackageCheck className="h-5 w-5" />
              </span>
                <h2 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">Order Summary</h2>
            </div>

            {reviewBanner && (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                <div className="flex gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Some items in your cart have changed. Please review before placing order.
                </div>
              </div>
            )}

            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className={`rounded-2xl border p-3 ${
                    affectedItemIds.includes(item.cartItemId)
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-[var(--shop-border-light)] bg-white'
                  }`}
                >
                  <div className="grid grid-cols-[40px_minmax(0,1fr)_auto] gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-[var(--shop-bg-muted)]">
                      {item.thumbnail ? (
                        <Image src={item.thumbnail} alt={item.productName} fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-lg">🧩</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-1 text-sm font-bold text-[var(--shop-text-primary)]">{item.productName}</div>
                      <div className="mt-1 text-xs text-[var(--shop-text-muted)]">{item.variantLabel}</div>
                      {item.customizationText && (
                        <div className="mt-1 text-xs italic text-[var(--shop-text-secondary)]">Engraved: {item.customizationText}</div>
                      )}
                      <div className="mt-1 text-xs text-[var(--shop-text-secondary)]">
                        Qty {item.quantity} x {formatShopPrice(item.price)}
                      </div>
                    </div>
                    <div className="text-right text-sm font-extrabold text-[var(--shop-text-primary)]">
                      {formatShopPrice(item.price * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-[var(--shop-border-light)] pt-5 text-sm">
              <div className="flex justify-between text-[var(--shop-text-secondary)]">
                <span>Subtotal</span>
                <span className="font-bold text-[var(--shop-text-primary)]">{formatShopPrice(totals.subtotal)}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    Discount
                    {totals.couponCode && <span className="ml-1 text-xs">({totals.couponCode})</span>}
                  </span>
                  <span className="font-bold">-{formatShopPrice(totals.discount)}</span>
                </div>
              )}
              <div className="rounded-2xl bg-[var(--shop-bg-soft)] px-3 py-2 text-xs font-semibold text-[var(--shop-text-secondary)]">
                {qualifiesForFreeShipping
                  ? "You've got free shipping!"
                  : `Free shipping on orders above ${formatShopPrice(deliveryChargeThreshold)}`}
              </div>
              <div className="flex justify-between text-[var(--shop-text-secondary)]">
                <span>Shipping</span>
                <span className="font-bold text-[var(--shop-text-primary)]">{shippingCharge === 0 ? 'Free' : formatShopPrice(shippingCharge)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--shop-text-muted)]">
                <span>Estimated package weight</span>
                <span>{totalWeight > 0 ? `${Math.round(totalWeight)} g` : 'Calculated'}</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--shop-border-light)] pt-5">
              <span className="text-lg font-bold text-[var(--shop-text-primary)]">Total</span>
              <span className="text-2xl font-extrabold text-[var(--shop-text-primary)]">{formatShopPrice(payableTotal)}</span>
            </div>

            <button
              type="button"
              onClick={() => void handlePlaceOrder()}
              disabled={isPlacing}
              className="mt-5 flex min-h-[54px] w-full items-center justify-center rounded-[var(--shop-radius-lg)] bg-[var(--shop-text-primary)] text-base font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPlacing ? 'Placing your order...' : `Place Order · ${formatShopPrice(payableTotal)}`}
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-[var(--shop-text-muted)]">
              By placing this order you agree to our Terms & Conditions and Return Policy.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Server verified price and stock before order placement.
            </div>
            <Link href="/3d-shop/cart" className="mt-4 block text-center text-sm font-bold text-[var(--shop-text-secondary)]">
              Back to cart
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}
