import { beforeEach, describe, it, expect, vi } from 'vitest'

interface Builder {
  (table: string): Builder
  _table: string
  update: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  select: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  or: ReturnType<typeof vi.fn>
  neq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
}

let resolveMaybeSingle: (val: { data: Record<string, unknown> | null; error: unknown }) => void
let eqArgs: Array<{ col: string; val: unknown; table: string }>

function makeBuilder(table: string): Builder {
  const b = function (): Builder {
    return b
  } as Builder
  b._table = table
  b.update = vi.fn(() => b)
  b.insert = vi.fn(() => b)
  b.eq = vi.fn((col: string, val: unknown) => {
    eqArgs.push({ col, val, table })
    return b
  })
  b.select = vi.fn(() => b)
  b.maybeSingle = vi.fn(() => new Promise<{ data: Record<string, unknown> | null; error: unknown }>((resolve) => {
    resolveMaybeSingle = resolve
  }))
  b.single = vi.fn(() => new Promise<{ data: Record<string, unknown> | null; error: unknown }>((resolve) => {
    resolveMaybeSingle = resolve
  }))
  b.or = vi.fn(() => b)
  b.neq = vi.fn(() => b)
  b.in = vi.fn(() => b)
  b.order = vi.fn(() => b)
  b.limit = vi.fn(() => b)
  return b
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => makeBuilder(table)),
  })),
}))

vi.mock('@/lib/supabase/config', () => ({
  getSupabaseUrl: () => 'https://test.supabase.co',
  getSupabaseServiceRoleKey: () => 'key_test',
}))

describe('tryUpdatePaymentAttemptStatus — atomic guard', () => {
  beforeEach(() => {
    resolveMaybeSingle = () => {}
    eqArgs = []
  })

  it('adds a status equality filter so concurrent transitions are blocked', async () => {
    vi.unstubAllEnvs()
    const { tryUpdatePaymentAttemptStatus } = await import('@/lib/payments/state')
    const reason = { actorId: 'system', actorRole: 'system' as const, reason: 'Webhook payment.captured' }

    const p = tryUpdatePaymentAttemptStatus('att_1', 'pending', 'paid', { foo: 1 }, reason)
    // Concurrent event already moved status → 0 rows matched.
    resolveMaybeSingle({ data: null, error: null })
    const res = await p

    expect(res).toBeNull()
    const statusFilter = eqArgs.find((a) => a.col === 'status')
    expect(statusFilter).toBeDefined()
    expect(statusFilter?.val).toBe('pending')
    expect(eqArgs.find((a) => a.col === 'id')).toBeDefined()
  })

  it('updatePaymentAttemptStatus still throws when the row is no longer in the expected state', async () => {
    vi.unstubAllEnvs()
    const { updatePaymentAttemptStatus } = await import('@/lib/payments/state')
    const reason = { actorId: 'system', actorRole: 'system' as const, reason: 'test' }
    const p = updatePaymentAttemptStatus('att_1', 'pending', 'paid', {}, reason)
    resolveMaybeSingle({ data: null, error: null })
    await expect(p).rejects.toThrow('Payment attempt not found.')
  })

  it('returns the row when the guarded update succeeds', async () => {
    vi.unstubAllEnvs()
    const { tryUpdatePaymentAttemptStatus } = await import('@/lib/payments/state')
    const reason = { actorId: 'system', actorRole: 'system' as const, reason: 'Webhook payment.captured' }
    const p = tryUpdatePaymentAttemptStatus('att_1', 'pending', 'paid', { captured_at: 'now' }, reason)
    resolveMaybeSingle({
      data: { id: 'att_1', status: 'paid', internal_order_id: 'o1', amount_paise: 99900, currency: 'INR' },
      error: null,
    })
    const res = await p
    expect(res).not.toBeNull()
    expect((res as Record<string, unknown>).status).toBe('paid')
  })
})
