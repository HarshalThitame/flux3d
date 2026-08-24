import type { NextApiRequest, NextApiResponse } from 'next'
import { Receiver } from '@upstash/qstash'
import {
  loadOutboxRow,
  completeOutboxSend,
} from '@/lib/whatsapp/outbox'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/messages'

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: false,
  },
}

function readRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8')
      if (body.length > 100_000) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

/**
 * QStash consumer for the WhatsApp template outbox.
 *
 * Delivers queued HSM template messages with guaranteed retries: returning
 * non-2xx makes QStash retry with backoff; `completeOutboxSend` records the
 * final state (and mirrors it into whatsapp_messages so webhook delivery
 * ticks attach to the row via meta_message_id).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  })

  const rawBody = await readRawBody(req).catch(() => null)
  const signature = req.headers['upstash-signature']
  if (!rawBody || !signature) {
    return res.status(401).json({ error: 'Missing signature or body' })
  }

  try {
    const isValid = await receiver.verify({
      body: rawBody,
      signature: String(Array.isArray(signature) ? signature[0] : signature),
      url: `https://${req.headers.host}${req.url ?? '/api/whatsapp/notify'}`,
    })
    if (!isValid) return res.status(401).json({ error: 'Invalid QStash signature' })
  } catch (error) {
    console.error('[whatsapp/notify] Signature verification failed:', error)
    return res.status(401).json({ error: 'Signature verification failed' })
  }

  let job: { outboxId?: string }
  try {
    job = JSON.parse(rawBody)
  } catch {
    // Malformed job is unrecoverable — ack so QStash stops retrying.
    return res.status(200).json({ success: true, skipped: 'bad_payload' })
  }

  if (!job.outboxId) {
    return res.status(200).json({ success: true, skipped: 'missing_outbox_id' })
  }

  const row = await loadOutboxRow(job.outboxId)
  if (!row) {
    // Row vanished — nothing durable to deliver.
    return res.status(200).json({ success: true, skipped: 'not_found' })
  }
  if (row.status !== 'queued') {
    return res.status(200).json({ success: true, skipped: `already_${row.status}` })
  }
  // Guard against double-send when a previous attempt delivered but the
  // completion write failed before QStash retried us.
  if (row.meta_message_id) {
    await completeOutboxSend(row, { ok: true, messageId: row.meta_message_id })
    return res.status(200).json({ success: true, skipped: 'already_sent' })
  }

  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_IN'

  try {
    const result = await sendWhatsAppTemplate(row.phone, {
      name: row.template_name,
      language,
      components: (row.components ?? []) as Parameters<typeof sendWhatsAppTemplate>[1]['components'],
    })

    if (!result.ok) {
      await completeOutboxSend(row, { ok: false, error: result.error ?? `HTTP ${result.status ?? '?'}` })
      // 500 → QStash retries with backoff.
      return res.status(500).json({ error: result.error ?? 'Template send failed' })
    }

    await completeOutboxSend(row, { ok: true, messageId: result.messageId })
    return res.status(200).json({ success: true, messageId: result.messageId })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    await completeOutboxSend(row, { ok: false, error }).catch(() => {})
    return res.status(500).json({ error })
  }
}
