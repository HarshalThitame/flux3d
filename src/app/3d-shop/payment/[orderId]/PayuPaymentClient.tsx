'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, ShieldCheck } from 'lucide-react'

type PayuFields = Record<string, string>

type Props = {
  actionUrl: string
  fields: PayuFields
  orderId: string
  orderNumber: string
  amount: number
  totalItems: number
  supportEmail: string
  supportPhone: string
}

export default function PayuPaymentClient({
  actionUrl,
  fields,
  orderId,
  orderNumber,
  amount,
  totalItems,
  supportEmail,
  supportPhone,
}: Props) {
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const phoneDigits = useMemo(() => supportPhone.replace(/[^0-9+]/g, ''), [supportPhone])

  async function submitConsentAndPay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!consent || submitting) return

    const form = event.currentTarget
    setSubmitting(true)
    setMessage('')

    try {
      const response = await fetch('/api/3d-shop/payu/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          consent: true,
        }),
      })

      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string }
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Could not record consent.')
      }

      form.submit()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not start PayU checkout.')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col rounded-3xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-5">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          <div>
            <div className="text-sm font-bold text-emerald-900">Consent required</div>
            <div className="mt-1 text-xs leading-6 text-emerald-800">
              Before payment is sent to PayU, you must accept the Terms &amp; Conditions and acknowledge the Refund &amp; Cancellation Policy.
            </div>
          </div>
        </div>
      </div>

      <form action={actionUrl} method="post" className="mt-5 flex flex-1 flex-col" onSubmit={submitConsentAndPay}>
        {Object.entries(fields).map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-light)] bg-white p-4">
            <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Order summary</div>
            <div className="mt-2 text-lg font-black text-[var(--text-primary)]">{orderNumber}</div>
            <div className="mt-1 text-sm text-[var(--text-secondary)]">{totalItems} item{totalItems === 1 ? '' : 's'} · INR {amount.toFixed(2)}</div>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-[var(--border-light)] bg-white p-4 text-sm leading-7 text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[var(--border-light)]"
            />
            <span>
              I agree to the <Link href="/terms-and-conditions" className="text-[var(--brand-primary)] underline-offset-4 hover:underline">Terms &amp; Conditions</Link> and acknowledge the <Link href="/refund-policy" className="text-[var(--brand-primary)] underline-offset-4 hover:underline">Refund &amp; Cancellation Policy</Link>.
            </span>
          </label>

          <div className="rounded-2xl border border-[var(--border-light)] bg-white p-4 text-sm leading-7 text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)]">Payment handling</div>
            <p className="mt-2">
              The amount is calculated on the server. Flux 3D does not collect full card numbers, CVV, or UPI PINs. Payment is processed by PayU.
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--border-light)] bg-white p-4 text-sm leading-7 text-[var(--text-secondary)]">
            <div className="font-bold text-[var(--text-primary)]">Support</div>
            <p className="mt-2">
              <a href={`mailto:${supportEmail}`} className="text-[var(--brand-primary)] underline-offset-4 hover:underline">{supportEmail}</a>
              {' · '}
              <a href={`tel:${phoneDigits}`} className="text-[var(--brand-primary)] underline-offset-4 hover:underline">{supportPhone}</a>
            </p>
          </div>
        </div>

        {message && (
          <div role="status" aria-live="polite" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {message}
          </div>
        )}

        <button
          type="submit"
          disabled={!consent || submitting}
          className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-[var(--gradient-brand)] px-5 text-sm font-bold text-white shadow-[var(--shadow-brand)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? 'Redirecting to PayU...' : 'Proceed to PayU'}
        </button>

        <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">
          By continuing, you confirm that the order amount, delivery details, and the public policies shown on this site are correct for this order.
        </p>
      </form>
    </div>
  )
}
