'use client'

import dynamic from 'next/dynamic'
import type { LoginFormProps } from '@/components/auth/LoginForm'

const LoginForm = dynamic(() => import('@/components/auth/LoginForm'), {
  ssr: false,
  loading: () => (
    <div className="w-full min-w-0" aria-hidden="true">
      <div className="mb-7 flex items-center justify-between">
        <div className="h-6 w-24 rounded bg-gray-100" />
        <div className="h-4 w-14 rounded bg-gray-100" />
      </div>
      <div className="h-7 w-40 rounded bg-gray-100" />
      <div className="mt-2 h-4 w-52 max-w-full rounded bg-gray-100" />
      <div className="mt-7 grid gap-[18px]">
        <div>
          <div className="mb-[7px] h-4 w-12 rounded bg-gray-100" />
          <div className="h-12 w-full rounded-xl border border-gray-100 bg-gray-50" />
        </div>
        <div>
          <div className="mb-[7px] h-4 w-16 rounded bg-gray-100" />
          <div className="h-12 w-full rounded-xl border border-gray-100 bg-gray-50" />
        </div>
        <div className="luxe-cta opacity-60" aria-hidden="true" />
      </div>
    </div>
  ),
})

export default function LoginFormBoundary(props: LoginFormProps) {
  return <LoginForm {...props} />
}
