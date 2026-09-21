import { Metadata } from 'next'
import CustomOrdersClient from './CustomOrdersClient'

export const metadata: Metadata = {
  title: 'Custom Orders — Admin',
}

export default function CustomOrdersPage() {
  return <CustomOrdersClient />
}
