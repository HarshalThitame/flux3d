import { describe, expect, it, vi } from 'vitest'

const insertMock = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}))

describe('WhatsApp RAG audit logging', () => {
  it('persists the answer audit payload', async () => {
    insertMock.mockResolvedValue({ error: null })
    const { logWhatsAppRagAudit } = await import('@/lib/whatsapp-rag-audit')

    await logWhatsAppRagAudit({
      webhook_event_id: 'event-1',
      sender: '+919999999999',
      user_id: 'user-1',
      question_text: 'How much will a part cost?',
      retrieval_mode: 'database',
      retrieval_confidence: 0.91,
      retrieval_sources: [{ sourceKey: 'pricing', title: 'Pricing', score: 0.91, content: 'Pricing depends on material.' }],
      response_kind: 'model',
      response_text: 'Hi, please share the file, material, quantity, and deadline.',
      response_metadata: { model: 'gpt-4.1-mini', promptTokens: 120 },
      fallback_reason: null,
      model_name: 'gpt-4.1-mini',
      prompt_version: 'whatsapp-rag-v2',
      latency_ms: 1234,
      retrieval_latency_ms: 120,
      generation_latency_ms: 420,
    })

    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        webhook_event_id: 'event-1',
        sender: '+919999999999',
        question_text: 'How much will a part cost?',
        retrieval_mode: 'database',
        response_kind: 'model',
        model_name: 'gpt-4.1-mini',
        prompt_version: 'whatsapp-rag-v2',
      })
    )
  })
})
