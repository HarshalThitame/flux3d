import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import ShopOrderDetailClient from './ShopOrderDetailClient'

export const metadata: Metadata = {
  title: '3D Shop Order — Flux3D',
  description: 'View your 3D Shop order details.',
}

export default async function ShopOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const auth = await getCurrentUserProfile()
  if (!auth) redirect(`/login?next=${encodeURIComponent(`/3d-shop/order/${orderId}`)}`)

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <ShopOrderDetailClient orderId={orderId} />
    </div>
  )
}
