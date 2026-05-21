'use client'

import { useActionState } from 'react'
import { updatePasswordAction } from '@/app/auth/actions'
import type { AuthFormState } from '@/lib/auth/validation'
import AuthMessage from '@/components/auth/AuthMessage'
import SubmitButton from '@/components/auth/SubmitButton'

const initialState: AuthFormState = {}

type UpdatePasswordFormProps = {
  nextPath: string
}

export default function UpdatePasswordForm({ nextPath }: UpdatePasswordFormProps) {
  const [state, action] = useActionState(updatePasswordAction, initialState)

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="font-[var(--font-syne)] text-3xl font-bold text-[#0F1B3D]">Choose a new password</h2>
        <p className="text-sm leading-7 text-[#8e97b7]">
          Update your account security, then continue back to your authenticated workspace.
        </p>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={nextPath} />
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm text-[#0F1B3D]">
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Strong password"
            className="w-full rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] outline-none placeholder:text-[#8C7DB8]"
          />
          {state.fieldErrors?.password?.map((error) => (
            <p key={error} className="text-sm text-rose-300">
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
