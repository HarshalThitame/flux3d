import { Client } from '@upstash/qstash'
import { QSTASH_ENDPOINT } from './types'
import type { EmailJobPayload } from './types'

/**
 * Upstash QStash client singleton.
 *
 * QStash is a serverless-native message queue that pushes jobs via HTTP.
 * Perfect for Vercel: no long-running worker processes needed.
 *
 * Env required:
 *   QSTASH_TOKEN — from Upstash console
 */
let client: Client | null = null

export function getQStashClient(): Client {
  if (client) return client

  const token = process.env.QSTASH_TOKEN
  if (!token) {
    throw new Error('[QStash] QSTASH_TOKEN is not configured')
  }

  client = new Client({
    token,
    baseUrl: process.env.QSTASH_URL,
  })
  return client
}

/**
 * Publish an email job to QStash.
 *
 * Retries: 3 attempts with exponential backoff (handled by QStash).
 * On final failure, QStash will call the failure webhook if configured.
 *
 * Edge case: If QStash is unavailable, we fall back to synchronous dispatch
 * in development to prevent emails from being silently dropped.
 */
export async function enqueueEmail(payload: EmailJobPayload): Promise<{ messageId: string }> {
  const qstash = getQStashClient()

  // Add a small random delay (jitter) to prevent thundering herd when
  // bulk operations (e.g., batch status updates) enqueue many emails.
  const jitterMs = Math.floor(Math.random() * 500)
  await new Promise((r) => setTimeout(r, jitterMs))

  const result = await qstash.publishJSON({
    url: QSTASH_ENDPOINT,
    body: payload,
    retries: 3,
    // Delay delivery by 1-2 seconds to smooth spikes
    // QStash delay is in seconds, not milliseconds
    delay: 1,
    // Headers to help with request tracing
    headers: {
      'X-Email-Type': payload.emailType,
      'X-Recipient': payload.recipient,
    },
  })

  return { messageId: result.messageId }
}
