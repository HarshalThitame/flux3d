import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import RefundPolicyClient from './RefundPolicyClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Refund Policy`,
    description: settings.businessDescription || 'Learn about FLUX 3D refund policy for 3D printing services and subscriptions.',
  }
}

export default function RefundPolicyPage() {
  return <RefundPolicyClient />
}
