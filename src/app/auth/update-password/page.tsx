import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import AuthShell from '@/components/auth/AuthShell'
import UpdatePasswordForm from '@/components/auth/UpdatePasswordForm'
import { normalizeNextPath } from '@/lib/auth/redirect'
import { getCurrentUserProfile } from '@/lib/auth/server'

export const metadata: Metadata = {
  title: 'Update Password | Flux3D',
  robots: {
    index: false,
    follow: false,
  },
}

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

  const auth = await getCurrentUserProfile()

  // Reaching this page requires a live (recovery) session — normally set by
  // the auth callback after the user clicks the reset link. Direct visitors
  // get bounced back to sign in instead of a broken form.
  if (!auth) {
    redirect('/login?error=session_required')
  }

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
