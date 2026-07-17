'use client'

import { useActionState } from 'react'
import { updatePasswordAction } from '@/app/auth/actions'
import type { AuthFormState } from '@/lib/auth/validation'
import AuthMessage from '@/components/auth/AuthMessage'
import SubmitButton from '@/components/auth/SubmitButton'

const initialState: AuthFormState = {}
const fieldClass =
  'h-12 w-full rounded-2xl border border-white/12 bg-white/[0.075] px-4 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] outline-none transition placeholder:text-white/35 focus:border-cyan-200/70 focus:bg-white/[0.11] focus:ring-4 focus:ring-cyan-300/10'

type UpdatePasswordFormProps = {
  nextPath: string
}

export default function UpdatePasswordForm({ nextPath }: UpdatePasswordFormProps) {
  const [state, action] = useActionState(updatePasswordAction, initialState)

  return (
    <div className="space-y-5 text-white">
      <div className="premium-console-header">
        <span>Password update</span>
        <strong>SECURE</strong>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-black !text-white">Choose a new password</h2>
        <p className="text-sm leading-7 text-white/62">
          Update your account security, then continue back to your authenticated workspace.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-bold text-white/78">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Strong password"
            className={fieldClass}
          />
          {state.fieldErrors?.password?.map((error) => (
            <p key={error} className="text-sm font-semibold text-rose-200">
              {error}
            </p>
          ))}
        </div>

        <AuthMessage state={state} />
        <SubmitButton idleLabel="Update Password" pendingLabel="Updating Password..." />
      </form>
    </div>
  )
}
