import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sender: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { sender } = await params
    const phone = decodeURIComponent(sender)
    const body = (await request.json()) as { tags?: string[]; isArchived?: boolean }

    const supabase = createAdminSupabaseClient()
    const updatePayload: Record<string, unknown> = {
      sender: phone,
      updated_at: new Date().toISOString(),
    }

    if (body.tags !== undefined) updatePayload.tags = body.tags
    if (body.isArchived !== undefined) updatePayload.is_archived = body.isArchived

    const { error } = await supabase
      .from('whatsapp_conversation_meta')
      .upsert(updatePayload, { onConflict: 'sender' })

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
