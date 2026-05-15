import { NextResponse } from 'next/server'
import { persistSessionStart } from '@/lib/tracking/sessionPersistence'
import type { DeviceType } from '../../../../../../types/database'

type StartSessionPayload = {
  user_id?: unknown
  session_id?: unknown
  ip_address?: unknown
  device_type?: unknown
  browser?: unknown
  os?: unknown
  country?: unknown
  city?: unknown
}

function nullableString(value: unknown, maxLength = 256) {
  return typeof value === 'string' && value.trim() ? value.slice(0, maxLength) : null
}

function deviceType(value: unknown): DeviceType | null {
  return value === 'mobile' || value === 'desktop' || value === 'tablet' ? value : null
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as StartSessionPayload
  const sessionId = nullableString(body.session_id, 128)

  if (!sessionId) {
    return NextResponse.json({ error: 'session_id is required.' }, { status: 400 })
  }

  await persistSessionStart({
    user_id: nullableString(body.user_id, 64),
    session_id: sessionId,
    ip_address: nullableString(body.ip_address, 128),
    device_type: deviceType(body.device_type),
    browser: nullableString(body.browser, 128),
    os: nullableString(body.os, 128),
    country: nullableString(body.country, 128),
    city: nullableString(body.city, 128),
  })

  return NextResponse.json({ ok: true })
}
