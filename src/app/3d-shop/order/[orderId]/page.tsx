import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import ShopOrderDetailClient from './ShopOrderDetailClient'
import ShopOrderDetailMobile from './ShopOrderDetailMobile'

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
      <div className="md:hidden">
        <main className="relative isolate overflow-hidden px-4 pb-20 pt-5">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(118deg,#f9f7f4_0%,#ffffff_46%,#f5f3ff_100%)]" />
          <div className="mx-auto max-w-7xl">
            <ShopOrderDetailMobile orderId={orderId} />
          </div>
        </main>
      </div>
      <div className="hidden md:block">
        <ShopOrderDetailClient orderId={orderId} />
      </div>
    </div>
  )
}
