import { beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'

const chatCompletionsCreate = vi.fn()
const rpcMock = vi.fn()
const upsertMock = vi.fn()

const sessionData: { value: Record<string, unknown> | null } = { value: null }
const profileData: { value: Record<string, unknown> | null } = { value: null }

vi.mock('openai', () => ({
  default: class MockOpenAI {
    chat = { completions: { create: chatCompletionsCreate } }
    embeddings = { create: vi.fn().mockResolvedValue({ data: [{ embedding: [1, 0, 0] }] }) }
  },
}))

function makeBuilder() {
  const builder: Record<string, unknown> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    is: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => Promise.resolve({ data: [], error: null })),
    limit: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve({ data: [], error: null, count: 0 })),
    maybeSingle: vi.fn(() => {
      if (builder._table === 'profiles') return Promise.resolve({ data: profileData.value, error: null })
      if (builder._table === 'whatsapp_sessions') return Promise.resolve({ data: sessionData.value, error: null })
      return Promise.resolve({ data: null, error: null })
    }),
    single: vi.fn(),
    upsert: upsertMock,
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'test-event-id' }, error: null }) })),
    })),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  }
  return builder
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      const builder = makeBuilder()
      builder._table = table
      return builder
    }),
    rpc: rpcMock,
  })),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitCheck: vi.fn(() => Promise.resolve({ success: true, limit: 20, remaining: 19, reset: Date.now() + 60000 })),
}))

vi.mock('@/lib/settings', () => ({
  getCachedBusinessSettings: vi.fn(() => Promise.resolve(FALLBACK_SETTINGS)),
}))

vi.mock('@/lib/whatsapp-rag', () => ({
  getWhatsAppRagContext: vi.fn(() => Promise.resolve({
    context: 'Relevant knowledge.',
    sources: [{ sourceKey: 'test', title: 'Test', score: 0.95, content: 'knowledge' }],
    mode: 'database',
    confidence: 0.95,
  })),
  fetchStructuredData: vi.fn(() => Promise.resolve({
    materials: '',
    products: '',
    orderStatus: '',
    orderResults: [],
    totalMatches: 0,
    materialPrices: [],
    productPrices: [],
  })),
}))

vi.mock('@/lib/whatsapp-rag-audit', () => ({
  logWhatsAppRagAudit: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/whatsapp-intent-classifier', () => ({
  classifyIntent: vi.fn(() => Promise.resolve({ intent: 'general', keywords: [] })),
}))

vi.mock('@/lib/whatsapp-price-validation', () => ({
  validatePricesInResponse: vi.fn(() => ({ valid: true, safeResponse: '', mentionedPrices: [], hallucinatedPrices: [] })),
}))

const TEST_SECRET = 'test-webhook-secret'

function createPayload(from: string, text: string) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test-account-id',
      changes: [{
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: 'test-phone-id', display_phone_number: '15550000000' },
          contacts: [{ profile: { name: 'Test User' }, wa_id: from }],
          messages: [{ from, id: `msg-${Date.now()}`, timestamp: Math.floor(Date.now() / 1000).toString(), text: { body: text }, type: 'text' }],
        },
        field: 'messages',
      }],
    }],
  })
}

function createReqRes(rawBody: string) {
  const sig = 'sha256=' + crypto.createHmac('sha256', TEST_SECRET).update(rawBody, 'utf8').digest('hex')
  const req = new (class extends require('stream').Readable {
    headers: Record<string, string | string[] | undefined> = { 'x-hub-signature-256': sig, 'x-forwarded-for': '127.0.0.1' }
    query: Record<string, string | string[] | undefined> = {}
    method = 'POST'
    socket = { remoteAddress: '127.0.0.1' }
    constructor() { super(); }
    _read() { this.push(Buffer.from(rawBody, 'utf8')); this.push(null) }
  })()
  const res: Record<string, unknown> = {
    statusCode: 200,
    status: vi.fn(function (this: any, code: number) { this.statusCode = code; return this }),
    json: vi.fn(),
    send: vi.fn(),
    end: vi.fn(),
  }
  return { req: req as any, res: res as any }
}

describe('WhatsApp webhook handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
    process.env.WHATSAPP_WEBHOOK_SECRET = TEST_SECRET
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id'
    process.env.WHATSAPP_ACCESS_TOKEN = 'test-token'
    process.env.WHATSAPP_RAG_ENABLED = 'true'
    process.env.WHATSAPP_RAG_CONFIDENCE_THRESHOLD = '0.5'
    process.env.WHATSAPP_REPLY_TO_ALL = 'true'
    process.env.WHATSAPP_SESSION_TURNS = '4'
    process.env.META_CATALOG_ID = 'test-catalog-id'
    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: 'Hello! How can I help?' } }],
      model: 'gpt-4.1-mini',
      usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 },
    })
    rpcMock.mockResolvedValue({ error: null })
    sessionData.value = null
    profileData.value = null
    const { resetPendingAsyncWork } = vi.hoisted(() => ({ resetPendingAsyncWork: () => {} }))
    resetPendingAsyncWork?.()
  })

  it('verifies GET webhook correctly', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'my-verify-token'
    const { default: handler } = await import('@/pages/api/whatsapp')
    const req = { method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'my-verify-token', 'hub.challenge': '12345' } } as any
    const res = { status: vi.fn(() => res), send: vi.fn() } as any
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.send).toHaveBeenCalledWith('12345')
  })

  it('rejects GET with wrong verify token', async () => {
    process.env.WHATSAPP_VERIFY_TOKEN = 'real-token'
    const { default: handler } = await import('@/pages/api/whatsapp')
    const req = { method: 'GET', query: { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong-token', 'hub.challenge': '12345' } } as any
    const res = { status: vi.fn(() => res), send: vi.fn() } as any
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('rejects invalid HMAC signature', async () => {
    const { default: handler } = await import('@/pages/api/whatsapp')
    const rawBody = createPayload('+919999999999', 'Hello')
    const { req, res } = createReqRes(rawBody)
    req.headers['x-hub-signature-256'] = 'sha256=invalid'
    await handler(req, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('processes message and sends reply', async () => {
    profileData.value = { id: 'user-1', whatsapp_messages_sent: 0 }

    const handlerMod = await import('@/pages/api/whatsapp')
    const { default: handler } = handlerMod
    const rawBody = createPayload('+919999999999', 'What is PLA?')
    const { req, res } = createReqRes(rawBody)
    await handler(req, res)
    await handlerMod.getPendingWorkForTest()

    // Should have called OpenAI
    expect(chatCompletionsCreate).toHaveBeenCalled()
    // Should have saved session
    expect(rpcMock).toHaveBeenCalledWith('save_whatsapp_session', expect.objectContaining({
      p_phone: '+919999999999',
    }))
  })

  it('handles out_of_scope intent with fast path', async () => {
    const classifierMod = await import('@/lib/whatsapp-intent-classifier')
    vi.mocked(classifierMod.classifyIntent).mockResolvedValue({ intent: 'out_of_scope', keywords: [] })

    const handlerMod = await import('@/pages/api/whatsapp')
    const { default: handler } = handlerMod
    const rawBody = createPayload('+919999999998', 'What is the weather?')
    const { req, res } = createReqRes(rawBody)
    await handler(req, res)
    await handlerMod.getPendingWorkForTest()

    // Should NOT have called OpenAI for out-of-scope
    expect(chatCompletionsCreate).not.toHaveBeenCalled()
  })

  it('falls back to guided reply when RAG confidence is low', async () => {
    const ragMod = await import('@/lib/whatsapp-rag')
    vi.mocked(ragMod.getWhatsAppRagContext).mockResolvedValue({
      context: '',
      sources: [],
      mode: 'none',
      confidence: 0,
    })

    const handlerMod = await import('@/pages/api/whatsapp')
    const { default: handler } = handlerMod
    const rawBody = createPayload('+919999999997', 'How much does it cost?')
    const { req, res } = createReqRes(rawBody)
    await handler(req, res)
    await handlerMod.getPendingWorkForTest()

    // Should fall back — no OpenAI call (guided reply)
    expect(chatCompletionsCreate).not.toHaveBeenCalled()
  })

  it('processes greeting intent', async () => {
    const classifierMod = await import('@/lib/whatsapp-intent-classifier')
    vi.mocked(classifierMod.classifyIntent).mockResolvedValue({ intent: 'greeting', keywords: [] })

    const ragMod = await import('@/lib/whatsapp-rag')
    vi.mocked(ragMod.getWhatsAppRagContext).mockResolvedValue({
      context: 'Welcome info',
      sources: [{ sourceKey: 'welcome', title: 'Welcome', score: 0.8, content: 'Welcome' }],
      mode: 'database',
      confidence: 0.8,
    })

    chatCompletionsCreate.mockResolvedValue({
      choices: [{ message: { content: 'Hello! Welcome to Flux3D. How can I help?' } }],
      model: 'gpt-4.1-mini',
      usage: { prompt_tokens: 30, completion_tokens: 10, total_tokens: 40 },
    })

    const handlerMod = await import('@/pages/api/whatsapp')
    const { default: handler } = handlerMod
    const rawBody = createPayload('+919999999996', 'Hi there!')
    const { req, res } = createReqRes(rawBody)
    await handler(req, res)
    await handlerMod.getPendingWorkForTest()

    expect(chatCompletionsCreate).toHaveBeenCalled()
  })
})
