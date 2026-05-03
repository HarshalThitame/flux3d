import type { Metadata } from 'next'
import PrivacyPolicyClient from './PrivacyPolicyClient'

export const metadata: Metadata = {
  title: 'Privacy Policy | FLUX 3D',
  description: 'Learn how FLUX 3D collects, uses, and protects your personal information.',
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />
}
