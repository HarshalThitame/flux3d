import { permanentRedirect } from 'next/navigation'

export const dynamic = 'force-static'

export default function TermsOfServicePage() {
  permanentRedirect('/terms-and-conditions')
}
