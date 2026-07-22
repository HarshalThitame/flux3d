import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminRequest } from '@/lib/admin/request'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  const { id } = await params
  const supabase = createAdminClient()

  // Fetch the event
  const { data: event, error: fetchError } = await supabase
    .from('whatsapp_webhook_events')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Reset retry state for reprocessing
  const { error: resetError } = await supabase
    .from('whatsapp_webhook_events')
    .update({
      retry_count: 0,
      last_error: null,
      last_retried_at: null,
      processed_at: null,
    })
    .eq('id', id)

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 })
  }

  // Trigger reprocessing
  const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  const from = message?.from
  const text = message?.text?.body

  if (!from || typeof text !== 'string') {
    return NextResponse.json({ error: 'Event has no actionable message payload' }, { status: 400 })
  }

  // Fire reprocess asynchronously (don't wait for it)
  const { processIncomingMessage } = await import('@/pages/api/whatsapp')
  processIncomingMessage({
    supabase,
    payloadHash: event.payload_hash,
    payload,
    from,
    text,
    eventRecord: { id },
    requestStartedAt: Date.now(),
  }).catch((error: Error) => {
    console.error(`[admin] Reprocess failed for event ${id}:`, error)
  })

  return NextResponse.json({
    success: true,
    message: 'Reprocessing triggered',
    eventId: id,
  })
}
