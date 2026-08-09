import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const ids = searchParams
      .getAll('sku_ids')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean)
    if (ids.length === 0) return NextResponse.json({ images: {} })

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_sku_images')
      .select('*')
      .in('sku_id', ids)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)

    const grouped: Record<string, unknown[]> = {}
    for (const image of data ?? []) {
      const key = image.sku_id
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(image)
    }

    return NextResponse.json({ images: grouped })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}