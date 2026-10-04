import { NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { runBlogGeneration } from '@/lib/blog-ai/pipeline'
import { isScheduledBlogDay, kolkataScheduleKey } from '@/lib/blog-ai/schedule'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const receiver = new Receiver({ currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '', nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '' })

async function verifyQStash(request: Request) {
  const signature = request.headers.get('upstash-signature')
  if (!signature) return false
  const body = await request.clone().text().catch(() => '')
  try {
    if (await receiver.verify({ body, signature, url: request.url })) return true
    return await receiver.verify({ body, signature, url: 'https://flux3d.in/api/cron/generate-blog' })
  } catch { return false }
}

export async function POST(request: Request) {
  if (!await verifyQStash(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isScheduledBlogDay()) return NextResponse.json({ error: 'Outside configured schedule.' }, { status: 409 })
  const result = await runBlogGeneration({ scheduleKey: kolkataScheduleKey(), triggerType: 'scheduled' })
  return NextResponse.json(result, { status: result.status === 'failed' ? 500 : 200 })
}
