import type { Metadata } from 'next'
import RefundPolicyClient from './RefundPolicyClient'

export function generateMetadata(): Metadata {
  return {
    title: 'Refund & Cancellation Policy',
    description: 'Learn how Flux3D handles cancellations, refunds, defective items, duplicate payments, and refund request processing.',
    alternates: { canonical: '/refund-policy' },
    openGraph: {
      title: 'Refund & Cancellation Policy',
      description: 'Learn how Flux3D handles cancellations, refunds, defective items, duplicate payments, and refund request processing.',
      url: 'https://flux3d.in/refund-policy',
      type: 'website',
    },
    twitter: {
      title: 'Refund & Cancellation Policy',
      description: 'Learn how Flux3D handles cancellations, refunds, defective items, duplicate payments, and refund request processing.',
    },
  }
}

export default function RefundPolicyPage() {
  return <RefundPolicyClient />
}
