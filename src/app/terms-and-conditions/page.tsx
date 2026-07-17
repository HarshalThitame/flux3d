import type { Metadata } from 'next'
import TermsOfServiceClient from '../terms-of-service/TermsOfServiceClient'

export function generateMetadata(): Metadata {
  return {
    title: 'Terms & Conditions',
    description: 'Read the Flux3D Terms & Conditions for custom 3D printing orders, quotes, payments, cancellation, delivery, and account use.',
    alternates: { canonical: '/terms-and-conditions' },
    openGraph: {
      title: 'Terms & Conditions',
      description: 'Read the Flux3D Terms & Conditions for custom 3D printing orders, quotes, payments, cancellation, delivery, and account use.',
      url: 'https://flux3d.in/terms-and-conditions',
      type: 'website',
    },
    twitter: {
      title: 'Terms & Conditions',
      description: 'Read the Flux3D Terms & Conditions for custom 3D printing orders, quotes, payments, cancellation, delivery, and account use.',
    },
  }
}

export default function TermsAndConditionsPage() {
  return <TermsOfServiceClient />
}
