import { permanentRedirect } from 'next/navigation'

export const dynamic = 'force-static'

export default function CancellationPolicyPage() {
  permanentRedirect('/refund-policy')
}
