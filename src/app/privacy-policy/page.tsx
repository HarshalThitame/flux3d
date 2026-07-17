import type { Metadata } from 'next'
import PrivacyPolicyClient from './PrivacyPolicyClient'

export function generateMetadata(): Metadata {
  return {
    title: 'Privacy Policy',
    description: 'Learn how Flux3D collects, uses, and protects your personal information.',
    alternates: { canonical: '/privacy-policy' },
    openGraph: {
      title: 'Privacy Policy',
      description: 'Learn how Flux3D collects, uses, and protects your personal information.',
      url: 'https://flux3d.in/privacy-policy',
      type: 'website',
    },
    twitter: {
      title: 'Privacy Policy',
      description: 'Learn how Flux3D collects, uses, and protects your personal information.',
    },
  }
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />
}
