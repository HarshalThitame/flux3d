import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import ShippingPolicyClient from './ShippingPolicyClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Shipping Policy`,
    description: settings.businessDescription || 'Learn about FLUX 3D shipping methods, delivery times, and policies across India.',
  }
}

export default function ShippingPolicyPage() {
  return <ShippingPolicyClient />
}
