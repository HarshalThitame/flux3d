import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'

const rpcMock = vi.fn()
const chatCompletionsCreate = vi.fn()

const materialRows: { value: Array<Record<string, unknown>> } = { value: [] }
const productRows: { value: Array<Record<string, unknown>> } = { value: [] }
const orderRows: { value: Array<Record<string, unknown>> } = { value: [] }
const profileRows: { value: Record<string, unknown> | null } = { value: null }

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    or: vi.fn(() => builder),
    maybeSingle: vi.fn(() => {
      if (table === 'profiles') return Promise.resolve({ data: profileRows.value, error: null })
      return Promise.resolve({ data: null, error: null })
    }),
    order: vi.fn(() => builder),
    limit: vi.fn(() => {
      if (table === 'materials') return Promise.resolve({ data: materialRows.value.length ? materialRows.value : null, error: null })
      if (table === 'shelf_orders') return Promise.resolve({ data: orderRows.value.length ? orderRows.value : null, error: null })
      return Promise.resolve({ data: productRows.value.length ? productRows.value : null, error: null })
    }),
  }
  return builder
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => makeBuilder(table)),
    rpc: rpcMock,
  })),
}))

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = {
      completions: {
        create: chatCompletionsCreate,
      },
    }
  },
}))

describe('extractSearchKeywords', () => {
  it('extracts known material names', async () => {
    const { extractSearchKeywords } = await import('@/lib/whatsapp-keywords')
    expect(extractSearchKeywords('What is the price of PLA filament?')).toContain('pla')
    expect(extractSearchKeywords('Do you have PETG in stock?')).toContain('petg')
    expect(extractSearchKeywords('ABS is stronger than PLA')).toEqual(expect.arrayContaining(['abs', 'pla']))
  })

  it('extracts number sequences as keywords', async () => {
    const { extractSearchKeywords } = await import('@/lib/whatsapp-keywords')
    const result = extractSearchKeywords('My order number is 12345')
    expect(result).toContain('12345')
  })

  it('extracts pricing intent as keyword', async () => {
    const { extractSearchKeywords } = await import('@/lib/whatsapp-keywords')
    const result = extractSearchKeywords('How much does it cost?')
    expect(result).toContain('pricing')
  })

  it('extracts shipping intent as keyword', async () => {
    const { extractSearchKeywords } = await import('@/lib/whatsapp-keywords')
    const result = extractSearchKeywords('What are your delivery charges?')
    expect(result).toContain('shipping')
  })

  it('returns empty array for simple greetings', async () => {
    const { extractSearchKeywords } = await import('@/lib/whatsapp-keywords')
    expect(extractSearchKeywords('Hello')).toEqual([])
    expect(extractSearchKeywords('Hi')).toEqual([])
  })

  it('returns unique keywords (no duplicates)', async () => {
    const { extractSearchKeywords } = await import('@/lib/whatsapp-keywords')
    const result = extractSearchKeywords('PLA and pla and Pla')
    const plaCount = result.filter((k: string) => k === 'pla').length
    expect(plaCount).toBe(1)
  })

  it('does not include removed materials (pc, glow)', async () => {
    const { extractSearchKeywords } = await import('@/lib/whatsapp-keywords')
    expect(extractSearchKeywords('What is the price?')).not.toContain('pc')
    expect(extractSearchKeywords('It is glowing nicely')).not.toContain('glow')
  })
})

describe('fetchStructuredData', () => {
  beforeEach(() => {
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    materialRows.value = []
    productRows.value = []
  })

  it('returns empty result for no keywords', async () => {
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
    const result = await fetchStructuredData([], 'general')
    expect(result.totalMatches).toBe(0)
    expect(result.materials).toBe('')
    expect(result.products).toBe('')
    expect(result.materialPrices).toEqual([])
    expect(result.productPrices).toEqual([])
  })

  it('returns empty result for intent-only keywords', async () => {
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
    const result = await fetchStructuredData(['pricing', 'shipping'], 'pricing')
    expect(result.totalMatches).toBe(0)
    expect(result.materialPrices).toEqual([])
  })

  it('queries materials table and formats results', async () => {
    materialRows.value = [
      { name: 'PLA+', price_per_unit: 2.8, price_per_gram: 2.8, summary: 'Easy to print' },
    ]
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
    const result = await fetchStructuredData(['pla'], 'materials')
    expect(result.materials).toContain('PLA+')
    expect(result.materials).toContain('₹2.80')
    expect(result.totalMatches).toBe(1)
    expect(result.materialPrices).toEqual([{ name: 'PLA+', price: 2.8 }])
  })

  it('queries shelf_products table and formats results', async () => {
    productRows.value = [
      { name: 'PLA Vase', base_price: 499, description: 'Beautiful decorative vase', tags: ['vase', 'pla'], is_active: true },
    ]
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
    const result = await fetchStructuredData(['vase'], 'general')
    expect(result.products).toContain('PLA Vase')
    expect(result.products).toContain('₹499')
    expect(result.totalMatches).toBe(1)
    expect(result.productPrices).toEqual([{ name: 'PLA Vase', price: 499 }])
  })

  it('filters out materials with zero price', async () => {
    materialRows.value = [
      { name: 'PLA+', price_per_unit: 0, price_per_gram: null, summary: 'Zero price entry' },
    ]
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
    const result = await fetchStructuredData(['pla'], 'materials')
    expect(result.materials).toBe('')
    expect(result.totalMatches).toBe(0)
    expect(result.materialPrices).toEqual([])
  })

  it('filters out products with zero base_price', async () => {
    productRows.value = [
      { name: 'Free Item', base_price: 0, description: 'Freebie', tags: [], is_active: true },
    ]
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
    const result = await fetchStructuredData(['free'], 'pricing')
    expect(result.products).toBe('')
    expect(result.totalMatches).toBe(0)
    expect(result.productPrices).toEqual([])
  })

  it('gracefully handles supabase being null', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
    const result = await fetchStructuredData(['pla'], 'materials')
    expect(result.totalMatches).toBe(0)
    expect(result.materialPrices).toEqual([])
  })

  describe('ORDER_STATUS intent', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
      materialRows.value = []
      productRows.value = []
      orderRows.value = []
      profileRows.value = null
    })

    it('returns formatted order rows when phone matches orders', async () => {
      profileRows.value = { id: 'user-123' }
      orderRows.value = [
        { order_number: 'ORD-001', order_status: 'shipped', total_amount: 1499, placed_at: '2026-07-20', items: [{ name: 'PLA Vase' }] },
        { order_number: 'ORD-002', order_status: 'confirmed', total_amount: 2999, placed_at: '2026-07-21', items: [{ name: 'PETG Bracket' }, { name: 'Screws' }] },
      ]

      const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
      const result = await fetchStructuredData(['order'], 'order', '+919999999991')

      expect(result.orderStatus).toContain('ORD-001')
      expect(result.orderStatus).toContain('shipped')
      expect(result.orderStatus).toContain('₹1499.00')
      expect(result.orderResults).toHaveLength(2)
      expect(result.orderResults[0].orderNumber).toBe('ORD-001')
      expect(result.orderResults[0].status).toBe('shipped')
      expect(result.orderResults[0].total).toBe(1499)
      expect(result.orderResults[0].items).toBe(1)
      expect(result.orderResults[1].items).toBe(2)
      expect(result.totalMatches).toBe(2)
    })

    it('returns fallback string when no orders found for the phone', async () => {
      profileRows.value = { id: 'user-456' }
      orderRows.value = []

      const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
      const result = await fetchStructuredData(['order'], 'order', '+919999999992')

      expect(result.orderStatus).toBe('No orders found for this number.')
      expect(result.orderResults).toHaveLength(0)
      expect(result.totalMatches).toBe(0)
    })

    it('skips order query entirely for non-order intent', async () => {
      orderRows.value = [
        { order_number: 'ORD-003', order_status: 'placed', total_amount: 999, placed_at: '2026-07-22', items: [] },
      ]

      const { fetchStructuredData } = await import('@/lib/whatsapp-rag')
      const result = await fetchStructuredData(['pla'], 'materials', '+919999999993')

      // order should not be queried for 'materials' intent
      expect(result.orderStatus).toBe('')
      expect(result.orderResults).toHaveLength(0)
      expect(result.materials).toBeDefined()
    })
  })
})

describe('prompt assembly with live data', () => {
  beforeEach(() => {
    chatCompletionsCreate.mockReset()
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.WHATSAPP_RAG_ENABLED = 'false'
    process.env.WHATSAPP_REPLY_TO_ALL = 'true'
    process.env.WHATSAPP_SESSION_TURNS = '4'

    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: 'Sure, here is the info.' } }],
      model: 'gpt-4.1-mini',
      usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
    })
  })

  it('includes [MATERIAL PRICING FROM DATABASE] section when materials data present', async () => {
    const { generateWhatsAppReply } = await import('@/pages/api/whatsapp')

    const liveData = {
      materials: 'Material: PLA+ | From ₹2.80/g | Easy to print filament',
      products: '',
      orderStatus: '',
      orderResults: [],
      totalMatches: 1,
      materialPrices: [{ name: 'PLA+', price: 2.8 }],
      productPrices: [],
    }

    await generateWhatsAppReply('How much is PLA?', FALLBACK_SETTINGS as never, '', [], liveData)

    const callArg = chatCompletionsCreate.mock.calls[0][0]
    const systemMsg = callArg.messages.find((m: ChatCompletionMessageParam) => m.role === 'system')
    expect(systemMsg.content).toContain('[MATERIAL PRICING FROM DATABASE]')
    expect(systemMsg.content).toContain('PLA+')
    expect(systemMsg.content).toContain('₹2.80')
  })

  it('includes [PRODUCT PRICING FROM DATABASE] section when products data present', async () => {
    const { generateWhatsAppReply } = await import('@/pages/api/whatsapp')

    const liveData = {
      materials: '',
      products: 'Product: 3D Printed Vase | ₹499 | Beautiful decorative vase',
      orderStatus: '',
      orderResults: [],
      totalMatches: 1,
      materialPrices: [],
      productPrices: [{ name: '3D Printed Vase', price: 499 }],
    }

    await generateWhatsAppReply('Tell me about the vase', FALLBACK_SETTINGS as never, '', [], liveData)

    const callArg = chatCompletionsCreate.mock.calls[0][0]
    const systemMsg = callArg.messages.find((m: ChatCompletionMessageParam) => m.role === 'system')
    expect(systemMsg.content).toContain('[PRODUCT PRICING FROM DATABASE]')
    expect(systemMsg.content).toContain('3D Printed Vase')
    expect(systemMsg.content).toContain('₹499')
  })

  it('includes strict pricing rule when live data present', async () => {
    const { generateWhatsAppReply } = await import('@/pages/api/whatsapp')

    const liveData = {
      materials: 'Material: ABS | From ₹3.50/g',
      products: '',
      orderStatus: '',
      orderResults: [],
      totalMatches: 1,
      materialPrices: [{ name: 'ABS', price: 3.5 }],
      productPrices: [],
    }

    await generateWhatsAppReply('ABS price?', FALLBACK_SETTINGS as never, '', [], liveData)

    const callArg = chatCompletionsCreate.mock.calls[0][0]
    const systemMsg = callArg.messages.find((m: ChatCompletionMessageParam) => m.role === 'system')
    expect(systemMsg.content).toContain('STRICT RULE')
    expect(systemMsg.content).toContain('ONLY use the values above')
    expect(systemMsg.content).toContain('never invent prices')
  })

  it('omits live data section when no matches found', async () => {
    const { generateWhatsAppReply } = await import('@/pages/api/whatsapp')

    const liveData = { materials: '', products: '', orderStatus: '', orderResults: [], totalMatches: 0, materialPrices: [], productPrices: [] }

    await generateWhatsAppReply('Hello', FALLBACK_SETTINGS as never, '', [], liveData)

    const callArg = chatCompletionsCreate.mock.calls[0][0]
    const systemMsg = callArg.messages.find((m: ChatCompletionMessageParam) => m.role === 'system')
    expect(systemMsg.content).not.toContain('[MATERIAL PRICING FROM DATABASE]')
    expect(systemMsg.content).not.toContain('[PRODUCT PRICING FROM DATABASE]')
  })

  it('injects live data before knowledge base context', async () => {
    const { generateWhatsAppReply } = await import('@/pages/api/whatsapp')

    const liveData = {
      materials: 'Material: TPU | From ₹4.00/g',
      products: '',
      orderStatus: '',
      orderResults: [],
      totalMatches: 1,
      materialPrices: [{ name: 'TPU', price: 4.0 }],
      productPrices: [],
    }

    await generateWhatsAppReply('TPU info', FALLBACK_SETTINGS as never, 'TPU is flexible filament.\nGreat for phone cases.', [], liveData)

    const callArg = chatCompletionsCreate.mock.calls[0][0]
    const systemMsg = callArg.messages.find((m: ChatCompletionMessageParam) => m.role === 'system')?.content as string

    const liveDataIndex = systemMsg.indexOf('[MATERIAL PRICING FROM DATABASE]')
    const kbIndex = systemMsg.indexOf('Relevant Flux3D knowledge base')

    expect(liveDataIndex).toBeGreaterThan(-1)
    expect(kbIndex).toBeGreaterThan(-1)
    expect(liveDataIndex).toBeLessThan(kbIndex)
  })
})
