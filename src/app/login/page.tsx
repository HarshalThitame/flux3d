import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import AuthShell from '@/components/auth/AuthShell'
import LoginForm from '@/components/auth/LoginForm'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { normalizeNextPath } from '@/lib/auth/redirect'

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
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
    <>
      <Navbar />
      <AuthShell
        eyebrow="Secure Login"
        title="Open your 3D printing workspace."
        description="Use email or Google to get back to saved quotes, uploads, and account settings."
      >
        <LoginForm nextPath={nextPath} errorMessage={errorMessage} />
      </AuthShell>
    </>
  )
}
