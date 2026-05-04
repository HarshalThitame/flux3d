import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AuthShell from '@/components/auth/AuthShell'
import SignupForm from '@/components/auth/SignupForm'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { normalizeNextPath } from '@/lib/auth/redirect'

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
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

  return (
    <>
      <Navbar />
      <AuthShell
        eyebrow="Create Account"
        title="Save every quote behind a real account."
        description="Create your Flux3D account to keep uploads private, store pricing history, and move from quote to production cleanly."
      >
        <SignupForm nextPath={nextPath} />
      </AuthShell>
    </>
  )
}
