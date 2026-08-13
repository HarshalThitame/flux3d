'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useEffect, useState, type FormEvent } from 'react'
import { useFormStatus } from 'react-dom'
import { ArrowLeft, ArrowRight, Loader2, Mail } from 'lucide-react'
import { forgotPasswordAction } from '@/app/auth/actions'
import type { AuthFormState } from '@/lib/auth/validation'
import { validateEmail } from '@/lib/auth/validation'

const initialState: AuthFormState = {}

const fieldClass =
  'h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-[#070b1d] outline-none transition-[border-color] duration-150 placeholder:text-[#9CA3AF] focus:border-[#6d28d9]'

const errorFieldClass =
  'h-11 w-full rounded-lg border bg-white px-3 text-sm font-medium text-[#070b1d] outline-none transition-[border-color] duration-150 placeholder:text-[#9CA3AF] border-red-400 ring-1 ring-red-400/30 focus:border-red-500'

type ForgotPasswordFormProps = {
  nextPath: string
  logoUrl?: string
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null

  return (
    <p id={id} className="text-sm font-medium !text-[#ef4444]">
      {error}
    </p>
  )
}

function RequestButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#00c896] px-4 text-sm font-semibold text-[#043a2d] shadow-[var(--shadow-soft)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          Sending...
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </>
      ) : (
        <>
          Send Reset Link
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </>
      )}
    </button>
  )
}

function ResendButton({ countdown }: { countdown: number }) {
  const { pending } = useFormStatus()
  const disabled = pending || countdown > 0

  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-[#070b1d] transition-opacity duration-150 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          Sending...
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </>
      ) : countdown > 0 ? (
        `Resend in ${countdown}s`
      ) : (
        'Resend Email'
      )}
    </button>
  )
}

function FormMessage({ state }: { state: AuthFormState }) {
  if (!state.message || state.status === 'success') return null

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
      {state.message}
    </div>
  )
}

function getEmailError(email: string) {
  const normalized = email.trim()

  if (!normalized) {
    return 'Enter your email address.'
  }

  if (!validateEmail(normalized.toLowerCase())) {
    return 'Please enter a valid email address'
  }

  return undefined
}

export default function ForgotPasswordForm({ nextPath, logoUrl = '/logo.webp' }: ForgotPasswordFormProps) {
  const [state, action] = useActionState(forgotPasswordAction, initialState)
  const [email, setEmail] = useState('')
  const [pendingEmail, setPendingEmail] = useState('')
  const [confirmedEmail, setConfirmedEmail] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const [countdown, setCountdown] = useState(0)
  const [contentVisible, setContentVisible] = useState(true)

  useEffect(() => {
    if (state.status !== 'success' || !pendingEmail) return

    if (confirmedEmail) return

    const fadeTimeout = window.setTimeout(() => {
      setContentVisible(false)
    }, 0)
    const swapTimeout = window.setTimeout(() => {
      setConfirmedEmail(pendingEmail)
      setCountdown(60)
      setContentVisible(true)
    }, 150)

    return () => {
      window.clearTimeout(fadeTimeout)
      window.clearTimeout(swapTimeout)
    }
  }, [confirmedEmail, pendingEmail, state.status])

  useEffect(() => {
    if (countdown <= 0) return

    const timeout = window.setTimeout(() => {
      setCountdown((current) => Math.max(current - 1, 0))
    }, 1000)

    return () => window.clearTimeout(timeout)
  }, [countdown])

  const handleRequestSubmit = (event: FormEvent<HTMLFormElement>) => {
    const error = getEmailError(email)

    if (error) {
      event.preventDefault()
      setEmailError(error)
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    setEmail(normalizedEmail)
    setPendingEmail(normalizedEmail)
    setEmailError(undefined)
  }

  const handleResendSubmit = () => {
    setPendingEmail(confirmedEmail)
    setCountdown(60)
  }

  const serverEmailError = state.fieldErrors?.email?.[0]
  const displayedEmailError = emailError || serverEmailError

  return (
    <div className="w-full min-w-0 max-w-[342px] sm:max-w-[420px]">
      <div className={`transition-opacity duration-150 ${contentVisible ? 'opacity-100' : 'opacity-0'}`}>
        {!confirmedEmail ? (
          <>
            <div className="mb-10 flex items-center gap-3">
              <Image
                src={logoUrl}
                alt="Flux3D"
                width={120}
                height={28}
                sizes="120px"
                className="h-7 w-auto object-contain"
              />
              <span className="text-sm font-medium !text-[#6F7192]">Account recovery</span>
            </div>

            <div className="mb-7">
              <h2 className="text-[28px] font-medium leading-tight !text-[#070b1d]">
                Reset your password.
              </h2>
              <p className="mt-2 text-[15px] leading-6 !text-[#6F7192]">
                Enter the email address linked to your account and we&apos;ll send you a reset link.
              </p>
            </div>

            <form action={action} onSubmit={handleRequestSubmit} className="space-y-4" noValidate>
              <input type="hidden" name="next" value={nextPath} />

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-[#475569]">
                  Email address
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
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
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      if (displayedEmailError) {
                        setEmailError(undefined)
                      }
                    }}
                    aria-invalid={Boolean(displayedEmailError)}
                    aria-describedby={displayedEmailError ? 'forgot-email-error' : undefined}
                    className={`${displayedEmailError ? errorFieldClass : fieldClass} pl-10`}
                  />
                </div>
                <FieldError id="forgot-email-error" error={displayedEmailError} />
              </div>

              <FormMessage state={state} />
              <RequestButton />
            </form>

            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              prefetch={false}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#6d28d9] transition-opacity duration-150 hover:opacity-80"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <div className="mb-7 flex justify-center">
              <Mail className="h-12 w-12 text-[#6d28d9]" aria-hidden="true" />
            </div>

            <div className="mb-6 text-center">
              <h2 className="text-[28px] font-medium leading-tight !text-[#070b1d]">
                Check your inbox.
              </h2>
              <p className="mt-3 text-[15px] leading-7 !text-[#6F7192]">
                We sent a reset link to{' '}
                <span className="font-medium text-[#6d28d9]">{confirmedEmail}</span>
              </p>
              <p className="mt-3 text-sm leading-6 !text-[#6F7192]">
                Didn&apos;t receive it? Check your spam folder or wait 60 seconds before resending.
              </p>
            </div>

            <form action={action} onSubmit={handleResendSubmit} className="space-y-4">
              <input type="hidden" name="next" value={nextPath} />
              <input type="hidden" name="email" value={confirmedEmail} />
              <FormMessage state={state} />
              <ResendButton countdown={countdown} />
            </form>

            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
              prefetch={false}
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[#6d28d9] transition-opacity duration-150 hover:opacity-80"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
