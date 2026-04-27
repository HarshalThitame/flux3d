import AuthShell from '@/components/auth/AuthShell'
import UpdatePasswordForm from '@/components/auth/UpdatePasswordForm'
import { normalizeNextPath } from '@/lib/auth/redirect'

type UpdatePasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const params = await searchParams
  const nextPath = normalizeNextPath(
    typeof params.next === 'string' ? params.next : undefined,
    '/profile'
  )

  return (
    <AuthShell
      eyebrow="Account Security"
      title="Set a stronger password and continue."
      description="Complete the password update here after using the recovery link from your email."
    >
      <UpdatePasswordForm nextPath={nextPath} />
    </AuthShell>
  )
}
