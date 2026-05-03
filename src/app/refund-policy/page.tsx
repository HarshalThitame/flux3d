import type { Metadata } from 'next'
import RefundPolicyClient from './RefundPolicyClient'

export const metadata: Metadata = {
  title: 'Refund Policy | FLUX 3D',
  description: 'Learn about FLUX 3D\'s refund policy for 3D printing services and subscriptions.',
}

export default function RefundPolicyPage() {
  return <RefundPolicyClient />
}
