import { Metadata } from 'next'

export const revalidate = 3600

import MaterialsPageClient from './MaterialsPageClient'

export const metadata: Metadata = {
  title: {
    absolute: '3D Printing Materials — PLA, PETG, Resin, TPU & More | Flux3D',
  },
  description:
    'Choose from 15+ premium 3D printing materials. PLA, PETG, ABS, Resin, TPU, Nylon & specialty filaments. Professional quality for every project.',
  alternates: {
    canonical: '/materials',
  },
}

export default function MaterialsPage() {
  return <MaterialsPageClient />
}
