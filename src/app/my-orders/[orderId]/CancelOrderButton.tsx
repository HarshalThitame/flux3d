'use client'

import { useState } from 'react'

function Spinner() {
  return (
    <svg className="animate-spin -ml-1 mr-1.5 h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [cancelling, setCancelling] = useState(false)

  return (
    <button
      type="button"
      disabled={cancelling}
      onClick={async () => {
        setCancelling(true)
        try {
          const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' })
          if (!res.ok) {
            const body = await res.json().catch(() => null)
            throw new Error(body?.error ?? `Server error (${res.status})`)
          }
          window.location.reload()
        } catch (e) {
          alert(e instanceof Error ? e.message : 'Failed to cancel order')
          setCancelling(false)
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-600 transition-all hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {cancelling ? <><Spinner />Cancelling...</> : 'Cancel Order'}
    </button>
  )
}
