'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { loginAction } from '@/app/auth/actions'
import GoogleIdentityButton from '@/components/auth/GoogleIdentityButton'
import type { AuthFormState } from '@/lib/auth/validation'

const initialState: AuthFormState = {}

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
        <p key={error} className="luxe-error">
          {error}
        </p>
      ))}
    </div>
  )
}

function LoginMessage({ state }: { state: AuthFormState }) {
  if (!state.message) return null

  const tone =
    state.status === 'success' ? 'luxe-note--success' : 'luxe-note--error'

  return <div className={`luxe-note ${tone}`}>{state.message}</div>
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="luxe-cta inline-flex w-full items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <span>Signing in</span>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </>
      ) : (
        <span>Sign In</span>
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
    <div className="w-full min-w-0">
      <div className="luxe-brand-row">
        <Image
          src={logoUrl}
          alt="Flux3D"
          width={120}
          height={28}
          sizes="120px"
          className="object-contain"
          style={{ width: 'auto', height: '24px' }}
        />
        <span className="luxe-kicker">Members</span>
      </div>

      <h2 className="luxe-form-title">Welcome back.</h2>
      <p className="luxe-form-sub">Sign in to continue to Flux3D.</p>

      <form action={action} className="mt-7 grid gap-[18px]">
        <input type="hidden" name="next" value={nextPath} />

        <div>
          <label htmlFor="email" className="luxe-label">
            Email
          </label>
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
            className={`luxe-input ${state.fieldErrors?.email ? 'luxe-input--error' : ''}`}
          />
          <FieldError id="login-email-error" errors={state.fieldErrors?.email} />
        </div>

        <div>
          <div className="mb-[7px] flex items-center justify-between gap-3">
            <label htmlFor="password" className="luxe-label !mb-0">
              Password
            </label>
            <Link
              href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}
              prefetch={false}
              className="text-[13px] font-medium text-[rgba(7,11,29,0.45)] transition-colors duration-150 hover:text-[#a8803c]"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
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
              className={`luxe-input pr-14 ${state.fieldErrors?.password ? 'luxe-input--error' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="luxe-eye"
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

      <div className="luxe-divider">or continue with</div>

      <GoogleIdentityButton nextPath={nextPath} />

      <p className="luxe-alt">
        New to Flux3D?{' '}
        <Link
          href={`/signup?next=${encodeURIComponent(nextPath)}`}
          prefetch={false}
          className="luxe-link"
        >
          Create account
        </Link>
      </p>
    </div>
  )
}
