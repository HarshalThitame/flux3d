import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'

const openaiEmbeddingsCreate = vi.fn()
const rpcMock = vi.fn()
const testState = vi.hoisted(() => ({
  supabaseRows: [] as Array<Record<string, unknown>>,
}))

function makeQueryBuilder(rows: Array<Record<string, unknown>>) {
  const state = { orderCalls: 0 }

  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    order: vi.fn(() => {
      state.orderCalls += 1
      if (state.orderCalls >= 2) {
        return Promise.resolve({ data: rows, error: null })
      }
      return builder
    }),
  }

  return builder
}

vi.mock('openai', () => ({
  default: class MockOpenAI {
    embeddings = {
      create: openaiEmbeddingsCreate,
    }
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: rpcMock,
    from: vi.fn(() => makeQueryBuilder(testState.supabaseRows)),
  })),
}))

describe('WhatsApp RAG policy', () => {
  beforeEach(() => {
    openaiEmbeddingsCreate.mockReset()
    rpcMock.mockReset()
    testState.supabaseRows = []
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    openaiEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: [1, 0, 0] }],
    })
  })

  it('builds guided replies for pricing questions without guessing', async () => {
    const { buildGuidedFallbackReply } = await import('@/pages/api/whatsapp')
    const { detectWhatsAppIntent } = await import('@/lib/whatsapp/intent')
    const reply = buildGuidedFallbackReply(FALLBACK_SETTINGS as never, 'how much does it cost?')

    expect(detectWhatsAppIntent('how much does it cost?')).toBe('pricing')
    expect(reply).toContain('For a confirmed quote')
    expect(reply).toContain('file, material, quantity, and deadline')
    expect(reply).not.toContain('I think')
  })

  it('returns database-backed RAG context when the knowledge table matches', async () => {
    testState.supabaseRows = [
      {
        id: 'row-1',
        source_key: 'pricing',
        title: 'Pricing policy',
        content: 'Pricing depends on material, weight, print time, and finish.',
        tags: ['pricing'],
        priority: 9,
        active: true,
        created_at: '2026-07-20T00:00:00.000Z',
        updated_at: '2026-07-20T00:00:00.000Z',
        embedding: [0, 1, 0],
      },
    ]

    rpcMock.mockResolvedValue({
      data: [
        {
          id: 'row-1',
          source_key: 'pricing',
          title: 'Pricing policy',
          content: 'Pricing depends on material, weight, print time, and finish.',
          tags: ['pricing'],
          priority: 9,
          active: true,
          created_at: '2026-07-20T00:00:00.000Z',
          updated_at: '2026-07-20T00:00:00.000Z',
          similarity: 0.91,
        },
      ],
      error: null,
    })

    const { getWhatsAppRagContext } = await import('@/lib/whatsapp-rag')
    const rag = await getWhatsAppRagContext('How do you price a part?')

    expect(rag.mode).toBe('database')
    expect(rag.confidence).toBeGreaterThan(0.5)
    expect(rag.sources).toHaveLength(1)
    expect(rag.sources[0]?.title).toBe('Pricing policy')
    expect(rag.context).toContain('Pricing policy')
  })
})
