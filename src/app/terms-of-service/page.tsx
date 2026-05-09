import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import TermsOfServiceClient from './TermsOfServiceClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Terms of Service`,
    description: settings.businessDescription || 'Read our Terms of Service to understand your rights and responsibilities when using FLUX 3D application.',
  }
}

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />
}
