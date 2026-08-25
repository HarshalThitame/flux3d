import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import { requireUser } from '@/lib/auth/server'
import { isMissingSupabaseTableError } from '@/lib/quote/supabase-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPendingEmailLinkRequestByUser } from '@/lib/account-linking/link-requests'
import ProfileClient from './ProfileClient'

type ProfileRow = {
  id: string
  name: string | null
  full_name: string | null
  email: string | null
  avatar_url: string | null
  created_at: string | null
  phone: string | null
  phone_number: string | null
  gst_number: string | null
  phone_verified: boolean | null
  whatsapp_opt_in: boolean | null
  phone_canonical: string | null
}

type AddressRow = {
  id: string
  address_line_1: string
  address_line_2: string | null
  city: string
  state: string
  pincode: string
  is_default: boolean | null
}

export const metadata: Metadata = {
  title: 'My Profile | Flux3D',
  description: 'Manage your Flux3D account details, addresses, and connected WhatsApp number.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function ProfilePage() {
  const auth = await requireUser('/profile')
  const supabase = await createServerSupabaseClient()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, name, full_name, email, avatar_url, created_at, phone, phone_number, gst_number, phone_verified, whatsapp_opt_in, phone_canonical')
    .eq('id', auth.user.id)
    .maybeSingle()

  const profileRow = profileData as ProfileRow | null

  const { data: addressData, error: addressError } = await supabase
    .from('addresses')
    .select('id, address_line_1, address_line_2, city, state, pincode, is_default')
    .eq('user_id', auth.user.id)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })

  if (addressError && !isMissingSupabaseTableError(addressError, 'addresses')) {
    console.error('[profile] Failed to load addresses:', addressError)
  }

  const addresses = (addressData ?? []) as AddressRow[]
  const defaultAddress = addresses.find((address) => address.is_default) ?? addresses[0] ?? null

  const profile = {
    id: auth.user.id,
    name: auth.profile.name,
    email: auth.profile.email,
    avatarUrl: profileRow?.avatar_url ?? auth.profile.avatarUrl,
    createdAt: auth.profile.createdAt,
    phone: profileRow?.phone ?? profileRow?.phone_number ?? '',
    phoneVerified: profileRow?.phone_verified ?? false,
    whatsappOptIn: profileRow?.whatsapp_opt_in ?? false,
    phoneCanonical: profileRow?.phone_canonical ?? null,
    pendingLinkPhone: (await getPendingEmailLinkRequestByUser(auth.user.id))?.target_phone ?? null,
    addressId: defaultAddress?.id ?? null,
    address: {
      addressLine1: defaultAddress?.address_line_1 ?? '',
      addressLine2: defaultAddress?.address_line_2 ?? '',
      city: defaultAddress?.city ?? '',
      state: defaultAddress?.state ?? '',
      pincode: defaultAddress?.pincode ?? '',
    },
    addresses: addresses.map((address) => ({
      id: address.id,
      addressLine1: address.address_line_1,
      addressLine2: address.address_line_2 ?? '',
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: Boolean(address.is_default),
    })),
    gstNumber: profileRow?.gst_number ?? '',
  }

  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <ProfileClient profile={profile} />
    </div>
  )
}
