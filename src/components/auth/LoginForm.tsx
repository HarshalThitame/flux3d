'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { loginAction } from '@/app/auth/actions'
import type { AuthFormState } from '@/lib/auth/validation'
import AuthMessage from '@/components/auth/AuthMessage'
import OAuthButton from '@/components/auth/OAuthButton'
import SubmitButton from '@/components/auth/SubmitButton'

const initialState: AuthFormState = {}

type LoginFormProps = {
  nextPath: string
  errorMessage?: string
}

export default function LoginForm({ nextPath, errorMessage }: LoginFormProps) {
  const [state, action] = useActionState(loginAction, {
    ...initialState,
    message: errorMessage,
    status: errorMessage ? 'error' : undefined,
  })

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-[var(--font-syne)] text-3xl font-bold text-white">Welcome back</h2>
        <p className="text-sm leading-7 text-[#8e97b7]">
          Log in to upload models, save quotes, and access your production history.
        </p>
      </div>

      <OAuthButton nextPath={nextPath} />

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-[#67718e]">
        <div className="h-px flex-1 bg-white/10" />
        Or continue with email
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm text-white">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-3 text-sm text-white outline-none placeholder:text-[#66708e]"
          />
          {state.fieldErrors?.email?.map((error) => (
            <p key={error} className="text-sm text-rose-300">
              {error}
            </p>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-white">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="w-full rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-3 text-sm text-white outline-none placeholder:text-[#66708e]"
          />
          {state.fieldErrors?.password?.map((error) => (
            <p key={error} className="text-sm text-rose-300">
              {error}
            </p>
          ))}
        </div>

        <AuthMessage state={state} />
        <SubmitButton idleLabel="Log In" pendingLabel="Logging In..." />
      </form>

      <div className="flex items-center justify-between text-sm text-[#8e97b7]">
        <Link href={`/forgot-password?next=${encodeURIComponent(nextPath)}`} className="hover:text-white">
          Forgot password?
        </Link>
        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="hover:text-white">
          Create account
        </Link>
      </div>
    </div>
  )
}
