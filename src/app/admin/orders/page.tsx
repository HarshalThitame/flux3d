import { getAdminOrdersData } from '@/lib/admin/queries'
import OrdersListClient from './OrdersListClient'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const result = await getAdminOrdersData(1, 100)
  return <OrdersListClient initialOrders={result.orders} initialTotal={result.total} />
}
