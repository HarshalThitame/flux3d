import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminOrderFileDownloadUrl } from '@/lib/admin/files'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { requireAdminRequest } from '@/lib/admin/request'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { orderId } = await params
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('orders')
      .select('file_url')
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    if (!data?.file_url) {
      return NextResponse.json({ error: 'Order file not found.' }, { status: 404 })
    }

    const downloadUrl = await getAdminOrderFileDownloadUrl(data.file_url)
    return NextResponse.redirect(downloadUrl)
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
