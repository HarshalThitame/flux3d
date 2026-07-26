import type { Metadata } from 'next'
import ShopShell from '@/components/shop/ShopShell'
import ShopCartPageClient from '@/components/shop/ShopCartPageClient'

export const metadata: Metadata = {
  title: 'Cart — 3D Shop',
  description: 'Review your 3D Shop cart before checkout.',
}

export default function ShopCartPage() {
  return (
    <ShopShell transparentNav>
      <ShopCartPageClient />
    </ShopShell>
  );
}
