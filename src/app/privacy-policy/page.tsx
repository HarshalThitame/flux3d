import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import PrivacyPolicyClient from './PrivacyPolicyClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Privacy Policy`,
    description: settings.businessDescription || 'Learn how FLUX 3D collects, uses, and protects your personal information.',
  }
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />
}
