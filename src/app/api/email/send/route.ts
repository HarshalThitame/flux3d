import { NextResponse } from 'next/server'
import { Receiver } from '@upstash/qstash'
import { dispatchEmail } from '@/lib/email/dispatcher'
import type { EmailJobPayload } from '@/lib/email/types'

/**
 * QStash Email Worker — POST /api/email/send
 *
 * This endpoint receives jobs from Upstash QStash, verifies the signature,
 * renders the DB template via template-engine + branded wrapper, sends via Resend,
 * and updates email_logs.
 *
 * Security:
 *   - Verifies `upstash-signature` header using QStash signing keys.
 *   - Rejects requests with missing or invalid signatures (401).
 *
 * Performance:
 *   - Must respond within QStash's timeout (default 30s).
 *   - If dispatch throws, QStash auto-retries with exponential backoff.
 */

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
})

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('upstash-signature') ?? ''
    const body = await req.text()

    // Verify QStash signature
    const isValid = await receiver.verify({
      body,
      signature,
      url: req.url,
    })

    if (!isValid) {
      console.warn('[email/send] Invalid QStash signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse payload
    let payload: EmailJobPayload
    try {
      payload = JSON.parse(body)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!payload.emailType || !payload.recipient) {
      return NextResponse.json(
        { error: 'Missing required fields: emailType, recipient' },
        { status: 400 }
      )
    }

    // Dispatch
    const result = await dispatchEmail(payload, payload.logId)

    if (!result.ok) {
      // Return 500 so QStash retries (for transient failures)
      // Permanent failures (4xx from Resend) are handled inside dispatcher
      // by marking the log as 'failed'. QStash will still retry once,
      // but the log will reflect the final state.
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown worker error'
    console.error('[email/send] Worker error:', errMsg)
    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}

// QStash only uses POST
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
