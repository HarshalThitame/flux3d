import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { runBlogGeneration } from '@/lib/blog-ai/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response
  const body = await request.json() as { runId?: unknown }
  const runId = typeof body.runId === 'string' ? body.runId : ''
  if (!runId) return NextResponse.json({ error: 'Run ID is required.' }, { status: 400 })
  const supabase = createAdminSupabaseClient()
  const { data: original, error } = await supabase.from('blog_generation_runs').select('requested_topic').eq('id', runId).eq('status', 'failed').maybeSingle()
  if (error || !original) return NextResponse.json({ error: 'Failed run not found.' }, { status: 404 })
  const result = await runBlogGeneration({ scheduleKey: `retry:${runId}:${crypto.randomUUID()}`, triggerType: 'retry', customTopic: original.requested_topic || undefined, createdBy: auth.user.id })
  return NextResponse.json(result, { status: result.status === 'failed' ? 422 : 201 })
}
