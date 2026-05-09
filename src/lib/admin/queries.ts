import { createAdminSupabaseClient } from '@/lib/admin/server'
import type {
  AdminFile,
  AdminMaterial,
  AdminOrder,
  AdminOrderItem,
  AdminQuote,
  AdminUser,
  DashboardMetric,
  DonutSlice,
  TrendPoint,
} from '@/lib/admin/types'
import { getOrderStatusLabel, orderStatuses, type OrderStatus } from '@/lib/orders'
import { isAdminEmail } from '@/lib/supabase/config'

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

type OrderRow = {
  id: string | number
  order_number: string | null
  group_id: string | null
  file_url?: string | null
  material: string | null
  color?: string | null
  infill?: number | null
  layer_height?: number | null
  price?: number | string | null
  price_per_unit?: number | string | null
  total_price: number | string | null
  quantity?: number | null
  estimated_time?: number | null
  supports?: boolean | null
  post_processing_level?: string | null
  status: AdminOrder['status']
  created_at: string | null
  notes: string | null
  full_name: string | null
  phone?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
  landmark?: string | null
  delivery_charge?: number | string | null
}

type QuoteRow = {
  id: string | number
  quote_id: string | null
  name: string | null
  email: string | null
  config: AdminQuote['config']
  estimate: AdminQuote['estimate']
  created_at: string | null
}

type ProfileRow = {
  id: string
  name: string | null
  email: string | null
  created_at: string | null
}

function normalizeMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function normalizeDate(value: string | null | undefined) {
  const timestamp = new Date(value ?? '').getTime()
  return Number.isNaN(timestamp) ? null : new Date(timestamp)
}

function mapOrderRowToAdminOrder(order: OrderRow): AdminOrder {
  return {
    id: String(order.id),
    groupId: order.group_id ?? String(order.id),
    orderNumber: order.order_number ?? String(order.id),
    fileUrl: order.file_url ?? undefined,
    fullName: order.full_name ?? 'Unknown customer',
    phone: order.phone ?? undefined,
    addressLine1: order.address_line1 ?? undefined,
    city: order.city ?? undefined,
    state: order.state ?? undefined,
    pincode: order.pincode ?? undefined,
    deliveryCharge: normalizeMoney(order.delivery_charge),
    totalPrice: normalizeMoney(order.total_price),
    material: order.material ?? 'Unknown material',
    color: order.color ?? '',
    status: order.status,
    createdAt: order.created_at ?? '',
    notes: order.notes,
    itemCount: 1,
    items: [{
      id: String(order.id),
      fileName: order.file_url?.split('/').pop() ?? '',
      fileUrl: order.file_url ?? null,
      material: order.material ?? 'Unknown material',
      color: order.color ?? '',
      infill: order.infill ?? 20,
      layerHeight: order.layer_height ?? 0.2,
      price: normalizeMoney(order.price),
      pricePerUnit: normalizeMoney(order.price_per_unit),
      estimatedTime: order.estimated_time ?? 0,
      quantity: order.quantity ?? 1,
      supports: order.supports ?? false,
      postProcessingLevel: order.post_processing_level ?? null,
      status: order.status,
    }],
  }
}

export function groupAdminOrders(rows: OrderRow[]): AdminOrder[] {
  const grouped = rows.reduce<Map<string, AdminOrder>>((acc, row) => {
    const groupId = row.group_id ?? String(row.id)
    const existing = acc.get(groupId)

    if (existing) {
      existing.items.push({
        id: String(row.id),
        fileName: row.file_url?.split('/').pop() ?? '',
        fileUrl: row.file_url ?? null,
        material: row.material ?? 'Unknown material',
        color: row.color ?? '',
        infill: row.infill ?? 20,
        layerHeight: row.layer_height ?? 0.2,
        price: normalizeMoney(row.price),
        pricePerUnit: normalizeMoney(row.price_per_unit),
        estimatedTime: row.estimated_time ?? 0,
        quantity: row.quantity ?? 1,
        supports: row.supports ?? false,
        postProcessingLevel: row.post_processing_level ?? null,
        status: row.status,
      })
      existing.totalPrice += normalizeMoney(row.total_price)
      existing.deliveryCharge += normalizeMoney(row.delivery_charge)
      existing.itemCount += 1
    } else {
      acc.set(groupId, {
        id: String(row.id),
        groupId,
        orderNumber: row.order_number ?? String(row.id),
        fileUrl: row.file_url ?? undefined,
        fullName: row.full_name ?? 'Unknown customer',
        phone: row.phone ?? undefined,
        addressLine1: row.address_line1 ?? undefined,
        city: row.city ?? undefined,
        state: row.state ?? undefined,
        pincode: row.pincode ?? undefined,
        deliveryCharge: normalizeMoney(row.delivery_charge),
        totalPrice: normalizeMoney(row.total_price),
        material: row.material ?? 'Unknown material',
        color: row.color ?? '',
        status: row.status,
        createdAt: row.created_at ?? '',
        notes: row.notes,
        itemCount: 1,
        items: [{
          id: String(row.id),
          fileName: row.file_url?.split('/').pop() ?? '',
          fileUrl: row.file_url ?? null,
          material: row.material ?? 'Unknown material',
          color: row.color ?? '',
          infill: row.infill ?? 20,
          layerHeight: row.layer_height ?? 0.2,
          price: normalizeMoney(row.price),
          pricePerUnit: normalizeMoney(row.price_per_unit),
          estimatedTime: row.estimated_time ?? 0,
          quantity: row.quantity ?? 1,
          supports: row.supports ?? false,
          postProcessingLevel: row.post_processing_level ?? null,
          status: row.status,
        }],
      })
    }

    return acc
  }, new Map())

  return Array.from(grouped.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

function mapQuoteRowToAdminQuote(quote: QuoteRow): AdminQuote {
  return {
    id: String(quote.id),
    quote_id: quote.quote_id,
    name: quote.name ?? 'Unknown customer',
    email: quote.email ?? '',
    config: quote.config,
    estimate: quote.estimate,
    status: 'pending',
    createdAt: quote.created_at ?? '',
  }
}

function mapProfileRowToAdminUser(profile: ProfileRow): AdminUser {
  return {
    id: profile.id,
    name: profile.name ?? (profile.email?.split('@')[0] ?? 'Flux3D User'),
    email: profile.email ?? '',
    signupMethod: 'Email',
    role: isAdminEmail(profile.email) ? 'admin' : 'customer-success',
    lastActive: profile.created_at ? new Date(profile.created_at).toLocaleString('en-IN') : 'Never',
  }
}

function getStatusColor(status: OrderStatus) {
  switch (status) {
    case 'pending':
      return '#F59E0B'
    case 'reviewed':
      return '#38BDF8'
    case 'approved':
      return '#34D399'
    case 'queued':
      return '#818CF8'
    case 'on-hold':
      return '#E879F9'
    case 'printing':
      return '#22D3EE'
    case 'shipped':
      return '#A78BFA'
    case 'completed':
      return '#10B981'
    case 'cancelled':
      return '#94A3B8'
    case 'rejected':
      return '#FB7185'
  }
}

function buildMonthlySeries(
  orders: AdminOrder[],
  getValue: (order: AdminOrder) => number
) {
  const buckets = orders.reduce<Record<string, number>>((acc, order) => {
    const createdAt = normalizeDate(order.createdAt)
    if (!createdAt) {
      return acc
    }

    const label = createdAt.toLocaleString('en-US', { month: 'short' })
    acc[label] = (acc[label] ?? 0) + getValue(order)
    return acc
  }, {})

  return Object.entries(buckets).map(([label, value]) => ({ label, value })) as TrendPoint[]
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
      .select('id, order_number, group_id, file_url, material, color, infill, quantity, price, price_per_unit, total_price, estimated_time, status, created_at, notes, full_name, phone, address_line1, city, state, pincode, delivery_charge')
      .order('created_at', { ascending: false })
      .limit(10),
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

  const normalizedOrders = groupAdminOrders((orderRows.data ?? []) as OrderRow[])
  const normalizedQuotes = (quoteRows.data ?? []).map((row) =>
    mapQuoteRowToAdminQuote(row as QuoteRow)
  )
  const normalizedUsers = (profileRows.data ?? []).map((row) =>
    mapProfileRowToAdminUser(row as ProfileRow)
  )
  const normalizedMaterials = (materialRows.data ?? []).map((row) =>
    normalizeAdminMaterialRow(row as {
      id: string
      name: string
      price_per_gram: number | string
      density: number | string
      colors: string[]
      stock: AdminMaterial['stock']
      created_at?: string | null
    })
  )

  const materialUsage = normalizedOrders.reduce<Record<string, number>>((acc, row) => {
    acc[row.material] = (acc[row.material] ?? 0) + 1
    return acc
  }, {})

  const revenue = normalizedOrders.reduce((sum, row) => sum + row.totalPrice, 0)

  return {
    metrics: [
      { label: 'Total Orders', value: String(totalOrders.count ?? 0), change: '+ live', tone: 'positive' as const },
      { label: 'Revenue', value: `₹${revenue.toLocaleString('en-IN')}`, change: 'Live from orders', tone: 'positive' as const },
      { label: 'Pending Requests', value: String(pendingOrders.count ?? 0), change: 'Needs review', tone: 'warning' as const },
      { label: 'Active Prints', value: String(activeOrders.count ?? 0), change: 'In production', tone: 'neutral' as const },
    ] satisfies DashboardMetric[],
    orders: normalizedOrders,
    quotes: normalizedQuotes,
    users: normalizedUsers,
    materials: normalizedMaterials,
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
      'id, order_number, group_id, file_url, material, color, infill, quantity, price, price_per_unit, total_price, estimated_time, status, created_at, notes, full_name, phone, address_line1, city, state, pincode, delivery_charge'
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return groupAdminOrders((data ?? []) as OrderRow[])
}

export async function updateAdminOrderStatus(groupId: string, status: AdminOrder['status']) {
  const supabase = createAdminSupabaseClient()

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('group_id', groupId)

  if (updateError) throw new Error(updateError.message)

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, group_id, file_url, material, color, infill, quantity, price, price_per_unit, total_price, estimated_time, status, created_at, notes, full_name, phone, address_line1, city, state, pincode, delivery_charge'
    )
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  const grouped = groupAdminOrders((data ?? []) as OrderRow[])
  return grouped[0]
}

export async function getAdminQuotesData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_id, name, email, config, estimate, created_at, user_id')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((quote) => mapQuoteRowToAdminQuote(quote as QuoteRow))
}

export async function getAdminUsersData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) throw new Error(error.message)

  const profiles = await supabase.from('profiles').select('id, name, email, created_at')
  if (profiles.error) throw new Error(profiles.error.message)
  return (data.users ?? []).map((user) => {
    const profile = (profiles.data ?? []).find((item) => item.id === user.id)
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
      role: isAdminEmail(profile?.email ?? user.email) ? 'admin' : 'customer-success',
      lastActive: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('en-IN') : 'Never',
    }
  })
}

export async function getAdminMaterialsData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((material) => normalizeAdminMaterialRow(material))
}

type AdminMaterialInput = {
  name: string
  pricePerGram: number
  density: number
  colors: string[]
  difficultyFactor: number
  stock: AdminMaterial['stock']
}

function normalizeAdminMaterialRow(material: {
  id: string
  name: string
  price_per_gram: number | string
  density: number | string
  colors: string[]
  difficulty_factor?: number | string
  stock: AdminMaterial['stock']
  created_at?: string | null
}) {
  return {
    id: String(material.id),
    name: material.name,
    price_per_gram: Number(material.price_per_gram ?? 0),
    density: Number(material.density ?? 0),
    colors: Array.isArray(material.colors) ? material.colors : [],
    difficulty_factor: Number(material.difficulty_factor ?? 1.1),
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
      difficulty_factor: input.difficultyFactor,
      stock: input.stock,
    })
    .select('id, name, price_per_gram, density, colors, difficulty_factor, stock, created_at')
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
      difficulty_factor: input.difficultyFactor,
      stock: input.stock,
      updated_at: new Date().toISOString(),
    })
    .eq('id', materialId)
    .select('id, name, price_per_gram, density, colors, difficulty_factor, stock, created_at')
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
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, group_id, file_url, material, color, infill, quantity, price, price_per_unit, total_price, estimated_time, status, created_at, notes, full_name, phone, address_line1, city, state, pincode, delivery_charge, payment_method, user_id'
    )
  if (error) throw new Error(error.message)

  const orders = groupAdminOrders((data ?? []) as OrderRow[])
  const totalOrders = orders.length

  const materialBuckets = orders.reduce<Record<string, number>>((acc, row) => {
    acc[row.material] = (acc[row.material] ?? 0) + 1
    return acc
  }, {})

  const statusBuckets = orders.reduce<Record<OrderStatus, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1
    return acc
  }, {} as Record<OrderStatus, number>)

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0)
  const averageOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders
  const activeProduction = (statusBuckets.printing ?? 0) + (statusBuckets.queued ?? 0)
  const blockedOrders = (statusBuckets['on-hold'] ?? 0) + (statusBuckets.pending ?? 0)
  const fulfilledOrders = (statusBuckets.completed ?? 0) + (statusBuckets.shipped ?? 0)

  return {
    metrics: [
      {
        label: 'Average Order Value',
        value: `₹${Math.round(averageOrderValue).toLocaleString('en-IN')}`,
        change: 'Across all tracked orders',
        tone: 'positive' as const,
      },
      {
        label: 'Active Production',
        value: String(activeProduction),
        change: 'Queued or currently printing',
        tone: 'neutral' as const,
      },
      {
        label: 'Blocked Orders',
        value: String(blockedOrders),
        change: 'Pending review or on hold',
        tone: blockedOrders > 0 ? 'warning' as const : 'neutral' as const,
      },
      {
        label: 'Fulfilled Orders',
        value: String(fulfilledOrders),
        change: 'Shipped or completed',
        tone: 'positive' as const,
      },
    ] satisfies DashboardMetric[],
    revenueTrend: buildMonthlySeries(orders, (order) => order.totalPrice),
    ordersGrowth: buildMonthlySeries(orders, () => 1),
    materialUsage: Object.entries(materialBuckets).map(([label, value]) => ({
      label,
      value: totalOrders === 0 ? 0 : Math.round((value / totalOrders) * 100),
      color: '#FF7B43',
    })) as DonutSlice[],
    statusBreakdown: orderStatuses
      .map((status) => ({
        label: getOrderStatusLabel(status),
        value: totalOrders === 0 ? 0 : Math.round(((statusBuckets[status] ?? 0) / totalOrders) * 100),
        color: getStatusColor(status),
      }))
      .filter((slice) => slice.value > 0) as DonutSlice[],
  }
}

export async function getAdminFullAnalytics() {
  const supabase = createAdminSupabaseClient()

  const [
    ordersResult,
    materialsResult,
    printersResult,
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('id, group_id, total_price, status, material, city, payment_method, user_id, created_at'),
    supabase
      .from('materials')
      .select('id, name, price_per_gram, stock, current_stock, min_threshold, sku, type, brand, unit'),
    supabase
      .from('printers')
      .select('id, name, model, status, job, customer, material, progress, last_active'),
  ])

  if (ordersResult.error) throw new Error(ordersResult.error.message)
  if (materialsResult.error) throw new Error(materialsResult.error.message)
  if (printersResult.error) throw new Error(printersResult.error.message)

  const orders = ordersResult.data ?? []
  const materials = materialsResult.data ?? []
  const printers = printersResult.data ?? []

  const totalRevenue = orders.reduce((sum, o) => sum + normalizeMoney(o.total_price), 0)

  const ordersByStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1
    return acc
  }, {})

  const revenueByPaymentMethod = orders.reduce<Record<string, number>>((acc, o) => {
    const method = o.payment_method ?? 'Unknown'
    acc[method] = (acc[method] ?? 0) + normalizeMoney(o.total_price)
    return acc
  }, {})

  const topMaterialsByRevenue = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      acc[o.material] = (acc[o.material] ?? 0) + normalizeMoney(o.total_price)
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const ordersByCity = Object.entries(
    orders.reduce<Record<string, number>>((acc, o) => {
      const city = o.city ?? 'Unknown'
      acc[city] = (acc[city] ?? 0) + 1
      return acc
    }, {})
  ).sort((a, b) => b[1] - a[1])

  const customerOrderCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const userId = o.user_id ?? 'anonymous'
    acc[userId] = (acc[userId] ?? 0) + 1
    return acc
  }, {})

  const newCustomers = Object.values(customerOrderCounts).filter((count) => count === 1).length
  const returningCustomers = Object.values(customerOrderCounts).filter((count) => count > 1).length

  const printerPerformance = printers.map((printer) => ({
    id: String(printer.id),
    name: printer.name ?? 'Unknown Printer',
    model: printer.model,
    status: printer.status ?? 'Unknown',
    job: printer.job,
    customer: printer.customer,
    material: printer.material,
    progress: printer.progress ?? 0,
    lastActive: printer.last_active,
  }))

  return {
    revenueAnalytics: {
      totalRevenue,
      revenueByPaymentMethod: Object.entries(revenueByPaymentMethod).map(([method, amount]) => ({
        method,
        amount,
      })),
    },
    orderAnalytics: {
      totalOrders: orders.length,
      ordersByStatus: Object.entries(ordersByStatus).map(([status, count]) => ({
        status,
        count,
      })),
      ordersByCity: ordersByCity.map(([city, count]) => ({ city, count })),
    },
    materialAnalytics: {
      topMaterialsByRevenue: topMaterialsByRevenue.map(([material, revenue]) => ({
        material,
        revenue,
      })),
      materials: materials.map((m) => ({
        id: String(m.id),
        name: m.name,
        sku: m.sku,
        type: m.type,
        brand: m.brand,
        price_per_gram: m.price_per_gram,
        stock: m.stock,
        current_stock: m.current_stock,
        min_threshold: m.min_threshold,
        unit: m.unit,
      })),
    },
    geographyAnalytics: {
      ordersByCity: ordersByCity.map(([city, count]) => ({ city, count })),
    },
    customerAnalytics: {
      newCustomers,
      returningCustomers,
      totalCustomers: Object.keys(customerOrderCounts).length,
    },
    printerPerformance: printerPerformance,
  }
}

export async function getAdminPaymentsData() {
  return {
    payments: [],
    summary: {
      totalCollected: 0,
      pending: 0,
      refunded: 0,
      gatewayFees: 0,
    },
  }
}

export async function getAdminInventoryData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('materials')
    .select('id, name, price_per_gram, density, colors, stock, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((m) => ({
    id: String(m.id),
    name: m.name,
    price_per_gram: normalizeMoney(m.price_per_gram),
    density: normalizeMoney(m.density) ?? 0,
    colors: Array.isArray(m.colors) ? m.colors : [],
    stock: m.stock ?? 'Healthy',
    created_at: m.created_at,
    updated_at: m.updated_at,
  }))
}

export async function getAdminTicketsData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, ticket_id, customer, customer_email, customer_phone, subject, category, priority, status, assigned_to, created_at, last_updated, description')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((t) => ({
    id: String(t.id),
    ticketId: t.ticket_id ?? String(t.id),
    customer: t.customer ?? 'Unknown',
    customerEmail: t.customer_email,
    customerPhone: t.customer_phone,
    subject: t.subject ?? '',
    category: t.category ?? 'Other',
    priority: t.priority ?? 'Normal',
    status: t.status ?? 'Open',
    assignedTo: t.assigned_to,
    created: t.created_at ?? '',
    lastUpdated: t.last_updated ?? t.created_at ?? '',
    description: t.description,
  }))
}

export async function getAdminPrintersData() {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('printers')
    .select('id, name, model, status, job, customer, material, progress, layer_current, layer_total, eta, temp_nozzle, temp_bed, speed, uv_power, layer_time, last_completed, idle_since, last_active, note, uptime, jobs_completed, build_volume, max_speed, assigned_materials')
    .order('name', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []).map((p) => ({
    id: String(p.id),
    name: p.name ?? 'Unknown Printer',
    model: p.model,
    status: p.status ?? 'Offline',
    job: p.job,
    customer: p.customer,
    material: p.material,
    progress: p.progress ?? 0,
    layerCurrent: p.layer_current,
    layerTotal: p.layer_total,
    eta: p.eta,
    tempNozzle: p.temp_nozzle,
    tempBed: p.temp_bed,
    speed: p.speed,
    uvPower: p.uv_power,
    layerTime: p.layer_time,
    lastCompleted: p.last_completed,
    idleSince: p.idle_since,
    lastActive: p.last_active,
    note: p.note,
    uptime: p.uptime,
    jobsCompleted: p.jobs_completed ?? 0,
    buildVolume: p.build_volume,
    maxSpeed: p.max_speed,
    assignedMaterials: Array.isArray(p.assigned_materials) ? p.assigned_materials : [],
  }))
}
