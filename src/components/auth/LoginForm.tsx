'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from 'lucide-react'
import { loginAction } from '@/app/auth/actions'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AuthFormState } from '@/lib/auth/validation'

const initialState: AuthFormState = {}

const fieldClass =
  'h-11 w-full rounded-xl border border-white/12 bg-white/[0.075] px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition placeholder:text-white/35 focus:border-cyan-200/70 focus:bg-white/[0.11] focus:ring-4 focus:ring-cyan-300/10'

export type LoginFormProps = {
  nextPath: string
  errorMessage?: string
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null

  return (
    <div id={id} className="space-y-1">
      {errors.map((error) => (
        <p key={error} className="text-sm font-semibold !text-rose-200">
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
      ? 'border-emerald-300/25 bg-emerald-300/10 text-emerald-50'
      : 'border-rose-300/25 bg-rose-300/10 text-rose-50'

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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}

export default function LoginForm({ nextPath, errorMessage }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [state, action] = useActionState(loginAction, {
    ...initialState,
    message: errorMessage,
    status: errorMessage ? 'error' : undefined,
  })

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)

    const supabase = getSupabaseBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      nextPath
    )}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      setGoogleLoading(false)
      window.alert(error.message)
    }
  }

  return (
    <div className="auth-login-panel w-full min-w-0 text-white">
      <div className="premium-console-header mb-4">
        <span>Secure Login</span>
        <strong>READY</strong>
      </div>

      <div className="auth-login-brand mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex min-h-11 items-center rounded-xl border border-white/12 bg-white/90 px-3 shadow-[0_18px_46px_rgba(0,0,0,0.18)]">
          <Image
            src="/logo.webp"
            alt="Flux3D"
            width={120}
            height={28}
            sizes="120px"
            className="object-contain"
            style={{ width: 'auto', height: '25px' }}
          />
        </span>
        <div className="min-w-0">
          <h2 className="!text-[30px] font-black leading-[1.02] !text-white">Welcome back.</h2>
          <p className="mt-1 text-sm leading-6 text-white/58">
            Continue to your production workspace.
          </p>
        </div>
      </div>

      <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2">
        <p className="text-xs font-semibold leading-5 text-white/68">
          Saved quotes, private files, checkout details, and order tracking are ready after sign in.
        </p>
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="next" value={nextPath} />

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-bold text-white/78">
            Email address
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/54"
              aria-hidden="true"
            />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@company.com"
              aria-invalid={Boolean(state.fieldErrors?.email)}
              aria-describedby={state.fieldErrors?.email ? 'login-email-error' : undefined}
              className={`${fieldClass} pl-11`}
            />
          </div>
          <FieldError id="login-email-error" errors={state.fieldErrors?.email} />
        </div>

        <div className="space-y-2">
          <div className="auth-login-password-row flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-bold text-white/78">
              Password
            </label>
            <Link
              href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
              prefetch={false}
              className="text-sm font-bold text-cyan-200 transition-opacity duration-150 hover:opacity-80"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-100/54"
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
              className={`${fieldClass} pl-11 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl text-white/54 transition-opacity duration-150 hover:opacity-80"
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

      <div className="my-3 flex items-center gap-3 text-xs font-black uppercase tracking-[0.16em] text-white/36">
        <div className="h-px flex-1 bg-white/12" />
        or continue with
        <div className="h-px flex-1 bg-white/12" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.065] px-4 text-sm font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-white/22 hover:bg-white/[0.09] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting to Google...' : 'Google'}
      </button>

      <p className="mt-3 text-center text-sm !text-white/54">
        Don&apos;t have an account?{' '}
        <Link
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
          prefetch={false}
          className="font-bold text-cyan-200 transition-opacity duration-150 hover:opacity-80"
        >
          Create account
        </Link>
      </p>
    </div>
  )
}
