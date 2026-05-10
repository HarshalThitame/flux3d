import type { NextApiRequest, NextApiResponse } from 'next'
import { createAdminSupabaseClient } from '@/lib/admin/server'

type WebhookResponse =
  | string
  | {
      error: string
      received?: boolean
    }

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

function getVerifyToken() {
  return (
    process.env.WHATSAPP_VERIFY_TOKEN ??
    process.env.META_WEBHOOK_VERIFY_TOKEN ??
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ??
    ''
  )
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookResponse>
) {
  if (req.method === 'GET') {
    const mode = first(req.query['hub.mode'])
    const token = first(req.query['hub.verify_token'])
    const challenge = first(req.query['hub.challenge'])
    const expectedToken = getVerifyToken()

    if (mode === 'subscribe' && challenge && (expectedToken === '' || token === expectedToken)) {
      res.status(200).send(challenge)
      return
    }

    res.status(403).json({ error: 'Webhook verification failed' })
    return
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body

      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabase = createAdminSupabaseClient()

          await supabase.from('whatsapp_messages').insert({
            direction: 'inbound',
            message_text: JSON.stringify(body),
            automated: false,
            trigger_event: 'meta-webhook',
            responded: false,
            response_time_minutes: null,
          })
        } catch (dbError) {
          console.error(
            '[whatsapp webhook] Failed to persist inbound payload:',
            dbError instanceof Error ? dbError.message : dbError
          )
        }
      }

      res.status(200).json({ received: true })
      return
    } catch (error) {
      console.error(
        '[whatsapp webhook] Unexpected failure:',
        error instanceof Error ? error.message : error
      )
      res.status(200).json({ received: true })
      return
    }
  }

  res.setHeader('Allow', ['GET', 'POST'])
  res.status(405).json({ error: 'Method not allowed' })
}
