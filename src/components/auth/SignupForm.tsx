'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signupAction } from '@/app/auth/actions'
import type { AuthFormState } from '@/lib/auth/validation'
import AuthMessage from '@/components/auth/AuthMessage'
import OAuthButton from '@/components/auth/OAuthButton'
import SubmitButton from '@/components/auth/SubmitButton'

const initialState: AuthFormState = {}

type SignupFormProps = {
  nextPath: string
}

export default function SignupForm({ nextPath }: SignupFormProps) {
  const [state, action] = useActionState(signupAction, initialState)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">Create your account</h2>
        <p className="text-sm leading-7 text-[#8e97b7]">
          Set up secure access for uploads, saved quotes, and future production requests.
        </p>
      </div>

      <div className="space-y-3">
        <OAuthButton nextPath={nextPath} provider="google" />
      </div>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-[#67718e]">
        <div className="h-px flex-1 bg-white/10" />
        Or sign up with email
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm text-[#0F1B3D]">
            Full name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            placeholder="Ada Lovelace"
            className="w-full rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
          />
          {state.fieldErrors?.name?.map((error) => (
            <p key={error} className="text-sm text-rose-300">
              {error}
            </p>
          ))}
        </div>

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
            className="w-full rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
          />
          {state.fieldErrors?.email?.map((error) => (
            <p key={error} className="text-sm text-rose-300">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-[#0F1B3D]">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Strong password"
            className="w-full rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
          />
          {state.fieldErrors?.password?.map((error) => (
            <p key={error} className="text-sm text-rose-300">
              {error}
            </p>
          ))}
        </div>

        <AuthMessage state={state} />
        <SubmitButton idleLabel="Create Account" pendingLabel="Creating Account..." />
      </form>

      <div className="text-sm text-[#8e97b7]">
        Already have an account?{' '}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-[#0F1B3D] hover:text-[#a855f7]">
          Log in
        </Link>
      </div>
    </div>
  )
}
