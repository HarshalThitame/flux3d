import { getAdminOrdersData } from '@/lib/admin/queries'
import OrdersListClient from './OrdersListClient'

export const dynamic = 'force-dynamic'

export default async function AdminOrdersPage() {
  const orders = await getAdminOrdersData()
  return <OrdersListClient initialOrders={orders} />
}
