import { createAdminSupabaseClient } from '@/lib/admin/server'
import type {
  AdminFile,
  AdminMaterial,
  AdminOrder,
  AdminQuote,
  AdminUser,
  DashboardMetric,
  DonutSlice,
  TrendPoint,
} from '@/lib/admin/types'
import { getAdminEmails } from '@/lib/supabase/config'

const QUOTE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'

type QueryResult<T> = {
  data: T[] | null
  error: { message: string } | null
  count?: number | null
}

function ensureNoError<T>(result: QueryResult<T>, label: string) {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`)
  }
}

type StorageListItem = {
  id?: string | null
  name: string
  created_at?: string | null
  updated_at?: string | null
  metadata?: {
    size?: number
  } | null
}

async function listBucketFiles(prefix = ''): Promise<Array<StorageListItem & { path: string }>> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.storage.from(QUOTE_BUCKET).list(prefix, {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) {
    throw new Error(error.message)
  }

  const rows = data ?? []
  const files: Array<StorageListItem & { path: string }> = []

  for (const item of rows) {
    const path = prefix ? `${prefix}/${item.name}` : item.name

    if (item.id) {
      files.push({ ...item, path })
      continue
    }

    const nestedFiles = await listBucketFiles(path)
    files.push(...nestedFiles)
  }

  return files
}

function formatAdminFiles(files: Array<StorageListItem & { path: string }>) {
  return files
    .sort((left, right) => {
      const leftDate = new Date(left.created_at ?? left.updated_at ?? 0).getTime()
      const rightDate = new Date(right.created_at ?? right.updated_at ?? 0).getTime()
      return rightDate - leftDate
    })
    .slice(0, 100)
    .map((file) => {
      const fileName = file.path.split('/').pop() ?? file.path
      const user = file.path.split('/')[0] ?? 'Unknown'
      const size = typeof file.metadata?.size === 'number' ? `${Math.max(file.metadata.size / 1024 / 1024, 0.01).toFixed(2)} MB` : 'Unknown'

      return {
        id: file.path,
        name: fileName,
        user,
        uploadedAt: file.created_at ?? file.updated_at ?? '',
        size,
      }
    }) as AdminFile[]
}

export async function getAdminDashboardData() {
  const supabase = createAdminSupabaseClient()
  const [
    totalOrders,
    pendingOrders,
    activeOrders,
    orderRows,
    quoteRows,
    profileRows,
    materialRows,
    fileRows,
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['printing', 'approved']),
    supabase
      .from('orders')
      .select('id, order_number, user_id, material, total_price, status, created_at, notes, full_name')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('quotes')
      .select('id, quote_id, name, email, config, estimate, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('profiles').select('id, name, email, created_at').order('created_at', { ascending: false }).limit(8),
    supabase
      .from('materials')
      .select('id, name, price_per_gram, density, colors, stock, created_at')
      .order('created_at', { ascending: false }),
    listBucketFiles(),
  ])

  ensureNoError(totalOrders, 'Total orders')
  ensureNoError(pendingOrders, 'Pending orders')
  ensureNoError(activeOrders, 'Active orders')
  ensureNoError(orderRows, 'Orders')
  ensureNoError(quoteRows, 'Quotes')
  ensureNoError(profileRows, 'Users')
  ensureNoError(materialRows, 'Materials')

  const materialUsage = (orderRows.data ?? []).reduce<Record<string, number>>((acc, row) => {
    acc[row.material] = (acc[row.material] ?? 0) + 1
    return acc
  }, {})

  const revenue = (orderRows.data ?? []).reduce((sum, row) => sum + Number(row.total_price ?? 0), 0)

  return {
    metrics: [
      { label: 'Total Orders', value: String(totalOrders.count ?? 0), change: '+ live', tone: 'positive' as const },
      { label: 'Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, change: 'Live from orders', tone: 'positive' as const },
      { label: 'Pending Requests', value: String(pendingOrders.count ?? 0), change: 'Needs review', tone: 'warning' as const },
      { label: 'Active Prints', value: String(activeOrders.count ?? 0), change: 'In production', tone: 'neutral' as const },
    ] satisfies DashboardMetric[],
    orders: (orderRows.data ?? []) as AdminOrder[],
    quotes: (quoteRows.data ?? []) as AdminQuote[],
    users: (profileRows.data ?? []) as AdminUser[],
    materials: (materialRows.data ?? []) as AdminMaterial[],
    files: formatAdminFiles(fileRows),
    materialUsage: Object.entries(materialUsage).map(([label, value]) => ({
      label,
      value,
      color: '#FF7B43',
    })) as DonutSlice[],
  }
}

export async function getAdminOrdersData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, file_url, material, total_price, status, created_at, notes, full_name, phone, address_line1, city, state, pincode, delivery_charge'
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((order) => ({
    id: String(order.id),
    orderNumber: order.order_number,
    fileUrl: order.file_url,
    fullName: order.full_name,
    phone: order.phone,
    addressLine1: order.address_line1,
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    deliveryCharge: Number(order.delivery_charge ?? 0),
    totalPrice: Number(order.total_price ?? 0),
    material: order.material,
    status: order.status,
    createdAt: order.created_at,
    notes: order.notes,
  })) as AdminOrder[]
}

export async function updateAdminOrderStatus(orderId: string, status: AdminOrder['status']) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .select(
      'id, order_number, file_url, material, total_price, status, created_at, notes, full_name, phone, address_line1, city, state, pincode, delivery_charge'
    )
    .single()

  if (error) throw new Error(error.message)

  return {
    id: String(data.id),
    orderNumber: data.order_number,
    fileUrl: data.file_url,
    fullName: data.full_name,
    phone: data.phone,
    addressLine1: data.address_line1,
    city: data.city,
    state: data.state,
    pincode: data.pincode,
    deliveryCharge: Number(data.delivery_charge ?? 0),
    totalPrice: Number(data.total_price ?? 0),
    material: data.material,
    status: data.status,
    createdAt: data.created_at,
    notes: data.notes,
  } as AdminOrder
}

export async function getAdminQuotesData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_id, name, email, config, estimate, created_at, user_id')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((quote) => ({
    id: String(quote.id),
    quote_id: quote.quote_id,
    name: quote.name,
    email: quote.email,
    config: quote.config,
    estimate: quote.estimate,
    status: 'pending',
    createdAt: quote.created_at,
  })) as AdminQuote[]
}

export async function getAdminUsersData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) throw new Error(error.message)

  const profiles = await supabase.from('profiles').select('id, name, email, created_at')
  if (profiles.error) throw new Error(profiles.error.message)
  const adminEmails = getAdminEmails()

  return (data.users ?? []).map((user) => {
    const profile = (profiles.data ?? []).find((item) => item.id === user.id)
    const normalizedEmail = (profile?.email ?? user.email ?? '').trim().toLowerCase()
    return {
      id: user.id,
      name:
        profile?.name ??
        (typeof user.user_metadata.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata.name === 'string'
            ? user.user_metadata.name
            : user.email?.split('@')[0] ?? 'Flux3D User'),
      email: profile?.email ?? user.email ?? '',
      signupMethod:
        user.app_metadata.provider === 'google'
          ? 'Google'
          : user.app_metadata.provider === 'github'
            ? 'GitHub'
            : 'Email',
      role: adminEmails.includes(normalizedEmail) ? 'admin' : 'customer-success',
      lastActive: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-IN') : 'Never',
    }
  })
}

export async function getAdminMaterialsData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .select('id, name, price_per_gram, density, colors, stock, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as AdminMaterial[]
}

type AdminMaterialInput = {
  name: string
  pricePerGram: number
  density: number
  colors: string[]
  stock: AdminMaterial['stock']
}

function normalizeAdminMaterialRow(material: {
  id: string
  name: string
  price_per_gram: number | string
  density: number | string
  colors: string[]
  stock: AdminMaterial['stock']
  created_at?: string | null
}) {
  return {
    id: String(material.id),
    name: material.name,
    price_per_gram: Number(material.price_per_gram ?? 0),
    density: Number(material.density ?? 0),
    colors: Array.isArray(material.colors) ? material.colors : [],
    stock: material.stock,
    created_at: material.created_at ?? undefined,
  } as AdminMaterial
}

export async function createAdminMaterial(input: AdminMaterialInput) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .insert({
      name: input.name,
      price_per_gram: input.pricePerGram,
      density: input.density,
      colors: input.colors,
      stock: input.stock,
    })
    .select('id, name, price_per_gram, density, colors, stock, created_at')
    .single()

  if (error) throw new Error(error.message)
  return normalizeAdminMaterialRow(data)
}

export async function updateAdminMaterial(materialId: string, input: AdminMaterialInput) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .update({
      name: input.name,
      price_per_gram: input.pricePerGram,
      density: input.density,
      colors: input.colors,
      stock: input.stock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', materialId)
    .select('id, name, price_per_gram, density, colors, stock, created_at')
    .single()

  if (error) throw new Error(error.message)
  return normalizeAdminMaterialRow(data)
}

export async function getAdminFilesData() {
  const files = await listBucketFiles()
  return formatAdminFiles(files)
}

export async function getAdminAnalyticsData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('orders').select('created_at, total_price, material, status')
  if (error) throw new Error(error.message)

  const rows = data ?? []

  const monthlyBuckets = rows.reduce<Record<string, number>>((acc, row) => {
    const month = new Date(row.created_at).toLocaleString('en-US', { month: 'short' })
    acc[month] = (acc[month] ?? 0) + Number(row.total_price ?? 0)
    return acc
  }, {})

  const orderBuckets = rows.reduce<Record<string, number>>((acc, row) => {
    const month = new Date(row.created_at).toLocaleString('en-US', { month: 'short' })
    acc[month] = (acc[month] ?? 0) + 1
    return acc
  }, {})

  const materialBuckets = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.material] = (acc[row.material] ?? 0) + 1
    return acc
  }, {})

  return {
    revenueTrend: Object.entries(monthlyBuckets).map(([label, value]) => ({ label, value })) as TrendPoint[],
    ordersGrowth: Object.entries(orderBuckets).map(([label, value]) => ({ label, value })) as TrendPoint[],
    materialUsage: Object.entries(materialBuckets).map(([label, value]) => ({ label, value, color: '#FF7B43' })) as DonutSlice[],
  }
}
