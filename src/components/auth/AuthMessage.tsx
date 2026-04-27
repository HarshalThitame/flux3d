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
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
      : 'border-rose-400/20 bg-rose-400/10 text-rose-100'

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>{state.message}</div>
}
