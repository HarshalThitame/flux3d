import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminRequest } from '@/lib/admin/request'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data, error } = await supabase
    .from('consent_log')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(100)

  if (error) {
    console.error('[admin] Failed to fetch consent logs:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data ?? [] })
}