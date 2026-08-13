import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const { data: replies, error } = await supabase
      .from('whatsapp_quick_replies')
      .select('*')
      .order('shortcut', { ascending: true })

    if (error) throw new Error(error.message)

    return NextResponse.json({ quickReplies: replies ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as { title?: string; shortcut?: string; content?: string; category?: string }
    const title = body.title?.trim()
    let shortcut = body.shortcut?.trim()
    const content = body.content?.trim()
    const category = body.category?.trim() || 'general'

    if (!title || !shortcut || !content) {
      return NextResponse.json({ error: 'Title, shortcut, and content are required.' }, { status: 400 })
    }

    if (!shortcut.startsWith('/')) {
      shortcut = `/${shortcut}`
    }

    const supabase = createAdminSupabaseClient()
    const { data: created, error } = await supabase
      .from('whatsapp_quick_replies')
      .insert({ title, shortcut, content, category })
      .select('*')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, quickReply: created })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('whatsapp_quick_replies')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
