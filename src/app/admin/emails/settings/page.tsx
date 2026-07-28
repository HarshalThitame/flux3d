import { requireAdminUser } from '@/lib/admin/server'
import EmailSettingsForm from '@/components/admin/emails/EmailSettingsForm'

export const dynamic = 'force-dynamic'

export default async function EmailSettingsPage() {
  await requireAdminUser()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const res = await fetch(`${baseUrl}/api/admin/email-settings`, {
    cache: 'no-store',
  })

  let data = null
  if (res.ok) {
    const json = await res.json()
    data = json.data ?? null
  } else {
    console.error('[admin/emails/settings] Failed to fetch settings:', await res.text())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Settings</h1>
        <p className="text-sm text-[#6F7192] mt-1">
          Sender configuration, maintenance mode, retry policies, and global footer.
        </p>
      </div>

      <EmailSettingsForm initialData={data} />
    </div>
  )
}
