import { beforeEach, beforeAll, describe, expect, it, vi } from 'vitest'

function makeBuilder(terminal: { method: string; result: unknown; error?: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
  }
  if (builder[terminal.method]) {
    builder[terminal.method] = vi.fn(() => Promise.resolve({ data: terminal.result, error: terminal.error ?? null }))
  }
  return builder
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => Promise.resolve({
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return makeBuilder({ method: 'single', result: { is_admin: true } })
      }
      if (table === 'shelf_categories') {
        return makeBuilder({
          method: 'eq',
          result: [{ id: 'cat-1', name: '3D Printed Home Decor' }],
        })
      }
      if (table === 'shelf_products') {
        return makeBuilder({
          method: 'limit',
          result: [
            {
              id: 'prod-1',
              name: 'Decor Vase',
              slug: 'decor-vase',
              thumbnail_url: 'https://example.com/vase.jpg',
              base_price: 500,
              created_at: new Date().toISOString(),
              category_id: 'cat-1',
              shelf_skus: [
                { sku_code: 'SKU-1', price: 600, variant_image_url: 'https://example.com/vase-red.jpg', is_available: true, stock_quantity: 5 },
              ],
            },
          ],
        })
      }
      if (table === 'meta_ad_campaigns') {
        // Used multiple times: idempotency check, insert, and potentially local record queries
        return makeBuilder({ method: 'maybeSingle', result: null })
      }
      return makeBuilder({ method: 'limit', result: [] })
    }),
  })),
}))

vi.mock('@/lib/meta/marketing-api', () => ({
  createPausedCarouselCampaign: vi.fn(() =>
    Promise.resolve({ campaignId: 'camp-1', adSetId: 'as-1', creativeId: 'cr-1', adId: 'ad-1' })
  ),
  createPausedDPARetargetingCampaign: vi.fn(() =>
    Promise.resolve({ campaignId: 'camp-dpa-1', adSetId: 'as-dpa-1', creativeId: 'cr-dpa-1', adId: 'ad-dpa-1' })
  ),
  deleteCampaign: vi.fn(() => Promise.resolve({ success: true })),
}))

vi.mock('@/lib/meta/config', () => ({
  getMetaPixelId: () => 'pixel-123',
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitResponse: () => Promise.resolve({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }),
}))

vi.mock('@/lib/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

import { POST } from '@/app/api/admin/ads/create/route'

beforeAll(() => {
  process.env.META_PAGE_ID = '1205635789300602'
})

describe('POST /api/admin/ads/create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a campaign successfully', async () => {
    const request = new Request('http://localhost/api/admin/ads/create', {
      method: 'POST',
      body: JSON.stringify({ categoryName: '3D Printed Home Decor', dailyBudgetPaise: 15000 }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.carousel.campaignId).toBe('camp-1')
    expect(body.dpa).not.toBeNull()
  })

  it('rejects non-admin users', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockImplementationOnce(() => Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn(() => makeBuilder({ method: 'single', result: { is_admin: false } })),
    } as any))

    const request = new Request('http://localhost/api/admin/ads/create', {
      method: 'POST',
      body: JSON.stringify({ categoryName: 'Test', dailyBudgetPaise: 15000 }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error).toContain('Forbidden')
  })

  it('returns 400 for invalid budget (below minimum)', async () => {
    const request = new Request('http://localhost/api/admin/ads/create', {
      method: 'POST',
      body: JSON.stringify({ categoryName: 'Test', dailyBudgetPaise: 1000 }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Minimum daily budget')
  })

  it('returns 400 for invalid budget (above maximum)', async () => {
    const request = new Request('http://localhost/api/admin/ads/create', {
      method: 'POST',
      body: JSON.stringify({ categoryName: 'Test', dailyBudgetPaise: 20000000 }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Maximum daily budget')
  })

  it('returns 409 when duplicate idempotency key exists', async () => {
    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockImplementationOnce(() => Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return makeBuilder({ method: 'single', result: { is_admin: true } })
        }
        if (table === 'meta_ad_campaigns') {
          return makeBuilder({
            method: 'maybeSingle',
            result: { id: 'existing-id', campaign_id: 'camp-existing', created_at: new Date().toISOString() },
          })
        }
        return makeBuilder({ method: 'limit', result: [] })
      }),
    } as any))

    const request = new Request('http://localhost/api/admin/ads/create', {
      method: 'POST',
      body: JSON.stringify({ categoryName: '3D Printed Home Decor', dailyBudgetPaise: 15000 }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error).toContain('already created today')
    expect(body.existingCampaignId).toBe('camp-existing')
  })

  it('rolls back Meta entities when DB insert fails', async () => {
    const { deleteCampaign } = await import('@/lib/meta/marketing-api')

    const { createServerClient } = await import('@/lib/supabase/server')
    vi.mocked(createServerClient).mockImplementationOnce(() => Promise.resolve({
      auth: {
        getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === 'profiles') {
          return makeBuilder({ method: 'single', result: { is_admin: true } })
        }
        if (table === 'shelf_categories') {
          return makeBuilder({ method: 'eq', result: [{ id: 'cat-1', name: '3D Printed Home Decor' }] })
        }
        if (table === 'shelf_products') {
          return makeBuilder({
            method: 'limit',
            result: [
              {
                id: 'prod-1',
                name: 'Decor Vase',
                slug: 'decor-vase',
                thumbnail_url: 'https://example.com/vase.jpg',
                base_price: 500,
                created_at: new Date().toISOString(),
                category_id: 'cat-1',
                shelf_skus: [
                  { sku_code: 'SKU-1', price: 600, variant_image_url: 'https://example.com/vase-red.jpg', is_available: true, stock_quantity: 5 },
                ],
              },
            ],
          })
        }
        if (table === 'meta_ad_campaigns') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
              })),
            })),
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'DB write failed' } })),
              })),
            })),
          }
        }
        return makeBuilder({ method: 'limit', result: [] })
      }),
    } as any))

    const request = new Request('http://localhost/api/admin/ads/create', {
      method: 'POST',
      body: JSON.stringify({ categoryName: '3D Printed Home Decor', dailyBudgetPaise: 15000 }),
    })

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toContain('Meta campaigns have been archived')
    expect(deleteCampaign).toHaveBeenCalled()
  })

  it('handles missing pageId gracefully', async () => {
    const request = new Request('http://localhost/api/admin/ads/create', {
      method: 'POST',
      body: JSON.stringify({ categoryName: 'Test', dailyBudgetPaise: 15000 }),
    })

    // Unset the env var so pageId becomes null
    const prev = process.env.META_PAGE_ID
    delete (process.env as Record<string, string>).META_PAGE_ID

    const response = await POST(request as any)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Missing Facebook Page ID')

    process.env.META_PAGE_ID = prev
  })
})
