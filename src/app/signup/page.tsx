import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import { redirect } from 'next/navigation'
import SignupForm from '@/components/auth/SignupForm'
import Navbar from '@/components/Navbar'
import AuthShell from '@/components/auth/AuthShell'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { normalizeNextPath } from '@/lib/auth/redirect'

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} - Create Account`,
    description: settings.businessDescription || 'Create your account to save quotes and manage orders.',
    robots: {
      index: false,
      follow: false,
    },
  }
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const nextPath = normalizeNextPath(
    typeof params.next === 'string' ? params.next : undefined
  )
  const auth = await getCurrentUserProfile()

  if (auth) {
    redirect(nextPath)
  }

  const settings = await getSettings()

  return (
    <div className="luxe-page">
      <Navbar />
      <AuthShell
        eyebrow="Create Account"
        title="Make it with Flux3D."
        description="Instant quotes, private uploads, and tracked delivery — from one studio account. Free to join."
      >
        <SignupForm nextPath={nextPath} logoUrl={settings.logoUrl} />
      </AuthShell>
    </div>
  )
}
