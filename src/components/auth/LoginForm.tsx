'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { loginAction } from '@/app/auth/actions'
import GoogleIdentityButton from '@/components/auth/GoogleIdentityButton'
import type { AuthFormState } from '@/lib/auth/validation'

const initialState: AuthFormState = {}

const fieldClass =
  'h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-[#070b1d] shadow-sm outline-none transition placeholder:text-gray-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100'

const errorFieldClass =
  'h-11 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-[#070b1d] shadow-sm outline-none transition placeholder:text-gray-400 border-red-400 ring-1 ring-red-400/30 focus:border-red-500 focus:ring-red-200'

export type LoginFormProps = {
  nextPath: string
  errorMessage?: string
  logoUrl?: string
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null

  return (
    <div id={id} className="space-y-1">
      {errors.map((error) => (
        <p key={error} className="text-sm font-semibold !text-red-500">
          {error}
        </p>
      ))}
    </div>
  )
}

function LoginMessage({ state }: { state: AuthFormState }) {
  if (!state.message) return null

  const tone =
    state.status === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${tone}`}>{state.message}</div>
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="premium-primary-cta relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-4 text-sm font-black text-white transition-opacity duration-150 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <span className="relative z-10">Signing in</span>
          <Loader2 className="relative z-10 h-4 w-4 animate-spin" aria-hidden="true" />
        </>
      ) : (
        <>
          <span className="relative z-10">Sign In</span>
          <ArrowRight className="relative z-10 h-4 w-4" aria-hidden="true" />
        </>
      )}
    </button>
  )
}

export default function LoginForm({ nextPath, errorMessage, logoUrl = '/logo.webp' }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [state, action] = useActionState(loginAction, {
    ...initialState,
    message: errorMessage,
    status: errorMessage ? 'error' : undefined,
  })

  return (
    <div className="auth-login-panel w-full min-w-0">
      <div className="premium-console-header mb-4">
        <span>Secure Login</span>
        <strong>READY</strong>
      </div>

      <div className="auth-login-brand mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex min-h-11 items-center rounded-xl border border-gray-200 bg-white px-3 shadow-sm">
          <Image
            src={logoUrl}
            alt="Flux3D"
            width={120}
            height={28}
            sizes="120px"
            className="object-contain"
            style={{ width: 'auto', height: '25px' }}
          />
        </span>
        <div className="min-w-0">
          <h2 className="!text-[30px] font-black leading-[1.02] !text-[#070b1d]">Welcome back.</h2>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Continue to your production workspace.
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-purple-100 bg-purple-50 px-3 py-2">
        <p className="text-xs font-semibold leading-5 text-purple-800">
          Saved quotes, private files, checkout details, and order tracking are ready after sign in.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={nextPath} />

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-bold text-gray-700">
            Email address
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="yourname@email.com"
              aria-invalid={Boolean(state.fieldErrors?.email)}
              aria-describedby={state.fieldErrors?.email ? 'login-email-error' : undefined}
              className={`${state.fieldErrors?.email ? errorFieldClass : fieldClass} pl-11`}
            />
          </div>
          <FieldError id="login-email-error" errors={state.fieldErrors?.email} />
        </div>

        <div className="space-y-2">
          <div className="auth-login-password-row flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-bold text-gray-700">
              Password
            </label>
            <Link
              href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
              prefetch={false}
              className="text-sm font-bold text-purple-600 transition-opacity duration-150 hover:opacity-80"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={128}
              placeholder="Enter your password"
              aria-invalid={Boolean(state.fieldErrors?.password)}
              aria-describedby={state.fieldErrors?.password ? 'login-password-error' : undefined}
              className={`${state.fieldErrors?.password ? errorFieldClass : fieldClass} pl-11 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-gray-400 transition-opacity duration-150 hover:opacity-80"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <FieldError id="login-password-error" errors={state.fieldErrors?.password} />
        </div>

        <LoginMessage state={state} />
        <SubmitButton />
      </form>

      <div className="my-3 flex items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or continue with
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleIdentityButton nextPath={nextPath} />

      <p className="mt-3 text-center text-sm !text-gray-500">
        Don&apos;t have an account?{' '}
        <Link
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
          prefetch={false}
          className="font-bold text-purple-600 transition-opacity duration-150 hover:opacity-80"
        >
          Create account
        </Link>
      </p>
    </div>
  )
}
