import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import AuthShell from '@/components/auth/AuthShell'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import { normalizeNextPath } from '@/lib/auth/redirect'

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} - Forgot Password`,
    description: settings.businessDescription || 'Reset your account password.',
  }
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams
  const nextPath = normalizeNextPath(
    typeof params.next === 'string' ? params.next : undefined
  )

  return (
    <AuthShell
      eyebrow="Recovery Flow"
      title="Reset access without losing your quote history."
      description="We&apos;ll email you a secure recovery link and send you back into your authenticated workspace."
    >
      <ForgotPasswordForm nextPath={nextPath} />
    </AuthShell>
  )
}
