import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import Navbar from '@/components/Navbar'
import CartDeliveryClient from '@/components/cart/CartDeliveryClient'
import { requireUser } from '@/lib/auth/server'
import { isMissingSupabaseTableError } from '@/lib/quote/supabase-errors'
import { CartProvider } from '@/lib/cart/context'
import type { SavedAddress } from '@/lib/orders'
import { absoluteUrl } from '@/lib/site'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Delivery Details`,
    description: settings.businessDescription || 'Review your cart items, choose a saved delivery address or add a new one, and submit your multi-item 3D print order.',
    alternates: {
      canonical: '/cart/delivery',
    },
    robots: {
      index: false,
      follow: false,
    },
    openGraph: {
      title: `${settings.businessName} — Delivery Details`,
      description: settings.businessDescription || 'Complete delivery details and shipping estimate for your multi-item 3D print order.',
      url: absoluteUrl('/cart/delivery'),
    },
  }
}

type DeliveryAddressRow = {
  id: string
  full_name: string
  phone: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  pincode: string
  landmark: string | null
  created_at: string
  updated_at: string | null
}

export default async function CartDeliveryPage() {
  const [auth, settings] = await Promise.all([
    requireUser('/cart/delivery'),
    getSettings(),
  ])
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('addresses')
    .select(
      'id, full_name, phone, address_line_1, address_line_2, city, state, pincode, landmark, created_at, updated_at'
    )
    .eq('user_id', auth.user.id)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })

  if (error && !isMissingSupabaseTableError(error, 'addresses')) {
    console.error('[cart-delivery] Failed to load saved addresses:', error)
  }

  const savedAddresses = ((data ?? []) as DeliveryAddressRow[]).map(
    (address): SavedAddress => ({
      id: address.id,
      fullName: address.full_name,
      phone: address.phone,
      addressLine1: address.address_line_1,
      addressLine2: address.address_line_2 ?? '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark ?? '',
      createdAt: address.created_at,
      updatedAt: address.updated_at ?? address.created_at,
    })
  )

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#070b1d]">
      <Navbar transparent />
      <CartProvider initialSettings={settings}>
        <CartDeliveryClient user={auth.profile} savedAddresses={savedAddresses} supportEmail={settings.supportEmail} />
      </CartProvider>
    </div>
  )
}
