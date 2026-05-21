import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import RefundPolicyClient from './RefundPolicyClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Refund Policy`,
    description: 'Learn about the Flux3D refund policy for 3D printing services and custom orders.',
    alternates: { canonical: '/refund-policy' },
  }
}

export default function RefundPolicyPage() {
  return <RefundPolicyClient />
}
