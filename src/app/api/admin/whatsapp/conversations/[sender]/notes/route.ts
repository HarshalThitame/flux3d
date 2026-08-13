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
    const body = (await request.json()) as { noteText?: string }
    const noteText = body.noteText?.trim()

    if (!noteText) {
      return NextResponse.json({ error: 'Note text is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: note, error } = await supabase
      .from('whatsapp_internal_notes')
      .insert({
        sender: phone,
        note_text: noteText,
        author_id: auth.user?.id || null,
      })
      .select('id, note_text, created_at')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, note })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
