import { requireAdminUser } from '@/lib/admin/server'
import NotificationMatrix from '@/components/admin/emails/NotificationMatrix'

export const dynamic = 'force-dynamic'

export default async function EmailMatrixPage() {
  await requireAdminUser()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/admin/email-automation-rules/matrix`, {
    cache: 'no-store',
  })

  let matrix = []
  if (res.ok) {
    const json = await res.json()
    matrix = json.data ?? []
  } else {
    console.error('[admin/emails/matrix] Failed to fetch matrix:', await res.text())
  }

  return <NotificationMatrix initialMatrix={matrix} />
}
