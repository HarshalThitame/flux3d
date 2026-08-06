import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeBuilder(terminal: { method: string; result: unknown; error?: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
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

let jobShouldBeMissing = false

const mockClient = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null }),
  },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return makeBuilder({ method: 'single', result: { is_admin: true } })
    }
    if (table === 'meta_ad_campaign_jobs') {
      if (jobShouldBeMissing) {
        return makeBuilder({ method: 'single', result: null, error: { message: 'Not found' } })
      }
      return makeBuilder({
        method: 'single',
        result: {
          id: 'job-1',
          status: 'completed',
          payload: { categoryName: 'Test' },
          result: { campaignId: 'camp-1' },
          error_message: null,
          attempts: 1,
          created_at: '2026-01-01T00:00:00Z',
          started_at: '2026-01-01T00:00:01Z',
          completed_at: '2026-01-01T00:00:10Z',
        },
      })
    }
    return makeBuilder({ method: 'limit', result: [] })
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => Promise.resolve(mockClient),
  createServerClient: () => Promise.resolve(mockClient),
}))

vi.mock('@/lib/admin/server', () => ({
  createAdminSupabaseClient: () => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return makeBuilder({ method: 'maybeSingle', result: { is_admin: true } })
      }
      return makeBuilder({ method: 'limit', result: [] })
    }),
  }),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitResponse: () => Promise.resolve({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }),
}))

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

describe('GET /api/admin/ads/jobs/[id]', () => {
  let GET: (request: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/admin/ads/jobs/[id]/route')
    GET = mod.GET
  })

  it('returns job status for a valid job', async () => {
    const request = new Request('http://localhost/api/admin/ads/jobs/job-1')
    const response = await GET(request, { params: Promise.resolve({ id: 'job-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.id).toBe('job-1')
    expect(body.status).toBe('completed')
    expect(body.result).toEqual({ campaignId: 'camp-1' })
  })

  it('returns 404 for a missing job', async () => {
    jobShouldBeMissing = true

    const request = new Request('http://localhost/api/admin/ads/jobs/missing')
    const response = await GET(request, { params: Promise.resolve({ id: 'missing' }) })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error).toContain('Job not found')

    jobShouldBeMissing = false
  })
})
