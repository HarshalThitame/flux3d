import type { NextApiRequest, NextApiResponse } from 'next'
import { Receiver } from '@upstash/qstash'
import { createClient } from '@supabase/supabase-js'
import { parseWhatsAppMessage } from '@/lib/whatsapp/message-parser'

export const config = {
  maxDuration: 300,
  api: {
    bodyParser: false,
  },
}

let cachedServiceClient: any = null
function getServiceClient() {
  if (cachedServiceClient) return cachedServiceClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  cachedServiceClient = createClient(url, key, {
    global: {
      fetch: (url: RequestInfo | URL, options?: RequestInit) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        return fetch(url, { ...options, signal: controller.signal })
          .finally(() => clearTimeout(timeout))
      },
    },
  })
  return cachedServiceClient
}

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
})

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8')
      if (body.length > 1_000_000) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

type QueueJob = {
  eventId?: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify the request actually came from QStash
  const signature = req.headers['upstash-signature']
  const rawBody = await readRawBody(req).catch(() => null)
  if (!signature || typeof rawBody !== 'string') {
    return res.status(401).json({ error: 'Missing signature or body' })
  }

  let isValid: boolean
  try {
    isValid = await receiver.verify({
      body: rawBody,
      signature: String(Array.isArray(signature) ? signature[0] : signature),
      url: `https://${req.headers.host}${req.url ?? '/api/whatsapp/process'}`,
    })
  } catch (error) {
    console.error('[whatsapp/process] Signature verification error:', error)
    return res.status(401).json({ error: 'Signature verification failed' })
  }
  if (!isValid) {
    console.warn('[whatsapp/process] Invalid QStash signature')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let job: QueueJob
  try {
    job = JSON.parse(rawBody)
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const eventId = job.eventId
  if (!eventId) {
    return res.status(400).json({ error: 'Missing eventId' })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return res.status(500).json({ error: 'Missing Supabase config' })
  }

  // Load the webhook event
  const { data: event, error: loadError } = await supabase
    .from('whatsapp_webhook_events')
    .select('id, payload, sender, payload_hash, processed_at, last_retried_at')
    .eq('id', eventId)
    .maybeSingle()

  if (loadError) {
    console.error('[whatsapp/process] Failed to load event:', loadError)
    return res.status(500).json({ error: loadError.message })
  }

  if (!event) {
    // Event no longer exists — nothing to do
    return res.status(200).json({ success: true, skipped: 'not_found' })
  }

  if (event.processed_at) {
    return res.status(200).json({ success: true, skipped: 'already_processed' })
  }

  // Claim the event so the retry cron (or a QStash retry) does not process it concurrently
  const claimWindow = new Date(Date.now() - 60_000).toISOString()
  const { data: claimed } = await supabase
    .from('whatsapp_webhook_events')
    .update({ last_retried_at: new Date().toISOString() })
    .eq('id', eventId)
    .or(`last_retried_at.is.null,last_retried_at.lt.${claimWindow}`)
    .select('id')

  if (!claimed || claimed.length === 0) {
    return res.status(200).json({ success: true, skipped: 'already_claimed' })
  }

  const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload
  const message = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  const from = message?.from
  const { text, interaction } = parseWhatsAppMessage(message)

  if (!from || (typeof text !== 'string' && !interaction)) {
    // No actionable message — mark processed so retries stop
    await supabase
      .from('whatsapp_webhook_events')
      .update({ processed_at: new Date().toISOString(), reply_sent: false })
      .eq('id', eventId)
    return res.status(200).json({ success: true, skipped: 'no_actionable_message' })
  }

  try {
    const { processIncomingMessage } = await import('@/pages/api/whatsapp')
    await processIncomingMessage({
      supabase,
      payloadHash: event.payload_hash,
      payload,
      from,
      text: text ?? '',
      interaction,
      eventRecord: { id: event.id },
      requestStartedAt: Date.now(),
    })
    return res.status(200).json({ success: true })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Processing failed'
    console.error('[whatsapp/process] Processing failed:', errMsg)
    // 500 so QStash retries with backoff; processIncomingMessage already recorded the error
    return res.status(500).json({ error: errMsg })
  }
}
