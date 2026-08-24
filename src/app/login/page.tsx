import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AuthShell from '@/components/auth/AuthShell'
import LoginFormBoundary from '@/components/auth/LoginFormBoundary'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { normalizeNextPath } from '@/lib/auth/redirect'

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} - Sign In`,
    description: settings.businessDescription || 'Sign in to your account to access saved quotes and orders.',
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const nextPath = normalizeNextPath(
    typeof params.next === 'string' ? params.next : undefined
  )
  const errorParam = typeof params.error === 'string' ? params.error : undefined
  const auth = await getCurrentUserProfile()

  if (auth) {
    redirect(nextPath)
  }

  const settings = await getSettings()

  const errorMessage =
    errorParam === 'auth_callback_failed'
      ? 'Authentication failed. Please try again.'
      : errorParam === 'missing_code'
        ? 'This link is invalid or has expired. Please request a new one.'
        : errorParam === 'session_required'
          ? 'Your session has expired. Please request a new password reset link.'
          : undefined

  return (
    <div className="luxe-page">
      <Navbar />
      <AuthShell
        eyebrow="Secure Login"
        title="Welcome back."
        description="Your quotes, private files, and orders — exactly where you left them."
      >
        <LoginFormBoundary nextPath={nextPath} errorMessage={errorMessage} logoUrl={settings.logoUrl} />
      </AuthShell>
    </div>
  )
}
