'use client'

import { useEffect } from 'react'
import Link from 'next/link'
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="max-w-md text-center">
        <div className="mb-6 text-6xl">⚠️</div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Unexpected error</h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          Something went wrong. Our team has been notified. Please try again.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl bg-[#6d28d9] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#4c1d95]"
          >
            Try again
          </button>
          <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-gray-900">
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
