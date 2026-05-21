import Navbar from '@/components/Navbar'
import { requireUser } from '@/lib/auth/server'
import { getSettings } from '@/lib/settings'
import {
  isMissingSupabaseTableError,
  ORDERS_TABLE_UNAVAILABLE_MESSAGE,
  QUOTES_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import ProfileClient, {
  type ProfileDetailsData,
  type ProfileModelFile,
  type ProfileOrderActivity,
} from './ProfileClient'

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

type OrderRow = {
  id: string
  group_id: string | null
  material: string | null
  status: string | null
  created_at: string
}

type ModelFileRow = {
  id: string
  file_name: string | null
  file_url: string | null
  material: string | null
  status: string | null
  uploaded_at: string | null
}

function getFavoriteMaterial(orders: OrderRow[]) {
  const counts = new Map<string, number>()

  for (const order of orders) {
    const material = order.material?.trim()
    if (!material) continue
    counts.set(material, (counts.get(material) ?? 0) + 1)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function getGroupedOrderCount(orders: OrderRow[]) {
  return new Set(orders.map((order) => order.group_id ?? order.id)).size
}

function normalizeFileStatus(value: string | null): ProfileModelFile['status'] {
  if (value === 'ordered' || value === 'draft' || value === 'quoted') return value
  return 'quoted'
}

export default async function ProfilePage() {
  const auth = await requireUser('/profile')
  const supabase = await createServerSupabaseClient()
  const settings = await getSettings()
  const { count, error } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
  const quotesTableUnavailable = isMissingSupabaseTableError(error, 'quotes')

  if (error && !quotesTableUnavailable) {
    throw new Error(error.message)
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, name, full_name, email, avatar_url, created_at, phone, phone_number, gst_number')
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

  const { data: orderData, error: ordersError } = await supabase
    .from('orders')
    .select('id, group_id, material, status, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(500)
  const ordersTableUnavailable = isMissingSupabaseTableError(ordersError, 'orders')

  if (ordersError && !ordersTableUnavailable) {
    throw new Error(ordersError.message)
  }

  const orders = (orderData ?? []) as OrderRow[]
  const orderActivity: ProfileOrderActivity = {
    totalOrders: getGroupedOrderCount(orders),
    lastOrder: orders[0]
      ? {
          createdAt: orders[0].created_at,
          status: orders[0].status ?? 'pending',
        }
      : null,
    favoriteMaterial: getFavoriteMaterial(orders),
    unavailableMessage: ordersTableUnavailable ? ORDERS_TABLE_UNAVAILABLE_MESSAGE : null,
  }

  const { data: modelFileData, count: modelFileCount, error: modelFilesError } = await supabase
    .from('model_files')
    .select('id, file_name, file_url, material, status, uploaded_at', { count: 'exact' })
    .eq('user_id', auth.user.id)
    .order('uploaded_at', { ascending: false })
    .limit(6)
  const modelFilesTableUnavailable = isMissingSupabaseTableError(modelFilesError, 'model_files')

  if (modelFilesError && !modelFilesTableUnavailable) {
    throw new Error(modelFilesError.message)
  }

  const modelFiles = ((modelFileData ?? []) as ModelFileRow[])
    .filter((file) => file.id && file.file_url)
    .slice(0, 5)
    .map((file): ProfileModelFile => ({
      id: file.id,
      fileName: file.file_name || file.file_url?.split('/').pop() || 'Uploaded model',
      fileUrl: file.file_url || '',
      material: file.material || '—',
      status: normalizeFileStatus(file.status),
      uploadedAt: file.uploaded_at || new Date().toISOString(),
    }))

  const profile: ProfileDetailsData = {
    id: auth.user.id,
    name: auth.profile.name,
    email: auth.profile.email,
    avatarUrl: profileRow?.avatar_url ?? auth.profile.avatarUrl,
    createdAt: auth.profile.createdAt,
    phone: profileRow?.phone ?? profileRow?.phone_number ?? '',
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
    <div className="min-h-screen bg-[#f9f7f4] px-4 pb-16 text-[#1a1a1a] md:px-8">
      <Navbar transparent />
      <ProfileClient
        profile={profile}
        businessName={settings.businessName}
        savedQuotesCount={count ?? 0}
        savedQuotesMessage={quotesTableUnavailable ? QUOTES_TABLE_UNAVAILABLE_MESSAGE : 'Saved quotes linked to this account'}
        orderActivity={orderActivity}
        initialFiles={modelFiles}
        totalFileCount={modelFileCount ?? modelFiles.length}
      />
    </div>
  )
}
