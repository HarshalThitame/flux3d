import type { Metadata } from 'next'
import Navbar from '@/components/Navbar'
import MaterialsTech from '@/app/services/MaterialsTech'
import { absoluteUrl } from '@/lib/site'

export const metadata: Metadata = {
  title: '3D Printing Materials and Filament Guide',
  description:
    'Explore Flux3D materials including PLA+, ABS, PETG, ASA, TPU, Resin 4K, Silk Gold, and multi-color workflows.',
  alternates: {
    canonical: '/materials',
  },
  openGraph: {
    title: 'Flux3D Materials Guide',
    description:
      'Material properties, best use cases, and print guidance for FDM and resin 3D printing.',
    url: absoluteUrl('/materials'),
  },
}

export default function MaterialsPage() {
  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <Navbar transparent />
      <main className="pt-24">
        <MaterialsTech />
      </main>
    </div>
  )
}
