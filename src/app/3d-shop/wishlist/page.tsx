import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ShopShell from '@/components/shop/ShopShell'
import { getCurrentUserProfile } from '@/lib/auth/server'
import ShopWishlistClient from './ShopWishlistClient'

export const metadata: Metadata = {
  title: 'My Wishlist — Flux3D',
  description: 'Saved 3D Shop products.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ShopWishlistPage() {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login?next=%2F3d-shop%2Fwishlist')

  return (
    <ShopShell transparentNav>
      <ShopWishlistClient />
    </ShopShell>
  )
}
