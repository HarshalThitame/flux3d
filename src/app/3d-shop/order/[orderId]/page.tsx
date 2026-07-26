import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ShopShell from '@/components/shop/ShopShell'
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
    <ShopShell transparentNav>
      <div className="md:hidden">
        <main className="relative isolate overflow-hidden px-4 pb-20 pt-6 lg:px-16 lg:pt-8">
          <div className="mx-auto max-w-7xl">
            <ShopOrderDetailMobile orderId={orderId} />
          </div>
        </main>
      </div>
      <div className="hidden md:block">
        <ShopOrderDetailClient orderId={orderId} />
      </div>
    </ShopShell>
  )
}
