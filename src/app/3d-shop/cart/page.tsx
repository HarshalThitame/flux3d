import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import ShopCartPageClient from '@/components/shop/ShopCartPageClient'

export const metadata: Metadata = {
  title: 'Cart — 3D Shop',
  description: 'Review your 3D Shop cart before checkout.',
}

export default function ShopCartPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <ShopCartPageClient />
    </div>
  )
}
