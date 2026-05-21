import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import PrivacyPolicyClient from './PrivacyPolicyClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Privacy Policy`,
    description: 'Learn how Flux3D collects, uses, and protects your personal information.',
    alternates: { canonical: '/privacy-policy' },
  }
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />
}
