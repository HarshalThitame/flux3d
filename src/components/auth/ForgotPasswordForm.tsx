'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { forgotPasswordAction } from '@/app/auth/actions'
import type { AuthFormState } from '@/lib/auth/validation'
import AuthMessage from '@/components/auth/AuthMessage'
import SubmitButton from '@/components/auth/SubmitButton'

const initialState: AuthFormState = {}

type ForgotPasswordFormProps = {
  nextPath: string
}

export default function ForgotPasswordForm({ nextPath }: ForgotPasswordFormProps) {
  const [state, action] = useActionState(forgotPasswordAction, initialState)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">Reset password</h2>
        <p className="text-sm leading-7 text-[#8e97b7]">
          Enter the email tied to your account and we&apos;ll send you a secure reset link.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-[#0F1B3D]">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
          />
          {state.fieldErrors?.email?.map((error) => (
            <p key={error} className="text-sm text-rose-300">
              {error}
            </p>
          ))}
        </div>

        <AuthMessage state={state} />
        <SubmitButton idleLabel="Send Reset Link" pendingLabel="Sending Reset Link..." />
      </form>

      <div className="text-sm text-[#8e97b7]">
        Remembered it?{' '}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-[#0F1B3D] hover:text-[#A78BFA]">
          Return to login
        </Link>
      </div>
    </div>
  )
}
