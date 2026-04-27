'use client'

import type { MouseEvent } from 'react'
import { useFormStatus } from 'react-dom'

type DeleteSavedQuoteButtonProps = {
  quoteLabel: string
}

export default function DeleteSavedQuoteButton({
  quoteLabel,
}: DeleteSavedQuoteButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        if (!window.confirm(`Delete ${quoteLabel}? This cannot be undone.`)) {
          event.preventDefault()
        }
      }}
      className="inline-flex rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? 'Deleting...' : 'Delete quote'}
    </button>
  )
}
