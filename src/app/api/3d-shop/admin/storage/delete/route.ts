import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

const SHOP_BUCKET = 'shop-images'

/**
 * Best-effort deletion of a shop-images object when an admin removes it from
 * a product. Only allows paths inside this project's own public URL prefix.
 */
export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as { url?: string }
    const url = typeof body.url === 'string' ? body.url.trim() : ''
    if (!url) return NextResponse.json({ error: 'url is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { data } = supabase.storage.from(SHOP_BUCKET).getPublicUrl('')
    const prefix = data.publicUrl
    if (!url.startsWith(prefix)) {
      // Not a shop-images asset (external CDN/URL) — nothing to clean up.
      return NextResponse.json({ ok: true, deleted: false })
    }

    const objectPath = decodeURIComponent(url.slice(prefix.length)).replace(/^\/+/, '')
    if (!objectPath || objectPath.includes('..')) {
      return NextResponse.json({ error: 'Invalid object path.' }, { status: 400 })
    }

    const { error } = await supabase.storage.from(SHOP_BUCKET).remove([objectPath])
    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, deleted: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
