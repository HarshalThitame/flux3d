import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

/** Shared media library listing for the admin "Pick from library" UI. */
export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() ?? ''
    const limit = Math.min(60, Math.max(1, Number(searchParams.get('limit')) || 36))
    const offset = Math.max(0, Number(searchParams.get('offset')) || 0)

    const supabase = createAdminSupabaseClient()
    let query = supabase
      .from('shelf_media_assets')
      .select('id, public_url, file_name, size_bytes, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) query = query.ilike('file_name', `%${search}%`)

    const { data, count, error } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({ assets: data ?? [], total: count ?? 0 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
