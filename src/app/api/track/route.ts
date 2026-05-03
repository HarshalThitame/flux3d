import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export async function POST(request: Request) {
  try {
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Empty or invalid JSON - just continue with defaults
    }
    const { anonId, sessionId, pageUrl, pageTitle, referrer, device, location, event } = body

    const supabase = createAdminSupabaseClient()
    const now = new Date().toISOString()

    // 1. Upsert anonymous visitor
    if (anonId) {
      const { data: existing } = await supabase
        .from('anonymous_visitors')
        .select('visit_count, first_seen')
        .eq('id', anonId)
        .single()

      if (existing) {
        await supabase
          .from('anonymous_visitors')
          .update({
            last_seen: now,
            visit_count: (existing.visit_count || 0) + 1,
            source: referrer || 'Direct',
            device: device || 'Unknown',
            location: location || 'Unknown',
          })
          .eq('id', anonId)
      } else {
        await supabase
          .from('anonymous_visitors')
          .insert({
            id: anonId,
            first_seen: now,
            last_seen: now,
            visit_count: 1,
            source: referrer || 'Direct',
            device: device || 'Unknown',
            location: location || 'Unknown',
          })
      }
    }

    // 2. Handle session
    if (sessionId && event === 'page_view') {
      // Check if session exists
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('id, page_views_count')
        .eq('session_id', sessionId)
        .single()

      if (!existingSession) {
        await supabase
          .from('sessions')
          .insert({
            session_id: sessionId,
            user_id: null,
            started_at: now,
            device: device || 'Unknown',
            location: location || 'Unknown',
            referrer: referrer || 'Direct',
            page_views_count: 0,
          })
      }

      // Record page view
      if (pageUrl) {
        await supabase
          .from('page_views')
          .insert({
            session_id: sessionId,
            page_url: pageUrl,
            page_title: pageTitle || '',
            entered_at: now,
          })

        // Increment session page_views_count
        await supabase
          .from('sessions')
          .update({ 
            page_views_count: (existingSession?.page_views_count || 0) + 1,
            last_seen: now 
          })
          .eq('session_id', sessionId)
      }
    }

    // 3. Handle session end
    if (sessionId && event === 'session_end') {
      const { data: session } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('session_id', sessionId)
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
          .eq('session_id', sessionId)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Track API error:', error)
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
