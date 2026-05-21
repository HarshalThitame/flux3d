import AdminShopOrderDetailClient from './AdminShopOrderDetailClient'

export default async function AdminShopOrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  return <AdminShopOrderDetailClient orderId={orderId} />
}
