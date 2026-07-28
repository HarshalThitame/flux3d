import { requireAdminUser } from '@/lib/admin/server'
import TestEmailSender from '@/components/admin/emails/TestEmailSender'

export const dynamic = 'force-dynamic'

export default async function EmailTestPage() {
  await requireAdminUser()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const res = await fetch(`${baseUrl}/api/admin/email-templates?limit=200&is_enabled=true`, {
    cache: 'no-store',
  })

  let templates = []
  if (res.ok) {
    const json = await res.json()
    templates = json.data ?? []
  } else {
    console.error('[admin/emails/test] Failed to fetch templates:', await res.text())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Test Email Sender</h1>
        <p className="text-sm text-[#6F7192] mt-1">
          Preview and send test emails with custom variable data.
        </p>
      </div>

      <TestEmailSender templates={templates} />
    </div>
  )
}
