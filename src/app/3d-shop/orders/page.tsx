import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getCurrentUserProfile } from '@/lib/auth/server'
import ShopOrdersClient from './ShopOrdersClient'
import ShopOrdersMobile from './ShopOrdersMobile'

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
      <div className="md:hidden">
        <main className="relative isolate overflow-hidden px-4 pb-20 pt-5">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(118deg,#f9f7f4_0%,#ffffff_46%,#f5f3ff_100%)]" />
          <div className="mx-auto max-w-7xl">
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-brand)] bg-[var(--brand-faint)] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                3D Shop
              </div>
              <h1 className="mt-3 text-xl font-black text-[var(--text-primary)]">Your Orders</h1>
            </div>
            <ShopOrdersMobile />
          </div>
        </main>
      </div>
      <div className="hidden md:block">
        <ShopOrdersClient />
      </div>
    </div>
  )
}
