import { createAdminClient } from '@/lib/supabase/admin'
import type { EmailEventStatus, EmailType } from '../../../types/database'

export async function logEmailEvent(
  user_id: string | null,
  email_type: EmailType,
  status: EmailEventStatus = 'sent'
) {
  const supabase = createAdminClient()
  await supabase.from('email_events').insert({
    user_id,
    email_type,
    status,
  })
}
