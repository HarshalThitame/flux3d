import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ErrorLogPayload = {
  user_id?: unknown
  page_url?: unknown
  error_message?: unknown
  stack_trace?: unknown
  device_info?: unknown
}

function asNullableString(value: unknown, maxLength: number) {
  return typeof value === 'string' && value.trim() ? value.slice(0, maxLength) : null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ErrorLogPayload
    const errorMessage = asNullableString(body.error_message, 2000)

    if (!errorMessage) {
      return NextResponse.json({ error: 'error_message is required.' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { error } = await supabase.from('error_logs').insert({
      user_id: asNullableString(body.user_id, 64),
      page_url: asNullableString(body.page_url, 2048),
      error_message: errorMessage,
      stack_trace: asNullableString(body.stack_trace, 6000),
      device_info: typeof body.device_info === 'object' && body.device_info !== null ? body.device_info : {},
    })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[tracking] Failed to log client error:', error)
    }
    return NextResponse.json({ error: 'Failed to log error.' }, { status: 500 })
  }
}
