import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import ShopShell from '@/components/shop/ShopShell'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getSettings } from '@/lib/settings'
import ShopCheckoutClient from './ShopCheckoutClient'

export const metadata: Metadata = {
  title: 'Checkout — 3D Shop',
  description: 'Review your 3D Shop order and proceed to secure Razorpay payment.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ShopCheckoutPage() {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login?next=%2F3d-shop%2Fcheckout')
  const settings = await getSettings()

  return (
    <ShopShell transparentNav>
      <ShopCheckoutClient
        deliveryChargeThreshold={settings.deliveryChargeThreshold}
        defaultDeliveryCharge={settings.defaultDeliveryCharge}
      />
    </ShopShell>
  )
}
