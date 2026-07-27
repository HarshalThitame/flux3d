'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '@/components/Confetti'

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

type PaymentTheme = {
  accent: string
  accentFaint: string
  accentBorder: string
  accentText: string
  buttonBg: string
  buttonHoverBg: string
  buttonShadow: string
  containerBorder: string
  containerBg: string
  containerRadius: string
}

const DEFAULT_THEME: PaymentTheme = {
  accent: '#6d28d9',
  accentFaint: 'rgb(245 243 255)',
  accentBorder: 'rgb(221 214 254)',
  accentText: '#6d28d9',
  buttonBg: '#6d28d9',
  buttonHoverBg: '#5b21b6',
  buttonShadow: '0 8px 24px rgba(109,40,217,0.3)',
  containerBorder: 'rgb(243 232 255)',
  containerBg: '#ffffff',
  containerRadius: '30px',
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
  theme?: Partial<PaymentTheme>
  onSuccessAction?: () => void
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
  theme: themeOverrides,
  onSuccessAction,
}: Props) {
  const theme = { ...DEFAULT_THEME, ...themeOverrides }
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
            onSuccessAction?.()
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
          expectedAmountPaise: amountPaise,
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
              onSuccessAction?.()
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

  const showOverlay = status === 'paid' || status === 'failed'

  return (
    <>
      {status === 'paid' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[9999] grid place-items-center bg-white/95 backdrop-blur-md"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-emerald-100"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-black text-[#0F1B3D]"
            >
              Payment Successful
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-lg text-[#6b7280]"
            >
              {amountDisplay} · {orderNumber}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-sm text-[#6b7280]"
            >
              Redirecting to your order...
            </motion.p>
          </div>
        </motion.div>
      )}

      {status === 'failed' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[9999] grid place-items-center bg-white/95 backdrop-blur-md"
        >
          <div className="text-center max-w-sm">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-red-100"
            >
              <TriangleAlert className="h-12 w-12 text-red-600" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-black text-[#0F1B3D]"
            >
              Payment Failed
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-sm leading-6 text-[#6b7280]"
            >
              {message || 'Your payment could not be processed. Please try again.'}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 flex flex-col gap-3"
            >
              <button
                type="button"
                onClick={() => setStatus('idle')}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-white transition"
                style={{ backgroundColor: theme.buttonBg, boxShadow: theme.buttonShadow }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = theme.buttonHoverBg }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = theme.buttonBg }}
              >
                Try Again
              </button>
              <a
                href={`mailto:${supportEmail}`}
                className="text-sm font-medium text-[#6b7280] transition hover:text-[#0F1B3D]"
              >
                Contact Support
              </a>
            </motion.div>
          </div>
        </motion.div>
      )}

      {status === 'paid' && <Confetti active duration={2000} />}

    <div className="flex h-full flex-col p-5 shadow-[var(--shop-shadow-lg)]" style={{ borderRadius: theme.containerRadius, border: `1px solid ${theme.containerBorder}`, backgroundColor: theme.containerBg }}>
      <div className="rounded-3xl p-5" style={{ border: `1px solid ${theme.containerBorder}`, backgroundColor: theme.containerBg }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ border: `1px solid ${theme.accentBorder}`, backgroundColor: theme.accentFaint, color: theme.accentText }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure payment
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-[var(--shop-text-primary,#0F1B3D)]">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-[var(--shop-text-muted,#6b7280)]">{subtitle}</p>
          </div>
          <div className="rounded-2xl px-3 py-2 text-right" style={{ border: `1px solid ${theme.containerBorder}`, backgroundColor: theme.accentFaint }}>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--shop-text-muted,#6b7280)]">Amount</div>
            <div className="mt-1 text-xl font-black text-[var(--shop-text-primary,#0F1B3D)]">{amountDisplay}</div>
          </div>
        </div>

        <div className="mt-5 rounded-3xl p-4" style={{ border: `1px solid ${theme.containerBorder}`, backgroundColor: `${theme.accentFaint}80` }}>
          {orderSummary}
        </div>

        <div className="mt-5 rounded-3xl p-4 text-sm leading-7 text-[#374151]" style={{ border: `1px solid ${theme.containerBorder}`, backgroundColor: theme.accentFaint }}>
          <div className="font-bold text-[var(--shop-text-primary,#0F1B3D)]">What happens next</div>
          <ul className="mt-2 space-y-2">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: theme.accent }}>1</span>
              Flux3D creates the Razorpay order on the server.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: theme.accent }}>2</span>
              Razorpay opens a secure checkout in your browser.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: theme.accent }}>3</span>
              Flux3D verifies the signature and waits for capture confirmation.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: theme.accent }}>4</span>
              Production or dispatch starts only after payment is confirmed.
            </li>
          </ul>
        </div>

        {message && (
          <div className={`mt-4 rounded-2xl border p-4 text-sm ${
            status === 'failed'
              ? 'border-red-200 bg-red-50 text-red-700'
              : status === 'pending' || status === 'verifying'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
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
          className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: theme.buttonBg, boxShadow: theme.buttonShadow }}
          onMouseEnter={(e) => { if (!loading && status !== 'verifying' && status !== 'paid') (e.currentTarget as HTMLButtonElement).style.backgroundColor = theme.buttonHoverBg }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = theme.buttonBg }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? 'Opening secure checkout...' : primaryCtaLabel}
        </button>

        <div className="mt-4 rounded-2xl p-4 text-xs leading-6 text-[var(--shop-text-muted,#6b7280)]" style={{ border: `1px solid ${theme.containerBorder}`, backgroundColor: theme.accentFaint }}>
          <div className="font-bold text-[var(--shop-text-primary,#0F1B3D)]">Support</div>
          <div className="mt-1">
            <a href={`mailto:${supportEmail}`} className="underline-offset-4 hover:underline" style={{ color: theme.accent }}>{supportEmail}</a>
            {' · '}
            <a href={`tel:${supportPhone.replace(/[^0-9+]/g, '')}`} className="underline-offset-4 hover:underline" style={{ color: theme.accent }}>{supportPhone}</a>
          </div>
          <div className="mt-2 text-[var(--shop-text-muted,#6b7280)]">
            Order reference {orderNumber}. Secure verification is handled on Flux3D servers.
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
