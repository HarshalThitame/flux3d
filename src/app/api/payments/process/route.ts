import { NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { processWebhookEventById } from '@/lib/payments/service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
})

export async function POST(request: Request) {
  const signature = request.headers.get('upstash-signature') ?? ''
  const body = await request.text().catch(() => '')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature or body' }, { status: 401 })
  }

  try {
    const isValid = await receiver.verify({
      body,
      signature,
      url: request.url,
    })
    if (!isValid) {
      console.warn('[payments/process] Invalid QStash signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } catch (error) {
    console.error('[payments/process] Signature verification error:', error)
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  let job: { eventId?: string }
  try {
    job = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const eventId = job.eventId
  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  }

  try {
    const outcome = await processWebhookEventById(eventId)
    return NextResponse.json({ success: true, ...outcome })
  } catch (error) {
    console.error('[payments/process] Processing failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
