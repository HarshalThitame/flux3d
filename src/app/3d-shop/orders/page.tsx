import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ShopShell from '@/components/shop/ShopShell'
import { getCurrentUserProfile } from '@/lib/auth/server'
import ShopOrdersClient from './ShopOrdersClient'
import ShopOrdersMobile from './ShopOrdersMobile'

export const metadata: Metadata = {
  title: 'My 3D Shop Orders — Flux3D',
  description: 'Track your 3D Shop orders.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ShopOrdersPage() {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login?next=%2F3d-shop%2Forders')

  return (
    <ShopShell transparentNav>
      <div className="md:hidden">
        <main className="relative isolate overflow-hidden px-4 pb-20 pt-6 lg:px-16 lg:pt-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6">
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">3D Shop</div>
              <h1 className="font-[var(--shop-font-heading)] mt-3 text-2xl font-semibold tracking-tight text-[var(--shop-text-primary)]">
                My Orders
              </h1>
              <p className="mt-1 text-sm text-[var(--shop-text-muted)]">Track, manage, and reorder your prints</p>
            </div>
            <ShopOrdersMobile />
          </div>
        </main>
      </div>
      <div className="hidden md:block">
        <ShopOrdersClient />
      </div>
    </ShopShell>
  )
}
