import AuthShell from '@/components/auth/AuthShell'
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm'
import { normalizeNextPath } from '@/lib/auth/redirect'

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
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
