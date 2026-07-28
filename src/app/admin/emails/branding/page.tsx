import { requireAdminUser } from '@/lib/admin/server'
import { createAdminClient } from '@/lib/supabase/admin'
import EmailBrandingForm from '@/components/admin/emails/EmailBrandingForm'
import type { EmailBrandingRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function AdminEmailBrandingPage() {
  await requireAdminUser()

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('email_branding')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (error) {
    console.error('[admin/emails/branding] DB error:', error.message)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Branding</h1>
        <p className="text-sm text-[#6F7192] mt-1">
          Customize logo, colors, company info, and footer styling for all outgoing emails.
        </p>
      </div>

      <EmailBrandingForm initialData={data as EmailBrandingRow | null} />
    </div>
  )
}
