import { permanentRedirect } from 'next/navigation'

export default function CancellationPolicyPage() {
  permanentRedirect('/refund-policy')
}
