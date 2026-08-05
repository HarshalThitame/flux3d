import { getAdminOrdersData } from '@/lib/admin/queries'
import OrdersListClient from './OrdersListClient'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const query = typeof params.query === 'string' ? params.query : ''
  const result = await getAdminOrdersData(1, 100)
  return <OrdersListClient initialOrders={result.orders} initialTotal={result.total} initialQuery={query} />
}
