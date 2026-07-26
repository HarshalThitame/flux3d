'use client'

import { useState } from 'react'
import { Bell, CheckCircle2, Loader2 } from 'lucide-react'

export default function NotifyMeForm({
  productId,
  skuId,
  variantLabel,
  initialEmail = '',
}: {
  productId: string
  skuId: string
  variantLabel: string
  initialEmail?: string
}) {
  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/3d-shop/notify-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, skuId, email }),
      })
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string; message?: string }

      if (!response.ok && !String(data.error || '').toLowerCase().includes('already')) {
        throw new Error(data.error || 'Could not save your request.')
      }

      setSuccess(true)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save your request.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="mt-6 rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] p-4 text-sm font-semibold text-[var(--shop-gold)]">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span>You&apos;re on the list! We&apos;ll notify you when {variantLabel} is back in stock.</span>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-6 rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-4">
      <div className="mb-3 flex items-center gap-2 font-semibold text-[var(--shop-text-primary)]">
        <Bell className="h-5 w-5 text-[var(--shop-gold)]" />
        Notify Me When Available
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Email address"
          className="min-h-[46px] min-w-0 flex-1 rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm outline-none transition focus:border-[var(--shop-gold)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-[var(--shop-gold)] px-4 text-sm font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Notify Me
        </button>
      </div>
      <p className="mt-2 text-sm text-[var(--shop-text-muted)]">We&apos;ll email you the moment it&apos;s back.</p>
      {error && <p className="mt-2 text-sm font-semibold text-rose-700">{error}</p>}
    </form>
  )
}
