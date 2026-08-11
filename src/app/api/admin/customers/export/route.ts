import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getAdminCustomersData, type AdminCustomersFilter } from '@/lib/admin/queries'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { rateLimitResponse } from '@/lib/rate-limit'
import { customerExportSchema, zodErrorResponse } from '@/lib/admin/schemas/customers'
import type { AdminUser } from '@/lib/admin/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_EXPORT_ROWS = 5000

export async function POST(request: Request) {
  const auth = await requireAdminPermission('customers.export')
  if ('response' in auth) return auth.response

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'admin_customers_export',
    windowSeconds: 300,
    maxRequests: 20,
    userId: auth.user.id,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded. Try again later.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = customerExportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(zodErrorResponse(parsed.error), { status: 400 })
  }

  const { format = 'xlsx', userIds, filter } = parsed.data

  try {
    const customers = await resolveCustomers(userIds, filter)

    if (customers.length === 0) {
      return NextResponse.json({ error: 'No customers matched the export criteria.' }, { status: 400 })
    }

    const rows = customers.map(buildRow)

    let buffer: Buffer
    let contentType: string
    if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers')
      buffer = Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer)
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    } else {
      const header = Object.keys(rows[0])
      const csvRows = rows.map((row) => header.map((key) => `"${String(row[key as keyof typeof row] ?? '').replace(/"/g, '""')}"`).join(','))
      buffer = Buffer.from('\uFEFF' + [header.join(','), ...csvRows].join('\n'), 'utf8')
      contentType = 'text/csv;charset=utf-8'
    }

    const filename = `flux3d-customers-${new Date().toISOString().slice(0, 10)}.${format}`

    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    ) as ArrayBuffer

    return new NextResponse(new Blob([arrayBuffer]), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch (error) {
    console.error('Customer export failed:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Export failed.',
    }, { status: 500 })
  }
}

async function resolveCustomers(userIds: string[] | undefined, filter: AdminCustomersFilter | undefined): Promise<AdminUser[]> {
  const collected: AdminUser[] = []
  const pageSize = 1000
  const requestedIds = userIds && userIds.length > 0 ? new Set(userIds) : null

  for (let page = 1; page <= Math.ceil(MAX_EXPORT_ROWS / pageSize); page++) {
    const result = await getAdminCustomersData(page, pageSize, filter ?? {})
    for (const customer of result.customers) {
      if (requestedIds) {
        if (requestedIds.has(customer.id)) collected.push(customer)
      } else {
        collected.push(customer)
      }
    }
    if (result.customers.length < pageSize) break
    if (requestedIds && collected.length >= requestedIds.size) break
  }

  return collected
}

function buildRow(customer: AdminUser) {
  return {
    'Customer ID': customer.customerId ?? '',
    'Name': customer.name,
    'Email': customer.email,
    'Phone': customer.phone ?? '',
    'Status': customer.status ?? 'Active',
    'City': customer.city ?? '',
    'State': customer.state ?? '',
    'Signup Method': customer.signupMethod,
    'Total Orders': customer.totalOrders ?? 0,
    'Total Spend': customer.totalSpent ?? 0,
    'Joined': customer.joinedDate ?? '',
    'Last Order': customer.lastOrderDate ?? '',
    'Last Active': customer.lastSeenAt ?? '',
  }
}