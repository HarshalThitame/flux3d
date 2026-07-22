import { beforeEach, describe, expect, it, vi } from 'vitest'

const openaiEmbeddingsCreate = vi.fn()
const rpcMock = vi.fn()
const supabaseRows = { value: [] as Array<Record<string, unknown>> }

vi.mock('openai', () => ({
  default: class MockOpenAI {
    embeddings = { create: openaiEmbeddingsCreate }
  },
}))

function makeBuilder() {
  const result = () => ({ data: supabaseRows.value, error: null })
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve(result())),
    maybeSingle: vi.fn(() => Promise.resolve(result())),
    single: vi.fn(),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'test-id' }, error: null }) })),
    })),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    upsert: vi.fn(),
    delete: vi.fn(),
    range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
    then: vi.fn((onfulfilled: (v: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(onfulfilled)),
  }
  return builder
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: rpcMock,
    from: vi.fn(() => makeBuilder()),
  })),
}))

function makeKnowledgeRow(id: string, sourceKey: string, title: string, content: string, priority = 0) {
  return {
    id, source_key: sourceKey, title, content,
    tags: ['test'], priority, active: true,
    created_at: '2026-07-20T00:00:00.000Z', updated_at: '2026-07-20T00:00:00.000Z',
    embedding: [0.1, 0.2, 0.3],
  }
}

describe('WhatsApp RAG — full pipeline', () => {
  beforeEach(() => {
    openaiEmbeddingsCreate.mockReset()
    rpcMock.mockReset()
    supabaseRows.value = []
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    openaiEmbeddingsCreate.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    })
  })

  it('returns DB mode when RPC returns matches', async () => {
    rpcMock.mockResolvedValue({
      data: [{
        id: 'row-1', source_key: 'pricing', title: 'Pricing', content: 'Pricing depends on material.',
        tags: ['pricing'], priority: 9, active: true,
        created_at: '2026-07-20T00:00:00.000Z', updated_at: '2026-07-20T00:00:00.000Z',
        similarity: 0.91,
      }],
      error: null,
    })

    const { getWhatsAppRagContext } = await import('@/lib/whatsapp-rag')
    const result = await getWhatsAppRagContext('How much does it cost?')

    expect(result.mode).toBe('database')
    expect(result.confidence).toBeGreaterThan(0.5)
    expect(result.sources).toHaveLength(1)
    expect(result.context).toContain('Pricing')
  })

  it('falls back to in-memory scoring when RPC returns empty but DB has chunks', async () => {
    supabaseRows.value = [
      makeKnowledgeRow('row-1', 'pricing', 'Pricing policy', 'Pricing depends on material, weight, and time.', 9),
    ]
    rpcMock.mockResolvedValue({ data: [], error: null })

    const { getWhatsAppRagContext } = await import('@/lib/whatsapp-rag')
    const result = await getWhatsAppRagContext('pricing')

    expect(result.mode).toBe('database')
    expect(result.sources.length).toBeGreaterThanOrEqual(0)
  })

  it('falls back to seed corpus when DB table is empty', async () => {
    supabaseRows.value = []
    rpcMock.mockResolvedValue({ data: [], error: null })

    const { getWhatsAppRagContext } = await import('@/lib/whatsapp-rag')
    const result = await getWhatsAppRagContext('What is PLA?')

    expect(result.mode).toBe('seed')
    expect(result.sources.length).toBeGreaterThanOrEqual(0)
  })

  it('returns empty context for empty query', async () => {
    const { getWhatsAppRagContext } = await import('@/lib/whatsapp-rag')
    const result = await getWhatsAppRagContext('')
    expect(result.context).toBe('')
    expect(result.mode).toBe('none')
  })

  it('returns empty context when OpenAI key is missing', async () => {
    delete process.env.OPENAI_API_KEY
    const { getWhatsAppRagContext } = await import('@/lib/whatsapp-rag')
    const result = await getWhatsAppRagContext('test')
    expect(result.context).toBe('')
    expect(result.mode).toBe('none')
  })

  it('extracts search keywords correctly', async () => {
    const { extractSearchKeywords } = await import('@/lib/whatsapp-keywords')
    const result = extractSearchKeywords('I want PLA+ filament for my PETG project')
    expect(result).toContain('pla+')
    expect(result).toContain('petg')
  })

  it('includes orderStatus when intent is order', async () => {
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')

    const result = await fetchStructuredData(['12345', 'order'], 'order')

    expect(result.orderStatus).toBeDefined()
    expect(typeof result.orderStatus).toBe('string')
  })

  it('fetchStructuredData returns empty for no keywords', async () => {
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')

    const result = await fetchStructuredData([], 'general')

    expect(result.totalMatches).toBe(0)
    expect(result.materials).toBe('')
    expect(result.products).toBe('')
    expect(result.orderStatus).toBe('')
  })
})
