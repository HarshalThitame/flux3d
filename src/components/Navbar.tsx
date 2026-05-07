import NavbarClient from '@/components/NavbarClient'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { isAdminEmail } from '@/lib/supabase/config'

interface NavbarProps {
  transparent?: boolean
}

export default async function Navbar({ transparent = false }: NavbarProps) {
  const auth = await getCurrentUserProfile()
  const profile = auth?.profile ?? null
  const showAdminLink = isAdminEmail(profile?.email)

  return <NavbarClient transparent={transparent} user={profile} showAdminLink={showAdminLink} />
}
