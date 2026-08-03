import { describe, expect, it, vi, beforeEach } from 'vitest'
import { hashOtp } from '@/lib/account-linking/tokens'

/**
 * Minimal chainable PostgREST mock. Every builder method returns `this`; the
 * terminal `maybeSingle()`/`single()` resolve to the configured `data`/`error`.
 * Mirrors the mocking style in src/__tests__/whatsapp-rag-audit.test.ts.
 */
class Builder {
  data: unknown = null
  error: unknown = null
  calls: Record<string, Array<unknown> | undefined> = {}
  insert(v: unknown) { this.calls.insert = [v]; return this }
  select(v?: unknown) { this.calls.select = [v]; return this }
  update(v: unknown) { this.calls.update = [v]; return this }
  delete() { return this }
  eq(c: string, v: unknown) { ;(this.calls.eq ||= []).push([c, v]); return this }
  is(c: string, v: unknown) { ;(this.calls.is ||= []).push([c, v]); return this }
  not(c: string, op: string, v: unknown) { ;(this.calls.not ||= []).push([c, op, v]); return this }
  gt(c: string, v: unknown) { ;(this.calls.gt ||= []).push([c, v]); return this }
  order(c: string, o?: unknown) { this.calls.order = [c, o]; return this }
  maybeSingle() { return Promise.resolve({ data: this.data, error: this.error }) }
  single() { return Promise.resolve({ data: this.data, error: this.error }) }
}

const insertMock = new Builder()
const selectMock = new Builder()
const updateMock = new Builder()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: (...a: unknown[]) => { insertMock.insert(a[0]); return insertMock },
      select: (...a: unknown[]) => { selectMock.select(a[0]); return selectMock },
      update: (...a: unknown[]) => { updateMock.update(a[0]); return updateMock },
      delete: () => deleteMock,
    }),
    rpc: () => Promise.resolve({ data: { orders_attributed: 0 }, error: null }),
  }),
}))

const deleteMock = new Builder()

const {
  createLinkRequest,
  consumeLinkRequestByToken,
  getLinkRequestByToken,
  getPendingRequestByPhone,
  verifyOtpForPhone,
} = await import('@/lib/account-linking/link-requests')

describe('link-requests', () => {
  beforeEach(() => {
    insertMock.data = null; insertMock.error = null
    selectMock.data = null; selectMock.error = null
    updateMock.data = null; updateMock.error = null
    deleteMock.data = null; deleteMock.error = null
    insertMock.calls = {}; selectMock.calls = {}; updateMock.calls = {}; deleteMock.calls = {}
    insertMock.calls.eq = undefined; insertMock.calls.is = undefined; insertMock.calls.gt = undefined; insertMock.calls.not = undefined
    selectMock.calls.eq = undefined; selectMock.calls.is = undefined; selectMock.calls.gt = undefined; selectMock.calls.not = undefined; selectMock.calls.order = undefined
    updateMock.calls.eq = undefined; updateMock.calls.is = undefined; updateMock.calls.gt = undefined
    deleteMock.calls.eq = undefined; deleteMock.calls.is = undefined; deleteMock.calls.gt = undefined
  })

  it('createLinkRequest stores a normalized phone and raw token', async () => {
    insertMock.data = { id: 'lr-1', target_phone: '919623023480', target_email: 'a@b.com' }
    const res = await createLinkRequest({
      initiatedFrom: 'whatsapp',
      method: 'email_magic_link',
      targetPhone: '+91 9623023480',
      targetEmail: 'a@b.com',
    })
    expect(res).toBeTruthy()
    // the returned raw token equals the token written to the row (server-set id etc. come from the mock)
    const inserted = JSON.parse(JSON.stringify(insertMock.calls.insert![0]))
    expect(res!.token).toBe(inserted.token)
    expect(inserted.token.length).toBe(32)
    expect(inserted.target_phone).toBe('919623023480')
    expect(inserted.initiated_from).toBe('whatsapp')
    expect(inserted.method).toBe('email_magic_link')
  })

  it('consumeLinkRequestByToken issues an atomic single-use UPDATE with a validity filter', async () => {
    updateMock.data = { id: 'lr-1', token: 'tkn', confirmed_at: new Date().toISOString() }
    const res = await consumeLinkRequestByToken('tkn')
    expect(res).toBeTruthy()
    expect(res!.confirmed_at).toBeTruthy()
    const eqs = updateMock.calls.eq as unknown as Array<[string, unknown]>
    expect(eqs.find(([c]) => c === 'token')).toEqual(['token', 'tkn'])
    // the WHERE clause also guards confirmed_at IS NULL and expires_at > now
    const iss = updateMock.calls.is as unknown as Array<[string, unknown]>
    expect(iss.find(([c]) => c === 'confirmed_at')).toEqual(['confirmed_at', null])
    expect(updateMock.calls.gt).toBeTruthy()
  })

  it('consumeLinkRequestByToken returns null when already consumed/expired', async () => {
    updateMock.data = null
    const res = await consumeLinkRequestByToken('tkn')
    expect(res).toBeNull()
  })

  it('verifyOtpForPhone accepts a matching code and confirms the request', async () => {
    selectMock.data = {
      id: 'lr-1', target_phone: '919623023480', method: 'whatsapp_otp',
      otp_code_hash: hashOtp('000000'), confirmed_at: null,
    }
    updateMock.data = { id: 'lr-1', confirmed_at: new Date().toISOString() }
    const ok = await verifyOtpForPhone('919623023480', '000000')
    expect(ok).toBeTruthy()
  })

  it('verifyOtpForPhone rejects a wrong code (no confirm written)', async () => {
    selectMock.data = {
      id: 'lr-1', target_phone: '919623023480', method: 'whatsapp_otp',
      otp_code_hash: hashOtp('111111'), confirmed_at: null,
    }
    const ok = await verifyOtpForPhone('919623023480', '000000')
    expect(ok).toBeNull()
    // no UPDATE should have been issued for a code mismatch
    expect(updateMock.calls.update).toBeUndefined()
  })

  it('getPendingRequestByPhone returns the newest pending row', async () => {
    selectMock.data = { id: 'lr-1', target_phone: '919623023480', confirmed_at: null }
    const res = await getPendingRequestByPhone('919623023480')
    expect(res?.id).toBe('lr-1')
  })

  it('getLinkRequestByToken reads a pending row without consuming it', async () => {
    selectMock.data = { id: 'lr-1', token: 'tkn', target_phone: '919623023480', confirmed_at: null }
    const res = await getLinkRequestByToken('tkn')
    expect(res?.id).toBe('lr-1')
    const eqs = selectMock.calls.eq as unknown as Array<[string, unknown]>
    expect(eqs.find(([c]) => c === 'token')).toEqual(['token', 'tkn'])
    // read-only: no UPDATE is ever issued
    expect(selectMock.calls.select).toBeTruthy()
    expect(updateMock.calls.update).toBeUndefined()
  })

  it('getLinkRequestByToken returns null for a confirmed/expired token', async () => {
    selectMock.data = null
    const res = await getLinkRequestByToken('tkn')
    expect(res).toBeNull()
    expect(updateMock.calls.update).toBeUndefined()
  })
})
