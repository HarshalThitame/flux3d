import { Metadata } from 'next'
import CustomOrderDetailClient from './CustomOrderDetailClient'

export const metadata: Metadata = {
  title: 'Custom Order Detail — Admin',
}

type Props = {
  params: Promise<{ orderId: string }>
}

export default async function CustomOrderDetailPage(props: Props) {
  const { orderId } = await props.params
  return <CustomOrderDetailClient orderId={orderId} />
}
