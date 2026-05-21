import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import TermsOfServiceClient from './TermsOfServiceClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Terms of Service`,
    description: 'Read the Flux3D Terms of Service for custom 3D printing orders, quotes, payments, and account use.',
    alternates: { canonical: '/terms-of-service' },
  }
}

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />
}
