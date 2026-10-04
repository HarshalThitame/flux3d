import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { rateLimitResponse } from '@/lib/rate-limit'
import { runBlogGeneration } from '@/lib/blog-ai/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response
  const limit = await rateLimitResponse(request, { prefix: 'admin-blog-ai', userId: auth.user.id, windowSeconds: 3600, maxRequests: 8 })
  if (!limit.success) return NextResponse.json({ error: 'Generation limit reached. Try again later.' }, { status: 429 })
  try {
    const body = await request.json() as { topic?: unknown; autoPublish?: unknown }
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    if (topic.length > 300) return NextResponse.json({ error: 'Topic is too long.' }, { status: 400 })
    const scheduleKey = `manual:${auth.user.id}:${crypto.randomUUID()}`
    const result = await runBlogGeneration({
      scheduleKey,
      triggerType: topic ? 'manual_custom' : 'manual_auto',
      customTopic: topic || undefined,
      createdBy: auth.user.id,
      forceDraft: body.autoPublish !== true,
    })
    return NextResponse.json(result, { status: result.status === 'failed' ? 422 : 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to generate blog.' }, { status: 500 })
  }
}
