import { Metadata } from 'next'
import MaterialsPageClient from './MaterialsPageClient'

export const metadata: Metadata = {
  alternates: {
    canonical: '/materials',
  },
}

export default function MaterialsPage() {
  return <MaterialsPageClient />
}
