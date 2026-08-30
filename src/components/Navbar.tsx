import NavbarClient from '@/components/NavbarClient'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getSettings } from '@/lib/settings'
import { getShopCategories, buildShopCategoryTree } from '@/lib/shop/public-data'

interface NavbarProps {
  transparent?: boolean
}

export default async function Navbar({ transparent = false }: NavbarProps) {
  const [auth, settings, flatCategories] = await Promise.all([
    getCurrentUserProfile(),
    getSettings(),
    getShopCategories().catch(() => []),
  ])
  const profile = auth?.profile ?? null
  const showAdminLink = Boolean(profile?.isAdmin)
  const categoryTree = buildShopCategoryTree(flatCategories)

  return (
    <NavbarClient
      transparent={transparent}
      user={profile}
      showAdminLink={showAdminLink}
      businessName={settings.businessName}
      logoUrl={settings.logoUrl}
      darkLogoUrl={settings.darkLogoUrl || settings.logoUrl}
      whatsappNumber={settings.whatsappNumber || settings.whatsappOrderNumber || settings.primaryPhone}
      categories={categoryTree}
    />
  )
}
