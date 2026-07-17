'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useMemo, useState, type FormEvent } from 'react'
import { useFormStatus } from 'react-dom'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react'
import { signupAction } from '@/app/auth/actions'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { AuthFormState } from '@/lib/auth/validation'
import { validateEmail, validateName, validatePassword } from '@/lib/auth/validation'

const initialState: AuthFormState = {}

const fieldClass =
  'h-11 w-full rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] px-3 text-sm font-medium text-white outline-none transition-[border-color] duration-150 placeholder:text-[#777] focus:border-[#67e8f9]'

const passwordRules = [
  (value: string) => value.length >= 8,
  (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value),
  (value: string) => /[0-9]/.test(value),
  (value: string) => /[^A-Za-z0-9]/.test(value),
]

type SignupFormProps = {
  nextPath: string
}

type RequiredField = 'name' | 'email' | 'password' | 'confirmPassword' | 'terms'

type SignupValues = {
  name: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  terms: boolean
}

const initialValues: SignupValues = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  terms: false,
}

const initialTouched: Record<RequiredField, boolean> = {
  name: false,
  email: false,
  password: false,
  confirmPassword: false,
  terms: false,
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null

  return (
    <div id={id} className="space-y-1">
      {errors.map((error) => (
        <p key={error} className="text-sm font-medium !text-[#ef4444]">
          {error}
        </p>
      ))}
    </div>
  )
}

function SignupMessage({ state, oauthError }: { state: AuthFormState; oauthError?: string }) {
  const message = oauthError || state.message
  if (!message) return null

  const tone =
    state.status === 'success' && !oauthError
      ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
      : 'border-red-400/25 bg-red-400/10 text-red-100'

  return <div className={`rounded-lg border px-3 py-2.5 text-sm ${tone}`}>{message}</div>
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00c896] px-4 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          Creating account
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </>
      ) : (
        <>
          Create Account
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
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

function getStrengthColor(score: number) {
  if (score <= 1) return 'bg-[#ef4444]'
  if (score < 4) return 'bg-amber-400'
  return 'bg-[#00c896]'
}

export default function SignupForm({ nextPath }: SignupFormProps) {
  const [state, action] = useActionState(signupAction, initialState)
  const [values, setValues] = useState<SignupValues>(initialValues)
  const [touched, setTouched] = useState<Record<RequiredField, boolean>>(initialTouched)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [oauthError, setOauthError] = useState<string>()

  const validationErrors = useMemo<Partial<Record<RequiredField, string[]>>>(() => {
    const errors: Partial<Record<RequiredField, string[]>> = {}

    const nameErrors = validateName(values.name.trim())
    if (nameErrors.length) errors.name = nameErrors

    if (!validateEmail(values.email.trim().toLowerCase())) {
      errors.email = ['Enter a valid email address.']
    }

    const passwordErrors = validatePassword(values.password)
    if (passwordErrors.length) errors.password = passwordErrors

    if (!values.confirmPassword) {
      errors.confirmPassword = ['Confirm your password.']
    } else if (values.password !== values.confirmPassword) {
      errors.confirmPassword = ['Passwords do not match.']
    }

    if (!values.terms) {
      errors.terms = ['Accept the terms to create your account.']
    }

    return errors
  }, [values])

  const passwordStrength = passwordRules.reduce(
    (score, rule) => score + (rule(values.password) ? 1 : 0),
    0
  )
  const strengthColor = getStrengthColor(passwordStrength)
  const passwordsMatch = Boolean(values.password && values.confirmPassword && values.password === values.confirmPassword)
  const isFormValid = Object.keys(validationErrors).length === 0

  const getFieldErrors = (field: RequiredField) => {
    return state.fieldErrors?.[field] || (touched[field] ? validationErrors[field] : undefined)
  }

  const touchField = (field: RequiredField) => {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (isFormValid) return

    event.preventDefault()
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
      terms: true,
    })
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setOauthError(undefined)

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
      setOauthError(error.message)
    }
  }

  return (
    <div className="w-full min-w-0 max-w-[342px] sm:max-w-[420px]">
      <div className="mb-8 flex items-center gap-3">
        <Image
          src="/logo.webp"
          alt="Flux3D"
          width={120}
          height={28}
          sizes="120px"
          className="h-7 w-auto object-contain"
        />
        <span className="text-sm font-medium !text-[#888]">Create your account</span>
      </div>

      <div className="mb-6">
        <h2 className="text-[28px] font-medium leading-tight !text-white">Join Flux3D.</h2>
        <p className="mt-2 text-[15px] leading-6 !text-[#888]">
          Your production workspace, ready in seconds.
        </p>
      </div>

      <form action={action} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={nextPath} />

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium text-white/80">
            Full name
          </label>
          <div className="relative">
            <UserRound
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]"
              aria-hidden="true"
            />
            <input
              id="name"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="Ada Lovelace"
              value={values.name}
              onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              onBlur={() => touchField('name')}
              aria-invalid={Boolean(getFieldErrors('name'))}
              aria-describedby={getFieldErrors('name') ? 'signup-name-error' : undefined}
              className={`${fieldClass} pl-10`}
            />
          </div>
          <FieldError id="signup-name-error" errors={getFieldErrors('name')} />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-white/80">
            Email address
          </label>
          <div className="relative">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]"
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
              value={values.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
              onBlur={() => touchField('email')}
              aria-invalid={Boolean(getFieldErrors('email'))}
              aria-describedby={getFieldErrors('email') ? 'signup-email-error' : undefined}
              className={`${fieldClass} pl-10`}
            />
          </div>
          <FieldError id="signup-email-error" errors={getFieldErrors('email')} />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="flex items-center gap-2 text-sm font-medium text-white/80">
            Phone number <span className="text-xs font-medium !text-[#888]">(optional)</span>
          </label>
          <div className="relative">
            <Phone
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]"
              aria-hidden="true"
            />
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={24}
              placeholder="+91 98765 43210"
              value={values.phone}
              onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
              className={`${fieldClass} pl-10`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-white/80">
            Password
          </label>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]"
              aria-hidden="true"
            />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              placeholder="Strong password"
              value={values.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
              onBlur={() => touchField('password')}
              aria-invalid={Boolean(getFieldErrors('password'))}
              aria-describedby={getFieldErrors('password') ? 'signup-password-error' : undefined}
              className={`${fieldClass} pl-10 pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#888] transition-opacity duration-150 hover:opacity-80"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1" aria-hidden="true">
            {[0, 1, 2, 3].map((segment) => (
              <span key={segment} className="h-1 overflow-hidden rounded-full bg-[#2a2a2a]">
                <span
                  className={`block h-full rounded-full transition-[width,background-color] duration-200 ${strengthColor}`}
                  style={{ width: passwordStrength > segment ? '100%' : '0%' }}
                />
              </span>
            ))}
          </div>

          <FieldError id="signup-password-error" errors={getFieldErrors('password')} />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium text-white/80">
            Confirm password
          </label>
          <div className="relative">
            <LockKeyhole
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#777]"
              aria-hidden="true"
            />
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              maxLength={128}
              placeholder="Repeat password"
              value={values.confirmPassword}
              onChange={(event) => setValues((current) => ({ ...current, confirmPassword: event.target.value }))}
              onBlur={() => touchField('confirmPassword')}
              aria-invalid={Boolean(getFieldErrors('confirmPassword'))}
              aria-describedby={
                getFieldErrors('confirmPassword') ? 'signup-confirm-password-error' : undefined
              }
              className={`${fieldClass} pl-10 pr-20`}
            />
            {passwordsMatch ? (
              <Check
                className="pointer-events-none absolute right-10 top-1/2 h-4 w-4 -translate-y-1/2 text-[#00c896]"
                aria-hidden="true"
              />
            ) : null}
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#888] transition-opacity duration-150 hover:opacity-80"
            >
              {showConfirmPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <FieldError id="signup-confirm-password-error" errors={getFieldErrors('confirmPassword')} />
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 text-[13px] leading-6 !text-[#888]" htmlFor="terms">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              checked={values.terms}
              onChange={(event) => {
                setValues((current) => ({ ...current, terms: event.target.checked }))
                touchField('terms')
              }}
              aria-invalid={Boolean(getFieldErrors('terms'))}
              aria-describedby={getFieldErrors('terms') ? 'signup-terms-error' : undefined}
              className="mt-1 h-4 w-4 rounded border border-[#2a2a2a] bg-[#1a1a1a] accent-[#00c896]"
            />
            <span>
              I agree to the{' '}
              <Link
                href="/terms-and-conditions"
                prefetch={false}
                className="font-medium text-[#67e8f9] transition-opacity duration-150 hover:opacity-80"
              >
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy-policy"
                prefetch={false}
                className="font-medium text-[#67e8f9] transition-opacity duration-150 hover:opacity-80"
              >
                Privacy Policy
              </Link>
            </span>
          </label>
          <FieldError id="signup-terms-error" errors={getFieldErrors('terms')} />
        </div>

        <SignupMessage state={state} oauthError={oauthError} />
        <SubmitButton disabled={!isFormValid} />
      </form>

      <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-[#777]">
        <div className="h-px flex-1 bg-[#2a2a2a]" />
        or sign up with
        <div className="h-px flex-1 bg-[#2a2a2a]" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#2a2a2a] bg-transparent px-4 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? 'Redirecting to Google...' : 'Google'}
      </button>

      <p className="mt-8 text-center text-sm !text-[#888]">
        Already have an account?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(nextPath)}`}
          prefetch={false}
          className="font-medium text-[#67e8f9] transition-opacity duration-150 hover:opacity-80"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
