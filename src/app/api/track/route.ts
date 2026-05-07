import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin')
  const secFetchSite = request.headers.get('sec-fetch-site')

  if (!origin) {
    return false
  }

  try {
    const requestOrigin = new URL(request.url).origin
    const headerOrigin = new URL(origin).origin

    if (headerOrigin !== requestOrigin) {
      return false
    }

    if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
      return false
    }

    return true
  } catch {
    return false
  }
}

function asUuid(value: unknown) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null
}

function asShortString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return ''
  return value.slice(0, maxLength)
}

type TrackPayload = {
  anonId?: unknown
  sessionId?: unknown
  pageUrl?: unknown
  pageTitle?: unknown
  referrer?: unknown
  device?: unknown
  location?: unknown
  event?: unknown
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const cookieToken = request.headers.get('cookie')?.match(/(?:^|;\s*)flux3d_track_token=([^;]+)/)?.[1] ?? null
    const headerToken = request.headers.get('x-track-token')
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    let body: TrackPayload = {}
    try {
      body = (await request.json()) as TrackPayload
    } catch {
      // Empty or invalid JSON - just continue with defaults
    }
    const { anonId, sessionId, pageUrl, pageTitle, referrer, device, location, event } = body
    const safeAnonId = asUuid(anonId)
    const safeSessionId = asUuid(sessionId)
    const safePageUrl = typeof pageUrl === 'string' && pageUrl.startsWith('/') && pageUrl.length <= 2048
      ? pageUrl
      : ''
    const safePageTitle = asShortString(pageTitle, 512)
    const safeReferrer = asShortString(referrer, 2048)
    const safeDevice = device === 'Mobile' || device === 'Desktop' ? device : 'Unknown'
    const safeLocation = asShortString(location, 128) || 'Unknown'
    const safeEvent = event === 'page_view' || event === 'session_end' ? event : null

    const supabase = createAdminSupabaseClient()
    const now = new Date().toISOString()

    // 1. Upsert anonymous visitor
    if (safeAnonId) {
      const { data: existing } = await supabase
        .from('anonymous_visitors')
        .select('visit_count, first_seen')
        .eq('id', safeAnonId)
        .single()

      if (existing) {
        await supabase
          .from('anonymous_visitors')
          .update({
            last_seen: now,
            visit_count: (existing.visit_count || 0) + 1,
            source: safeReferrer || 'Direct',
            device: safeDevice,
            location: safeLocation,
          })
          .eq('id', safeAnonId)
      } else {
        await supabase
          .from('anonymous_visitors')
          .insert({
            id: safeAnonId,
            first_seen: now,
            last_seen: now,
            visit_count: 1,
            source: safeReferrer || 'Direct',
            device: safeDevice,
            location: safeLocation,
          })
      }
    }

    // 2. Handle session
    if (safeSessionId && safeEvent === 'page_view') {
      // Check if session exists
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id, page_views_count')
        .eq('session_id', safeSessionId)
        .single()

      if (!existingSession) {
        await supabase
          .from('sessions')
          .insert({
            session_id: safeSessionId,
            user_id: null,
            started_at: now,
            device: safeDevice,
            location: safeLocation,
            referrer: safeReferrer || 'Direct',
            page_views_count: 0,
          })
      }

      // Record page view
      if (safePageUrl) {
        await supabase
          .from('page_views')
          .insert({
            session_id: safeSessionId,
            page_url: safePageUrl,
            page_title: safePageTitle,
            entered_at: now,
          })

        // Increment session page_views_count
        await supabase
          .from('sessions')
          .update({ 
            page_views_count: (existingSession?.page_views_count || 0) + 1,
            last_seen: now 
          })
          .eq('session_id', safeSessionId)
      }
    }

    // 3. Handle session end
    if (safeSessionId && safeEvent === 'session_end') {
      const { data: session } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('session_id', safeSessionId)
        .single()

      if (session) {
        const start = new Date(session.started_at).getTime()
        const end = new Date().getTime()
        const durationSeconds = Math.round((end - start) / 1000)

        await supabase
          .from('sessions')
          .update({
            ended_at: now,
            duration_seconds: durationSeconds,
          })
          .eq('session_id', safeSessionId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track API error:', error)
    return NextResponse.json({ success: false, error: 'Tracking failed' }, { status: 500 })
  }
}
