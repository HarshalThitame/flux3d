'use client'

import { useActionState } from 'react'
import { updatePasswordAction } from '@/app/auth/actions'
import type { AuthFormState } from '@/lib/auth/validation'
import AuthMessage from '@/components/auth/AuthMessage'
import SubmitButton from '@/components/auth/SubmitButton'

const initialState: AuthFormState = {}
const fieldClass =
  'h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#111827] shadow-sm outline-none transition placeholder:text-gray-400 focus:border-[#6d28d9] focus:ring-4 focus:ring-purple-100'

type UpdatePasswordFormProps = {
  nextPath: string
}

export default function UpdatePasswordForm({ nextPath }: UpdatePasswordFormProps) {
  const [state, action] = useActionState(updatePasswordAction, initialState)

  return (
    <div className="space-y-5">
      <div className="premium-console-header">
        <span>Password update</span>
        <strong>SECURE</strong>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-black !text-[#111827]">Choose a new password</h2>
        <p className="text-sm leading-7 text-[#6F7192]">
          Update your account security, then continue back to your authenticated workspace.
        </p>
      </div>

      <form action={action} className="space-y-4">
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
            className={fieldClass}
          />
          {state.fieldErrors?.password?.map((error) => (
            <p key={error} className="text-sm font-semibold text-red-500">
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
