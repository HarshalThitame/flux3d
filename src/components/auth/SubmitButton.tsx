'use client'

import { useFormStatus } from 'react-dom'

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
      className="inline-flex w-full items-center justify-center rounded-2xl bg-[#FF5C1A] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  )
}
