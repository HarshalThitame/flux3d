import { getAdminOrdersData, getAdminOrdersStats, type AdminOrdersFilter } from '@/lib/admin/queries'
import OrdersListClient from './OrdersListClient'
import { Suspense } from 'react'
import ErrorBoundary from '@/components/ErrorBoundary'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function buildFilter(params: Record<string, string | string[] | undefined>): AdminOrdersFilter {
  const query = typeof params.query === 'string' && params.query.trim() ? params.query.trim() : undefined
  const status = typeof params.status === 'string' && params.status !== 'all' ? params.status : undefined
  const paymentStatus = typeof params.paymentStatus === 'string' && params.paymentStatus !== 'all' ? params.paymentStatus : undefined
  const dateFrom = typeof params.dateFrom === 'string' && params.dateFrom ? params.dateFrom : undefined
  const dateTo = typeof params.dateTo === 'string' && params.dateTo ? params.dateTo : undefined

  return { query, status, paymentStatus, dateFrom, dateTo }
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filter = buildFilter(params)
  const result = await getAdminOrdersData(1, 100, filter)
  const stats = await getAdminOrdersStats(filter)
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <OrdersListClient
          initialOrders={result.orders}
          initialTotal={result.total}
          initialQuery={typeof params.query === 'string' ? params.query : ''}
          initialFilter={filter}
          serverStats={stats}
        />
      </Suspense>
    </ErrorBoundary>
  )
}
