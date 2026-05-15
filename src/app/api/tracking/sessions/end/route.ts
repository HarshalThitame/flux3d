import { NextResponse } from 'next/server'
import { persistSessionEnd } from '@/lib/tracking/sessionPersistence'

type EndSessionPayload = {
  session_id?: unknown
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as EndSessionPayload
  const sessionId = typeof body.session_id === 'string' && body.session_id.trim()
    ? body.session_id.slice(0, 128)
    : null

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required.' }, { status: 400 })
  }

  await persistSessionEnd(sessionId)

  return NextResponse.json({ ok: true })
}
