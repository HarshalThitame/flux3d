import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseFromMock = vi.fn()

const DEFAULT_RESOLVE = { data: [], error: null, count: 0 } as const

function makeChainableBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    or: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lt: vi.fn(() => builder),
    order: vi.fn(() => builder),
    range: vi.fn(() => Promise.resolve(DEFAULT_RESOLVE)),
    limit: vi.fn(() => Promise.resolve({ data: null, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
    single: vi.fn(),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'test-event-id' }, error: null }) })),
    })),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
    upsert: vi.fn(),
    delete: vi.fn(),
  }
  return builder
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: supabaseFromMock,
    rpc: vi.fn(),
  })),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: supabaseFromMock,
  }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'admin-1' } }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: { is_admin: true }, error: null }),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/admin/request', () => ({
  requireAdminRequest: vi.fn().mockResolvedValue({ supabase: {}, user: { id: 'admin-1' } }),
}))

describe('WhatsApp admin APIs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('webhook events listing', () => {
    it('lists failed events', async () => {
      const mockEvents = [{ id: '1', sender: '+911234567890', retry_count: 3, last_error: 'OpenAI timeout' }]
      const builder = makeChainableBuilder()
      builder.range = vi.fn(() => Promise.resolve({ data: mockEvents, error: null, count: 1 }))
      supabaseFromMock.mockReturnValue(builder)

      const { GET } = await import('@/app/api/admin/whatsapp-webhook-events/route')
      const request = new Request('http://localhost/api/admin/whatsapp-webhook-events?status=failed')
      const response = await GET(request) as Response
      const body = await response.json()

      expect(body.events).toBeDefined()
      expect(body.events).toHaveLength(1)
      expect(body.events[0].last_error).toBe('OpenAI timeout')
      expect(response.status).toBe(200)
    })
  })

  describe('quick replies admin API', () => {
    it('updates a quick reply via PUT with content', async () => {
      const updated = { id: 'qr-1', shortcut: '/quote', title: '3D File Quote Request', content: 'New content', category: 'pricing' }
      const singleFn = vi.fn().mockResolvedValue({ data: updated, error: null })
      const selectFn = vi.fn(() => ({ single: singleFn }))
      const eqFn = vi.fn().mockReturnValue({ select: selectFn })
      const updateFn = vi.fn(() => ({ eq: eqFn }))
      const builder = makeChainableBuilder()
      builder.update = updateFn
      supabaseFromMock.mockReturnValue(builder)

      const { PUT } = await import('@/app/api/admin/whatsapp/quick-replies/route')
      const request = new Request('http://localhost/api/admin/whatsapp/quick-replies?id=qr-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'New content' }),
      })
      const response = await PUT(request) as Response
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.quickReply.content).toBe('New content')
      expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ content: 'New content' }))
      expect(eqFn).toHaveBeenCalledWith('id', 'qr-1')
    })

    it('returns 400 when PUT has no id', async () => {
      const { PUT } = await import('@/app/api/admin/whatsapp/quick-replies/route')
      const request = new Request('http://localhost/api/admin/whatsapp/quick-replies', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'x' }),
      })
      const response = await PUT(request) as Response
      expect(response.status).toBe(400)
    })

    it('deletes a quick reply via DELETE with id query param', async () => {
      const eqFn = vi.fn().mockResolvedValue({ data: null, error: null })
      const builder = makeChainableBuilder()
      builder.delete = vi.fn(() => ({ eq: eqFn }))
      supabaseFromMock.mockReturnValue(builder)

      const { DELETE } = await import('@/app/api/admin/whatsapp/quick-replies/route')
      const request = new Request('http://localhost/api/admin/whatsapp/quick-replies?id=qr-1', { method: 'DELETE' })
      const response = await DELETE(request) as Response

      expect(response.status).toBe(200)
      expect(builder.delete).toHaveBeenCalled()
      expect(eqFn).toHaveBeenCalledWith('id', 'qr-1')
    })
  })
})
