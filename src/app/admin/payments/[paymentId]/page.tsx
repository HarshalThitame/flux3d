import PaymentDetailClient from './payment-detail-client'

export const dynamic = 'force-dynamic'

export default async function AdminPaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>
}) {
  const { paymentId } = await params
  return <PaymentDetailClient paymentId={paymentId} />
}
