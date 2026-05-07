import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import CartDeliveryClient from '@/components/cart/CartDeliveryClient'
import { requireUser } from '@/lib/auth/server'
import { isMissingSupabaseTableError } from '@/lib/quote/supabase-errors'
import type { SavedAddress } from '@/lib/orders'
import { absoluteUrl } from '@/lib/site'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Delivery Details | Flux3D Cart',
  description: 'Review your cart items, choose a saved delivery address or add a new one, and submit your multi-item 3D print order.',
  alternates: {
    canonical: '/cart/delivery',
  },
  openGraph: {
    title: 'Flux3D Cart Delivery Details',
    description: 'Complete delivery details and shipping estimate for your multi-item 3D print order.',
    url: absoluteUrl('/cart/delivery'),
  },
}

type DeliveryAddressRow = {
  id: string
  full_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  landmark: string | null
  created_at: string
  updated_at: string
}

export default async function CartDeliveryPage() {
  const auth = await requireUser('/cart/delivery')
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('delivery_addresses')
    .select(
      'id, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, created_at, updated_at'
    )
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })

  if (error && !isMissingSupabaseTableError(error, 'delivery_addresses')) {
    console.error('[cart-delivery] Failed to load saved addresses:', error)
  }

  const savedAddresses = ((data ?? []) as DeliveryAddressRow[]).map(
    (address): SavedAddress => ({
      id: address.id,
      fullName: address.full_name,
      phone: address.phone,
      addressLine1: address.address_line1,
      addressLine2: address.address_line2 ?? '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      landmark: address.landmark ?? '',
      createdAt: address.created_at,
      updatedAt: address.updated_at,
    })
  )

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <CartDeliveryClient user={auth.profile} savedAddresses={savedAddresses} />
    </div>
  )
}
