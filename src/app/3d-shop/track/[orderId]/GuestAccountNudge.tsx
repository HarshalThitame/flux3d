'use client'

import { useState } from 'react'
import { MailCheck, Send } from 'lucide-react'

type GuestAccountNudgeProps = {
  orderId: string
  emailHint: string
  /** Current tracking path incl. token query — validated server-side. */
  trackingUrl: string
}

/**
 * Post-purchase account nudge (optional, never blocking).
 *
 * Asks our server for a one-time magic link (Supabase-generated, delivered
 * via the Resend pipeline). Clicking it logs the guest in and claims their
 * guest order(s) onto the account — "prove inbox ownership, then link".
 */
export default function GuestAccountNudge({ orderId, trackingUrl }: GuestAccountNudgeProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function sendMagicLink() {
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setState('error')
      setMessage('Enter a valid email address.')
      return
    }

    setState('sending')
    try {
      // Uniform response by design — we can't tell (and won't reveal) whether
      // this email actually matched the order.
      const response = await fetch('/api/account/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          email: normalized,
          trackingPath: trackingUrl,
        }),
      })
      if (!response.ok) throw new Error('Could not send the login link.')
      setState('sent')
    } catch (err) {
      setState('error')
      setMessage(err instanceof Error ? err.message : 'Could not send the login link.')
    }
  }

  return (
    <section className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] p-5">
      {!open ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--shop-text-primary)]">Save this order to an account?</h2>
            <p className="mt-1 text-sm text-[var(--shop-text-secondary)]">
              Optional. Get order history, faster checkouts and returns in one place.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[var(--shop-text-primary)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)]"
          >
            <Send className="h-4 w-4" />
            Continue
          </button>
        </div>
      ) : state === 'sent' ? (
        <div className="flex items-start gap-3">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm leading-6 text-[var(--shop-text-secondary)]">
            <span className="font-bold text-[var(--shop-text-primary)]">Check your inbox.</span>{' '}
            We sent a one-time login link. Opening it will log you in and save order{' '}
            <span className="font-semibold">{orderId.slice(0, 8).toUpperCase()}</span> — plus any other pending orders — to your account.
            The link expires in 60 minutes.
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--shop-text-muted)]" htmlFor="nudge-email">
            Email address
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="nudge-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                if (state === 'error') setState('idle')
              }}
              placeholder="The email you used at checkout"
              className="min-h-[48px] flex-1 rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm text-[var(--shop-text-primary)] outline-none focus:border-[var(--shop-gold)]"
            />
            <button
              type="button"
              onClick={() => void sendMagicLink()}
              disabled={state === 'sending'}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--shop-text-secondary)] disabled:opacity-60"
            >
              {state === 'sending' ? 'Sending…' : 'Email me a login link'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-[48px] px-2 text-sm font-semibold text-[var(--shop-text-secondary)]"
            >
              No thanks
            </button>
          </div>
          {state === 'error' && <p className="mt-2 text-xs font-semibold text-rose-600">{message}</p>}
          <p className="mt-3 text-xs leading-5 text-[var(--shop-text-muted)]">
            We only link orders after you open the link from that inbox — your order is safe even if someone else types your email here.
          </p>
        </div>
      )}
    </section>
  )
}
