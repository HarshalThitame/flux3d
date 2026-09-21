import { requireAdminUser } from '@/lib/admin/server'
import UnifiedReviewsClient from './UnifiedReviewsClient'

export const metadata = {
  title: 'Reviews Moderation | Admin',
}

export default async function AdminReviewsPage() {
  await requireAdminUser()
  return <UnifiedReviewsClient />
}
