'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ConfirmContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token') ?? ''
  const [state, setState] = useState<'loading' | 'done' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!token) {
        if (!cancelled) {
          setState('error')
          setError('Missing confirmation token.')
        }
        return
      }
      try {
        const res = await fetch('/api/me/delete/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const body = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setState('error')
          setError(body?.error ?? 'Account deletion failed.')
          return
        }
        setState('done')
      } catch {
        if (!cancelled) {
          setState('error')
          setError('Account deletion failed. Please try again.')
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      {state === 'loading' && (
        <>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Processing your request…</h1>
          <p className="mt-3 text-sm text-[#6F7192]">Please wait while we confirm your account deletion.</p>
        </>
      )}

      {state === 'done' && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">
            ✓
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[#0F1B3D]">Account deleted</h1>
          <p className="mt-3 text-sm leading-7 text-[#6F7192]">
            Your personal data has been removed and your order history has been anonymized for
            legal and tax compliance. You have been signed out.
          </p>
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mt-6 rounded-lg bg-[#6d28d9] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#5a1fb5]"
          >
            Back to home
          </button>
        </>
      )}

      {state === 'error' && (
        <>
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-2xl">
            !
          </div>
          <h1 className="mt-4 text-2xl font-bold text-[#0F1B3D]">Deletion could not be completed</h1>
          <p className="mt-3 text-sm leading-7 text-[#6F7192]">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="mt-6 rounded-lg bg-[#0F1B3D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1a2a52]"
          >
            Go to profile
          </button>
        </>
      )}
    </div>
  )
}

export default function AccountDeleteConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  )
}