import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import ShopCheckoutClient from './ShopCheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout — 3D Shop',
  description: 'Place your 3D Shop order with Cash on Delivery.',
}

export default async function ShopCheckoutPage() {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login?next=%2F3d-shop%2Fcheckout')

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <ShopCheckoutClient />
    </div>
  )
}
