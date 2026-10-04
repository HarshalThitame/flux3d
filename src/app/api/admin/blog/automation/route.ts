import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response
  const supabase = createAdminSupabaseClient()
  const [settings, runs] = await Promise.all([
    supabase.from('blog_ai_settings').select('*').eq('id', true).maybeSingle(),
    supabase.from('blog_generation_runs').select('id, schedule_key, status, selected_topic, blog_id, model, error_message, started_at, completed_at, created_at').order('created_at', { ascending: false }).limit(20),
  ])
  if (settings.error || runs.error) return NextResponse.json({ error: settings.error?.message || runs.error?.message || 'Unable to load blog automation.' }, { status: 500 })
  return NextResponse.json({ settings: settings.data, runs: runs.data ?? [] })
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response
  const body = await request.json() as Record<string, unknown>
  const allowed = ['enabled', 'auto_publish', 'default_author_id', 'default_author_name', 'target_min_words', 'target_max_words', 'minimum_quality_score', 'minimum_uniqueness_score', 'preferred_categories', 'excluded_topics', 'cta_enabled', 'generation_model', 'research_model']
  const patch = Object.fromEntries(Object.entries(body).filter(([key]) => allowed.includes(key)))
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('blog_ai_settings').update(patch).eq('id', true).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ settings: data })
}
