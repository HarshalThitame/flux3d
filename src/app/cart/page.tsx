import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import Navbar from '@/components/Navbar'
import CartClient from '@/components/cart/CartClient'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getPublicQuoteMaterials } from '@/lib/public-materials'
import { CartProvider } from '@/lib/cart/context'
import { absoluteUrl } from '@/lib/site'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Shopping Cart`,
    description: settings.businessDescription || 'Review your 3D print items in cart, modify settings, and proceed to delivery with multiple items.',
    alternates: {
      canonical: '/cart',
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `${settings.businessName} — Shopping Cart`,
      description: settings.businessDescription || 'Review your 3D print items and proceed to delivery.',
      url: absoluteUrl('/cart'),
    },
  }
}

export default async function CartPage() {
  const [auth, materials, settings] = await Promise.all([
    getCurrentUserProfile(),
    getPublicQuoteMaterials(),
    getSettings(),
  ])

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#070b1d]">
      <Navbar transparent />
      <CartProvider initialSettings={settings}>
        <CartClient user={auth?.profile ?? null} materials={materials} />
      </CartProvider>
    </div>
  )
}
