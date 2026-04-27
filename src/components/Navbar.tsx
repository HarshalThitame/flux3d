import NavbarClient from '@/components/NavbarClient'
import { getCurrentUserProfile } from '@/lib/auth/server'

interface NavbarProps {
  transparent?: boolean
}

export default async function Navbar({ transparent = false }: NavbarProps) {
  const auth = await getCurrentUserProfile()

  return <NavbarClient transparent={transparent} user={auth?.profile ?? null} />
}
