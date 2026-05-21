import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import ShopOrdersClient from './ShopOrdersClient'

export const metadata: Metadata = {
  title: 'My 3D Shop Orders — Flux3D',
  description: 'Track your 3D Shop orders.',
}

export default async function ShopOrdersPage() {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login?next=%2F3d-shop%2Forders')

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <ShopOrdersClient />
    </div>
  )
}
