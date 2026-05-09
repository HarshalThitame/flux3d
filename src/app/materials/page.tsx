import { Metadata } from 'next'
import { getSettings } from '@/lib/settings'

export const revalidate = 3600

import MaterialsPageClient from './MaterialsPageClient'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} — Materials`,
    description: settings.businessDescription || 'Browse available 3D printing materials at Flux3D.',
    alternates: {
      canonical: '/materials',
    },
  }
}

export default function MaterialsPage() {
  return <MaterialsPageClient />
}
