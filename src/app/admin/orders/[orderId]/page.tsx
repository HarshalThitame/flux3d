import { notFound } from 'next/navigation'
import { getAdminOrderById } from '@/lib/admin/queries'
import OrderDetailClient from './OrderDetailClient'

export const dynamic = 'force-dynamic'

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const order = await getAdminOrderById(orderId)

  if (!order) {
    notFound()
  }

  return <OrderDetailClient initialOrder={order} />
}
