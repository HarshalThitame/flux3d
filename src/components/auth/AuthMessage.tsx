import type { AuthFormState } from '@/lib/auth/validation'

type AuthMessageProps = {
  state: AuthFormState
}

export default function AuthMessage({ state }: AuthMessageProps) {
  if (!state.message) {
    return null
  }

  const tone =
    state.status === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-red-200 bg-red-50 text-red-700'

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${tone}`}>{state.message}</div>
}
