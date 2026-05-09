import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import Navbar from '@/components/Navbar'
import CartClient from '@/components/cart/CartClient'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getPublicQuoteMaterials } from '@/lib/public-materials'
import { absoluteUrl } from '@/lib/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Shopping Cart`,
    description: settings.businessDescription || 'Review your 3D print items in cart, modify settings, and proceed to delivery with multiple items.',
    alternates: {
      canonical: '/cart',
    },
    openGraph: {
      title: `${settings.businessName} — Shopping Cart`,
      description: settings.businessDescription || 'Review your 3D print items and proceed to delivery.',
      url: absoluteUrl('/cart'),
    },
  }
}

export default async function CartPage() {
  const auth = await getCurrentUserProfile()
  const materials = await getPublicQuoteMaterials()

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <CartClient user={auth?.profile ?? null} materials={materials} />
    </div>
  )
}
