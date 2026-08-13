import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getWhatsAppRagContext, fetchStructuredData } from '@/lib/whatsapp-rag'
import { extractSearchKeywords } from '@/lib/whatsapp-keywords'
import { detectWhatsAppIntent } from '@/lib/whatsapp/intent'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as { sender?: string; userPrompt?: string }
    const sender = body.sender?.trim()
    const userPrompt = body.userPrompt?.trim() || ''

    if (!sender) {
      return NextResponse.json({ error: 'Sender phone is required.' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key is not configured.' }, { status: 500 })
    }

    const supabase = createAdminSupabaseClient()

    // Fetch recent 10 messages from thread
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('direction, message_text, media_type, created_at')
      .eq('sender', sender)
      .order('created_at', { ascending: false })
      .limit(10)

    const reversedMessages = (messages ?? []).reverse()
    const lastCustomerMsg = reversedMessages.filter(m => m.direction === 'incoming').slice(-1)[0]?.message_text || userPrompt || 'Hello'

    // Fetch RAG knowledge context & structured data
    const keywords = extractSearchKeywords(lastCustomerMsg)
    const intent = detectWhatsAppIntent(lastCustomerMsg)
    const ragResult = await getWhatsAppRagContext(lastCustomerMsg)
    const structuredData = await fetchStructuredData(keywords, intent, sender)

    // Fetch customer's latest order if available
    const { data: latestOrder } = await supabase
      .from('shop_orders')
      .select('order_number, status, fulfilment_status, total_amount')
      .eq('phone', sender)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const openai = new OpenAI({ apiKey })
    const systemPrompt = `You are an expert customer support agent for Flux3D, a professional 3D printing & manufacturing service.
Draft a concise, helpful, friendly, and accurate WhatsApp reply to the customer.

KNOWLEDGEBASE CONTEXT:
${ragResult.context || 'No specific knowledge article matched.'}

CUSTOMER'S RECENT ORDER CONTEXT:
${latestOrder ? `Order #${latestOrder.order_number} - Status: ${latestOrder.status} (${latestOrder.fulfilment_status}) - Total: ₹${latestOrder.total_amount}` : 'No previous orders found.'}

MATERIALS & PRICING:
${structuredData.materials || 'PLA, PETG, ABS, TPU, Resin available.'}

INSTRUCTIONS:
- Keep the tone polite, professional, and clear.
- Provide actionable next steps (e.g. asking for file if quote needed, providing order update).
- Output ONLY the proposed reply text.`

    const conversationHistory: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ]

    for (const m of reversedMessages) {
      conversationHistory.push({
        role: m.direction === 'incoming' ? 'user' : 'assistant',
        content: m.media_type ? `[Customer attached ${m.media_type}] ${m.message_text}` : m.message_text,
      })
    }

    if (userPrompt) {
      conversationHistory.push({ role: 'user', content: `[Admin Instruction: ${userPrompt}]` })
    }

    const completion = await openai.chat.completions.create({
      model: process.env.WHATSAPP_OPENAI_MODEL || 'gpt-4.1-mini',
      messages: conversationHistory,
      temperature: 0.3,
      max_tokens: 400,
    })

    const draftReply = completion.choices[0]?.message?.content?.trim() || ''

    return NextResponse.json({ success: true, draftReply })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
