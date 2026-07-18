'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Loader2, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

type RazorpayWindow = Window & {
  Razorpay?: new (options: Record<string, unknown>) => {
    open: () => void
    on?: (eventName: string, handler: (response: Record<string, string>) => void) => void
    close?: () => void
  }
}

let razorpayScriptPromise: Promise<boolean> | null = null

function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if ((window as RazorpayWindow).Razorpay) return Promise.resolve(true)
  if (razorpayScriptPromise) return razorpayScriptPromise

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="checkout"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true })
      existing.addEventListener('error', () => resolve(false), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.defer = true
    script.dataset.razorpay = 'checkout'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })

  return razorpayScriptPromise
}

type CheckoutCustomer = {
  name: string
  email: string
  contact: string
}

type CheckoutSessionResponse = {
  keyId: string
  orderId: string
  amount: number
  currency: string
  name: string
  description: string
  reference: string
  customer: CheckoutCustomer
  notes: Record<string, string>
  theme: { color: string }
}

type Props = {
  internalOrderType: 'shop_order' | 'custom_quote'
  internalOrderId: string
  createOrderEndpoint: string
  verifyEndpoint: string
  statusEndpoint: string
  successHref: string
  orderNumber: string
  amountPaise: number
  currency: string
  title: string
  subtitle: string
  primaryCtaLabel?: string
  supportEmail: string
  supportPhone: string
  customer: CheckoutCustomer
  orderSummary: ReactNode
  themeColor?: string
}

export default function RazorpayCheckoutClient({
  internalOrderType,
  internalOrderId,
  createOrderEndpoint,
  verifyEndpoint,
  statusEndpoint,
  successHref,
  orderNumber,
  amountPaise,
  currency,
  title,
  subtitle,
  primaryCtaLabel = 'Pay securely with Razorpay',
  supportEmail,
  supportPhone,
  customer,
  orderSummary,
  themeColor = '#0f172a',
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'creating' | 'opened' | 'verifying' | 'pending' | 'paid' | 'failed'>('idle')
  const checkoutRef = useRef<{
    open: () => void
    on?: (eventName: string, handler: (response: Record<string, string> & {
      error_code?: string
      error_description?: string
      error_reason?: string
    }) => void) => void
    close?: () => void
  } | null>(null)

  const amountDisplay = useMemo(() => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountPaise / 100), [amountPaise, currency])

  useEffect(() => {
    let active = true
    void loadRazorpayScript().then((loaded) => {
      if (!active || loaded) return
      setStatus('failed')
      setMessage('Could not load the secure payment script.')
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (status !== 'pending') return

    let cancelled = false
    let attempts = 0
    const poll = async () => {
      while (!cancelled && attempts < 24) {
        attempts += 1
        try {
          const response = await fetch(statusEndpoint, { credentials: 'include' })
          const data = await response.json().catch(() => ({})) as { paymentStatus?: string; error?: string }
          if (!response.ok) {
            throw new Error(data.error || 'Could not confirm payment.')
          }

          if (data.paymentStatus === 'paid' || data.paymentStatus === 'captured') {
            setStatus('paid')
            router.replace(successHref)
            return
          }

          if (data.paymentStatus === 'failed' || data.paymentStatus === 'cancelled') {
            setStatus('failed')
            setMessage('Payment was not completed. You can try again.')
            return
          }
        } catch (error) {
          if (!cancelled) {
            setMessage(error instanceof Error ? error.message : 'Could not confirm payment.')
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2500))
      }

      if (!cancelled) {
        setStatus('failed')
        setMessage('Payment confirmation is taking longer than expected. Please refresh the page or try again.')
      }
    }

    void poll()
    return () => {
      cancelled = true
    }
  }, [router, status, statusEndpoint, successHref])

  async function startCheckout() {
    if (loading) return
    setLoading(true)
    setMessage('')
    setStatus('creating')

    try {
      const response = await fetch(createOrderEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          internalOrderType,
          internalOrderId,
        }),
      })

      const session = await response.json().catch(() => ({})) as CheckoutSessionResponse & { error?: string }
      if (!response.ok) {
        throw new Error(session.error || 'Could not start payment.')
      }

      const loaded = await loadRazorpayScript()
      if (!loaded) {
        throw new Error('Secure payment script failed to load.')
      }

      const RazorpayCtor = (window as RazorpayWindow).Razorpay
      if (!RazorpayCtor) {
        throw new Error('Secure payment script is unavailable.')
      }

      const options = {
        key: session.keyId,
        amount: session.amount,
        currency: session.currency,
        order_id: session.orderId,
        name: session.name,
        description: session.description,
        image: undefined,
        prefill: {
          name: session.customer.name || customer.name,
          email: session.customer.email || customer.email,
          contact: session.customer.contact || customer.contact,
        },
        notes: session.notes,
        theme: {
          color: session.theme?.color || themeColor,
        },
        modal: {
          escape: false,
          backdropclose: false,
          ondismiss: () => {
            if (status !== 'paid') {
              setStatus('failed')
              setMessage('Payment dialog was closed before completion.')
            }
            setLoading(false)
          },
        },
        retry: {
          enabled: true,
          max_count: 2,
        },
        handler: async (response: Record<string, string>) => {
          setStatus('verifying')
          setMessage('Verifying payment...')
          try {
            const verifyResponse = await fetch(verifyEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                internalOrderType,
                internalOrderId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyBody = await verifyResponse.json().catch(() => ({})) as { status?: string; error?: string }
            if (!verifyResponse.ok) {
              throw new Error(verifyBody.error || 'Payment verification failed.')
            }

            if (verifyBody.status === 'paid') {
              setStatus('paid')
              router.replace(successHref)
              return
            }

            setStatus('pending')
            setMessage('Confirming payment with the gateway...')
          } catch (error) {
            setStatus('failed')
            setMessage(error instanceof Error ? error.message : 'Payment verification failed.')
          } finally {
            setLoading(false)
          }
        },
      }

      checkoutRef.current = new RazorpayCtor(options)
      checkoutRef.current.on?.('payment.failed', (response) => {
        setStatus('failed')
        setLoading(false)
        const description = response.error_description || response.error_reason || 'Payment failed.'
        setMessage(description)
      })

      setStatus('opened')
      checkoutRef.current.open()
    } catch (error) {
      setStatus('failed')
      setMessage(error instanceof Error ? error.message : 'Could not start payment.')
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(6,8,15,0.94),rgba(16,20,30,0.94))] p-5 text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure payment
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Amount</div>
            <div className="mt-1 text-xl font-black text-white">{amountDisplay}</div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-black/20 p-4">
          {orderSummary}
        </div>

        <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
          <div className="font-bold text-white">What happens next</div>
          <ul className="mt-2 space-y-2">
            <li>1. Flux3D creates the Razorpay order on the server.</li>
            <li>2. Razorpay opens a secure checkout in your browser.</li>
            <li>3. Flux3D verifies the signature and waits for capture confirmation.</li>
            <li>4. Production or dispatch starts only after payment is confirmed.</li>
          </ul>
        </div>

        {message && (
          <div className={`mt-4 rounded-2xl border p-4 text-sm ${
            status === 'failed'
              ? 'border-rose-400/20 bg-rose-500/10 text-rose-100'
              : status === 'pending' || status === 'verifying'
                ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {status === 'failed' ? <TriangleAlert className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {status === 'failed' ? 'Payment issue' : status === 'pending' ? 'Confirming payment' : 'Payment status'}
            </div>
            <p className="mt-1 leading-6">{message}</p>
          </div>
        )}

        <button
          type="button"
          onClick={startCheckout}
          disabled={loading || status === 'verifying' || status === 'paid'}
          className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#22c55e,#0ea5e9)] px-5 text-sm font-black text-white shadow-[0_18px_50px_rgba(34,197,94,0.22)] transition disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? 'Opening secure checkout...' : primaryCtaLabel}
        </button>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-slate-300">
          <div className="font-bold text-white">Support</div>
          <div className="mt-1">
            <a href={`mailto:${supportEmail}`} className="underline-offset-4 hover:underline">{supportEmail}</a>
            {' · '}
            <a href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`} className="underline-offset-4 hover:underline">{supportPhone}</a>
          </div>
          <div className="mt-2 text-slate-400">
            Order reference {orderNumber}. Secure verification is handled on Flux3D servers.
          </div>
        </div>
      </div>
    </div>
  )
}
