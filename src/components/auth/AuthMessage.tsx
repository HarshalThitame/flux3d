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
      ? 'border-emerald-300/24 bg-emerald-400/12 text-emerald-100'
      : 'border-rose-300/24 bg-rose-400/12 text-rose-100'

  return <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${tone}`}>{state.message}</div>
}
