'use client'

import { useEffect } from 'react'
import { RotateCcw } from 'lucide-react'

export default function ProductError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Product page error:', error)
  }, [error])

  return (
    <main className="px-4 pb-24 pt-6 md:px-8 lg:px-16 lg:pt-8">
      <div className="mx-auto grid min-h-[60vh] max-w-xl place-items-center">
        <div className="w-full rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-10 text-center shadow-[var(--shop-shadow-sm)]">
          <h1 className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--shop-text-secondary)]">
            We couldn&apos;t load this product right now. Please try again — the piece is still here.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] bg-[var(--shop-gold)] px-6 text-sm font-semibold text-white shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </main>
  )
}
