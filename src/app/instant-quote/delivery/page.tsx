import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import DeliveryStepClient from '@/components/instant-quote/DeliveryStepClient'
import { requireUser } from '@/lib/auth/server'
import { isMissingSupabaseTableError } from '@/lib/quote/supabase-errors'
import type { SavedAddress } from '@/lib/orders'
import { absoluteUrl } from '@/lib/site'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Delivery Details | Flux3D',
  description: 'Review your quote, choose a saved delivery address or add a new one, and submit your 3D print request.',
  alternates: {
    canonical: '/instant-quote/delivery',
  },
  openGraph: {
    title: 'Flux3D Delivery Details',
    description: 'Complete delivery details and shipping estimate for your 3D print request.',
    url: absoluteUrl('/instant-quote/delivery'),
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

export default async function DeliveryPage() {
  const auth = await requireUser('/instant-quote/delivery')
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('delivery_addresses')
    .select(
      'id, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, created_at, updated_at'
    )
    .eq('user_id', auth.user.id)
    .order('updated_at', { ascending: false })

  if (error && !isMissingSupabaseTableError(error, 'delivery_addresses')) {
    console.error('[delivery] Failed to load saved addresses:', error)
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
      <DeliveryStepClient user={auth.profile} savedAddresses={savedAddresses} />
    </div>
  )
}
