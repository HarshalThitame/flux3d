import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import ShippingPolicyClient from './ShippingPolicyClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Shipping Policy`,
    description: 'Learn about Flux3D shipping methods, delivery timelines, and delivery policies across India.',
    alternates: { canonical: '/shipping-policy' },
  }
}

export default function ShippingPolicyPage() {
  return <ShippingPolicyClient />
}
