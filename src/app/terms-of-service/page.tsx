import type { Metadata } from 'next'
import TermsOfServiceClient from './TermsOfServiceClient'

export const metadata: Metadata = {
  title: 'Terms of Service | FLUX 3D',
  description: 'Read our Terms of Service to understand your rights and responsibilities when using FLUX 3D application.',
}

export default function TermsOfServicePage() {
  return <TermsOfServiceClient />
}
