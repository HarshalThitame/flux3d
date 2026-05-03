import type { Metadata } from 'next'
import ShippingPolicyClient from './ShippingPolicyClient'

export const metadata: Metadata = {
  title: 'Shipping Policy | FLUX 3D',
  description: 'Learn about FLUX 3D\'s shipping methods, delivery times, and policies across India.',
}

export default function ShippingPolicyPage() {
  return <ShippingPolicyClient />
}
