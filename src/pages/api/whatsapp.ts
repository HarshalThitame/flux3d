import type { NextApiRequest, NextApiResponse } from 'next'
import OpenAI from 'openai'
import { createAdminSupabaseClient } from '@/lib/admin/server'

function first(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0]
  return value
}

function getVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN ?? ''
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

function extractUserMessage(body: unknown) {
  if (!body || typeof body !== 'object') return ''

  const payload = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            text?: { body?: string }
          }>
        }
      }>
    }>
    messages?: Array<{
      text?: { body?: string }
    }>
    text?: { body?: string }
  }

  return (
    payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ??
    payload.messages?.[0]?.text?.body ??
    payload.text?.body ??
    ''
  )
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    string | { error?: string; received?: boolean; reply?: string }
  >
) {
  if (req.method === 'GET') {
    const mode = first(req.query['hub.mode'])
    const token = first(req.query['hub.verify_token'])
    const challenge = first(req.query['hub.challenge'])
    const VERIFY_TOKEN = getVerifyToken()

    if (mode && token === VERIFY_TOKEN) {
      res.status(200).send(challenge)
      return
    }

    res.status(403).send('Verification failed')
    return
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      const userMessage = extractUserMessage(body)
      let aiReply = ''

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

      if (openai && userMessage) {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4.1-mini',
            messages: [
              {
                role: 'system',
                content: 'You are Flux3D AI assistant for a 3D printing business.',
              },
              {
                role: 'user',
                content: userMessage,
              },
            ],
          })

          aiReply = completion.choices[0]?.message?.content ?? ''
          console.log('[whatsapp webhook] AI reply:', aiReply)
        } catch (openaiError) {
          console.error(
            '[whatsapp webhook] OpenAI request failed:',
            openaiError instanceof Error ? openaiError.message : openaiError
          )
        }
      }

      res.status(200).json({ received: true, reply: aiReply || undefined })
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
