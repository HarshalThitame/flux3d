import { requireAdminUser } from '@/lib/admin/server'
import EmailBrandingForm from '@/components/admin/emails/EmailBrandingForm'
import type { EmailBrandingRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function AdminEmailBrandingPage() {
  await requireAdminUser()

  const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/admin/email-branding`, {
    cache: 'no-store',
  })

  let data: EmailBrandingRow | null = null
  if (res.ok) {
    const json = await res.json()
    data = json.data as EmailBrandingRow | null
  } else {
    console.error('[admin/emails/branding] Failed to fetch branding:', await res.text())
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Branding</h1>
        <p className="text-sm text-[#6F7192] mt-1">
          Customize logo, colors, company info, and footer styling for all outgoing emails.
        </p>
      </div>

      <EmailBrandingForm initialData={data} />
    </div>
  )
}
