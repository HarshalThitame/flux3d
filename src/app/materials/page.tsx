import { Metadata } from 'next'

export const revalidate = 3600

import MaterialsPageClient from './MaterialsPageClient'

export const metadata: Metadata = {
  alternates: {
    canonical: '/materials',
  },
}

export default function MaterialsPage() {
  return <MaterialsPageClient />
}
