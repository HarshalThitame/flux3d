import type { Metadata } from 'next'
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
  // Guest checkout is allowed: no login wall. Authenticated users keep their
  // saved-address flow; guests provide contact email + consent instead.
  const settings = await getSettings()

  return (
    <ShopShell transparentNav>
      <ShopCheckoutClient
        isAuthenticated={Boolean(auth)}
        deliveryChargeThreshold={settings.deliveryChargeThreshold}
        defaultDeliveryCharge={settings.defaultDeliveryCharge}
      />
    </ShopShell>
  )
}
