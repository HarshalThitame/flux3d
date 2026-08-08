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

  const errorMessage =
    errorParam === 'auth_callback_failed'
      ? 'Authentication failed. Please try again.'
      : errorParam === 'missing_code'
        ? 'Missing authentication code. Please retry the login flow.'
        : undefined

  return (
    <div className="auth-page-with-navbar">
      <Navbar />
      <AuthShell
        eyebrow="Secure Login"
        title="Welcome back to your Flux3D workspace."
        description="Sign in to manage saved quotes, private uploads, checkout details, order tracking, and repeat builds from one production account."
      >
        <LoginFormBoundary nextPath={nextPath} errorMessage={errorMessage} />
      </AuthShell>
    </div>
  )
}
