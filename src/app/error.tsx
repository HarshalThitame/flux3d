'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TriangleAlert } from 'lucide-react'
import { logError } from '@/lib/tracking/errorLogger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError({
      error_message: error.message,
      stack_trace: error.stack ?? '',
      page_url: typeof window !== 'undefined' ? window.location.pathname : null,
      device_info: { digest: error.digest },
    })
  }, [error])

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f9f7f4] px-6">
      <div className="animate-orb-1 pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#6d28d9]/10 blur-3xl" />
      <div className="animate-orb-2 pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#d4af37]/10 blur-3xl" />
      <div className="animate-orb-3 pointer-events-none absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-[#a855f7]/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md text-center"
      >
        <div className="liquid-morph-wordmark text-2xl font-bold tracking-[0.28em] sm:text-3xl">FLUX3D</div>

        <div className="mx-auto mt-10 grid h-20 w-20 place-items-center rounded-2xl border border-[#d4af37]/30 bg-gradient-to-br from-[#faf4df] to-white text-[#d4af37] shadow-[var(--shadow-gold-glow)]">
          <TriangleAlert className="h-9 w-9" />
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-[#070b1d]">Unexpected error</h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">
          Something went wrong. Our team has been notified. Please try again.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <button type="button" onClick={() => reset()} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="text-sm font-semibold text-[#6d28d9] transition-colors hover:text-[#4c1d95]">
            Go home
          </Link>
        </div>
      </motion.div>
    </main>
  )
}
