'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useMemo, useState, type FormEvent } from 'react'
import { useFormStatus } from 'react-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { signupAction } from '@/app/auth/actions'
import GoogleIdentityButton from '@/components/auth/GoogleIdentityButton'
import type { AuthFormState } from '@/lib/auth/validation'
import { validateEmail, validateName, validatePassword } from '@/lib/auth/validation'

const initialState: AuthFormState = {}

const passwordRules = [
  (value: string) => value.length >= 8,
  (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value),
  (value: string) => /[0-9]/.test(value),
  (value: string) => /[^A-Za-z0-9]/.test(value),
]

type SignupFormProps = {
  nextPath: string
  logoUrl?: string
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
        <p key={error} className="luxe-error">
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
    state.status === 'success' && !oauthError ? 'luxe-note--success' : 'luxe-note--error'

  return <div className={`luxe-note ${tone}`}>{message}</div>
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="luxe-cta inline-flex w-full items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <span>Creating account</span>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </>
      ) : (
        <span>Create Account</span>
      )}
    </button>
  )
}

function getStrengthLevel(score: number) {
  if (score <= 1) return 'weak'
  if (score < 4) return 'fair'
  return 'strong'
}

export default function SignupForm({ nextPath, logoUrl = '/logo.webp' }: SignupFormProps) {
  const [state, action] = useActionState(signupAction, initialState)
  const [values, setValues] = useState<SignupValues>(initialValues)
  const [touched, setTouched] = useState<Record<RequiredField, boolean>>(initialTouched)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
  const strengthLevel = getStrengthLevel(passwordStrength)
  const isFormValid = Object.keys(validationErrors).length === 0

  const getFieldErrors = (field: RequiredField) => {
    return state.fieldErrors?.[field] || (touched[field] ? validationErrors[field] : undefined)
  }

  const hasFieldError = (field: RequiredField) => Boolean(getFieldErrors(field))

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

  return (
    <div className="w-full min-w-0">
      <div className="luxe-brand-row">
        <Image
          src={logoUrl}
          alt="Flux3D"
          width={120}
          height={28}
          sizes="120px"
          priority
          className="object-contain"
          style={{ width: 'auto', height: '24px' }}
        />
        <span className="luxe-kicker">Free to join</span>
      </div>

      <h2 className="luxe-form-title">Create your account.</h2>
      <p className="luxe-form-sub">Your studio, ready in seconds.</p>

      <form action={action} onSubmit={handleSubmit} className="mt-7 grid gap-[18px]" noValidate>
        <input type="hidden" name="next" value={nextPath} />

        <div>
          <label htmlFor="name" className="luxe-label">
            Full name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
            placeholder="e.g. Rahul Sharma"
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            onBlur={() => touchField('name')}
            aria-invalid={hasFieldError('name')}
            aria-describedby={getFieldErrors('name') ? 'signup-name-error' : undefined}
            className={`luxe-input ${hasFieldError('name') ? 'luxe-input--error' : ''}`}
          />
          <FieldError id="signup-name-error" errors={getFieldErrors('name')} />
        </div>

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
            value={values.email}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            onBlur={() => touchField('email')}
            aria-invalid={hasFieldError('email')}
            aria-describedby={getFieldErrors('email') ? 'signup-email-error' : undefined}
            className={`luxe-input ${hasFieldError('email') ? 'luxe-input--error' : ''}`}
          />
          <FieldError id="signup-email-error" errors={getFieldErrors('email')} />
        </div>

        <div>
          <label htmlFor="phone" className="luxe-label">
            Phone <span className="font-normal text-[rgba(7,11,29,0.35)]">(optional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={24}
            placeholder="+91 98765 43210"
            value={values.phone}
            onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
            className="luxe-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="luxe-label">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              placeholder="Create a strong password"
              value={values.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
              onBlur={() => touchField('password')}
              aria-invalid={hasFieldError('password')}
              aria-describedby={
                getFieldErrors('password')
                  ? 'signup-password-error signup-password-meter'
                  : 'signup-password-meter'
              }
              className={`luxe-input pr-14 ${hasFieldError('password') ? 'luxe-input--error' : ''}`}
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

          {values.password ? (
            <div
              id="signup-password-meter"
              className="luxe-meter mt-[10px]"
              role="status"
              aria-label={`Password strength: ${strengthLevel}`}
            >
              <span data-strength={strengthLevel} style={{ width: `${passwordStrength * 25}%` }} />
            </div>
          ) : null}

          <FieldError id="signup-password-error" errors={getFieldErrors('password')} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="luxe-label">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              maxLength={128}
              placeholder="Re-enter password"
              value={values.confirmPassword}
              onChange={(event) =>
                setValues((current) => ({ ...current, confirmPassword: event.target.value }))
              }
              onBlur={() => touchField('confirmPassword')}
              aria-invalid={hasFieldError('confirmPassword')}
              aria-describedby={getFieldErrors('confirmPassword') ? 'signup-confirm-password-error' : undefined}
              className={`luxe-input pr-14 ${hasFieldError('confirmPassword') ? 'luxe-input--error' : ''}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
              className="luxe-eye"
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

        <div>
          <label className="flex items-start gap-3 text-[13px] leading-6 text-[rgba(7,11,29,0.55)]" htmlFor="terms">
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
              className="luxe-check mt-[5px]"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms-and-conditions" prefetch={false} className="luxe-link">
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link href="/privacy-policy" prefetch={false} className="luxe-link">
                Privacy Policy
              </Link>
            </span>
          </label>
          <FieldError id="signup-terms-error" errors={getFieldErrors('terms')} />
        </div>

        <SignupMessage state={state} oauthError={oauthError} />
        <SubmitButton disabled={!isFormValid} />
      </form>

      <div className="luxe-divider">or sign up with</div>

      <GoogleIdentityButton nextPath={nextPath} />

      <p className="luxe-alt">
        Already have an account?{' '}
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} prefetch={false} className="luxe-link">
          Sign in
        </Link>
      </p>
    </div>
  )
}
