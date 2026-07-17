'use client'

import dynamic from 'next/dynamic'
import type { LoginFormProps } from '@/components/auth/LoginForm'

const LoginForm = dynamic(() => import('@/components/auth/LoginForm'), {
  ssr: false,
  loading: () => (
    <div className="auth-login-panel flex min-h-[470px] w-full min-w-0 flex-col gap-5 text-white" aria-hidden="true">
      <div className="premium-console-header">
        <span>Secure login</span>
        <strong>LIVE</strong>
      </div>
      <div className="space-y-3">
        <div className="h-9 w-40 rounded-full border border-white/12 bg-white/[0.07]" />
        <div className="h-10 w-64 max-w-full rounded-2xl bg-white/[0.08]" />
        <div className="h-16 rounded-2xl bg-white/[0.055]" />
      </div>
      <div className="space-y-4">
        <div className="h-14 rounded-2xl border border-white/12 bg-white/[0.075]" />
        <div className="h-14 rounded-2xl border border-white/12 bg-white/[0.075]" />
        <div className="h-14 rounded-full bg-white/[0.09]" />
      </div>
    </div>
  ),
})

export default function LoginFormBoundary(props: LoginFormProps) {
  return <LoginForm {...props} />
}
