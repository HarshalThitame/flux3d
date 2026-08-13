'use client'

import { useActionState, useMemo, useState, type FormEvent } from 'react'
import { updatePasswordAction } from '@/app/auth/actions'
import type { AuthFormState } from '@/lib/auth/validation'
import { validatePassword } from '@/lib/auth/validation'
import AuthMessage from '@/components/auth/AuthMessage'
import SubmitButton from '@/components/auth/SubmitButton'

const initialState: AuthFormState = {}
const fieldClass =
  'h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#070b1d] shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100'

const errorFieldClass =
  'h-12 w-full rounded-xl border bg-white px-4 text-sm font-semibold text-[#070b1d] shadow-sm outline-none transition placeholder:text-gray-400 border-red-400 ring-1 ring-red-400/30 focus:border-red-500 focus:ring-red-200'

type UpdatePasswordFormProps = {
  nextPath: string
}

export default function UpdatePasswordForm({ nextPath }: UpdatePasswordFormProps) {
  const [state, action] = useActionState(updatePasswordAction, initialState)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [touched, setTouched] = useState(false)

  const passwordErrors = useMemo(() => {
    if (!touched) return []
    return validatePassword(password)
  }, [password, touched])

  const confirmErrors = useMemo(() => {
    if (!touched || !confirmPassword) return []
    if (password !== confirmPassword) return ['Passwords do not match.']
    return []
  }, [password, confirmPassword, touched])

  const hasPasswordError = passwordErrors.length > 0
  const hasConfirmError = confirmErrors.length > 0
  const serverErrors = state.fieldErrors?.password
  const serverConfirmErrors = state.fieldErrors?.confirmPassword
  const displayPasswordErrors = touched ? passwordErrors : serverErrors ?? passwordErrors
  const displayConfirmErrors = touched ? confirmErrors : serverConfirmErrors ?? confirmErrors

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!password || !confirmPassword || password !== confirmPassword) {
      event.preventDefault()
      setTouched(true)
      return
    }
    const errors = validatePassword(password)
    if (errors.length > 0) {
      event.preventDefault()
      setTouched(true)
      return
    }
  }

  return (
    <div className="space-y-5">
      <div className="premium-console-header">
        <span>Password update</span>
        <strong>SECURE</strong>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-black !text-[#070b1d]">Choose a new password</h2>
        <p className="text-sm leading-7 text-[#6F7192]">
          Update your account security, then continue back to your authenticated workspace.
        </p>
      </div>

      <form action={action} onSubmit={handleSubmit} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-bold text-[#475569]">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Strong password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={hasPasswordError || Boolean(serverErrors?.length)}
            aria-describedby={displayPasswordErrors.length > 0 ? 'update-password-error' : undefined}
            className={`${hasPasswordError || serverErrors?.length ? errorFieldClass : fieldClass}`}
          />
          {displayPasswordErrors.length > 0 && (
            <div id="update-password-error" className="space-y-1">
              {displayPasswordErrors.map((error) => (
                <p key={error} className="text-sm font-semibold text-red-500">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-bold text-[#475569]">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={hasConfirmError || Boolean(serverConfirmErrors?.length)}
            aria-describedby={displayConfirmErrors.length > 0 ? 'update-password-confirm-error' : undefined}
            className={`${hasConfirmError || serverConfirmErrors?.length ? errorFieldClass : fieldClass}`}
          />
          {displayConfirmErrors.length > 0 && (
            <div id="update-password-confirm-error" className="space-y-1">
              {displayConfirmErrors.map((error) => (
                <p key={error} className="text-sm font-semibold text-red-500">
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        <AuthMessage state={state} />
        <SubmitButton idleLabel="Update Password" pendingLabel="Updating Password..." />
      </form>
    </div>
  )
}
