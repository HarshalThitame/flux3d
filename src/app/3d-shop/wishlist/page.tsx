import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import ShopWishlistClient from './ShopWishlistClient'

export const metadata: Metadata = {
  title: 'My Wishlist — Flux3D',
  description: 'Saved 3D Shop products.',
}

export default async function ShopWishlistPage() {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login?next=%2F3d-shop%2Fwishlist')

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <ShopWishlistClient />
    </div>
  )
}
