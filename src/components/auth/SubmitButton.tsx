'use client'

import { useFormStatus } from 'react-dom'
import { ArrowRight, Loader2 } from 'lucide-react'

type SubmitButtonProps = {
  idleLabel: string
  pendingLabel: string
}

export default function SubmitButton({
  idleLabel,
  pendingLabel,
}: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="premium-primary-cta group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-full px-5 text-sm font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span>{pending ? pendingLabel : idleLabel}</span>
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      )}
    </button>
  )
}
