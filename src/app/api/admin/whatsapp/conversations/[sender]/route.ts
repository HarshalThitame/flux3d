import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sender: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { sender } = await params
    const supabase = createAdminSupabaseClient()

    const { data: messages, error } = await supabase
      .from('whatsapp_messages')
      .select('id, sender, direction, message_text, automated, trigger_event, responded, created_at')
      .eq('sender', decodeURIComponent(sender))
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    // Look up profile
    let contactName: string | null = null
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('phone_number', decodeURIComponent(sender))
      .maybeSingle()
    if (profile?.full_name) contactName = profile.full_name

    return NextResponse.json({ messages: messages ?? [], contactName })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
