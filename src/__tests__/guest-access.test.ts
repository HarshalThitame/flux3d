import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression tests for guest order access tokens.
 *
 * Guards the hash chain end-to-end: generate -> hash ONCE (API route) ->
 * store verbatim (place-order) -> verify by re-hashing the raw token
 * (guest-access). A past bug double-hashed at store time, which made every
 * guest tracking link 404 — these tests fail loudly if the chain drifts again.
 */
const fakeOrderRow = { data: null as Record<string, unknown> | null, error: null }

vi.mock('@/lib/admin/server', () => ({
  createAdminSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: fakeOrderRow.data, error: fakeOrderRow.error }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ error: null }),
      }),
    }),
  }),
}))

import {
  ensureFreshGuestTrackingToken,
  generateGuestAccessToken,
  hashGuestAccessToken,
  safeHashEqual,
  verifyGuestOrderAccess,
} from '@/lib/shop/guest-access'

describe('guest access tokens', () => {
  beforeEach(() => {
    fakeOrderRow.data = null
  })

  it('raw tokens have high entropy and unique', () => {
    const a = generateGuestAccessToken()
    const b = generateGuestAccessToken()
    expect(a).not.toEqual(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('hash chain round-trip: hash(raw) matches when verified against single-hashed storage', () => {
    const raw = generateGuestAccessToken()
    // What the API route produces and place-order must store VERBATIM:
    const storedHash = hashGuestAccessToken(raw)
    // What verification recomputes:
    expect(safeHashEqual(hashGuestAccessToken(raw), storedHash)).toBe(true)
    // The old double-hash bug: hash(stored) must NOT equal what verify computes.
    expect(safeHashEqual(hashGuestAccessToken(storedHash), storedHash)).toBe(false)
  })

  it('safeHashEqual is false for different or malformed input', () => {
    expect(safeHashEqual('aa', 'bb')).toBe(false)
    expect(safeHashEqual('', '')).toBe(false)
  })

  describe('verifyGuestOrderAccess', () => {
    it('grants access for a guest order whose stored hash matches hash(rawToken)', async () => {
      const raw = generateGuestAccessToken()
      fakeOrderRow.data = { id: 'order-1', user_id: null, guest_access_token_hash: hashGuestAccessToken(raw) }
      const access = await verifyGuestOrderAccess('order-1', raw)
      expect(access).toEqual({ orderId: 'order-1', isGuest: true })
    })

    it('denies access when the stored value is a DOUBLE hash (regression)', async () => {
      const raw = generateGuestAccessToken()
      fakeOrderRow.data = {
        id: 'order-1',
        user_id: null,
        guest_access_token_hash: hashGuestAccessToken(hashGuestAccessToken(raw)),
      }
      expect(await verifyGuestOrderAccess('order-1', raw)).toBeNull()
    })

    it('denies access for wrong token', async () => {
      fakeOrderRow.data = {
        id: 'order-1',
        user_id: null,
        guest_access_token_hash: hashGuestAccessToken(generateGuestAccessToken()),
      }
      expect(await verifyGuestOrderAccess('order-1', generateGuestAccessToken())).toBeNull()
    })

    it('denies access to logged-in orders even with a matching-looking row', async () => {
      const raw = generateGuestAccessToken()
      fakeOrderRow.data = {
        id: 'order-1',
        user_id: 'some-user',
        guest_access_token_hash: hashGuestAccessToken(raw),
      }
      expect(await verifyGuestOrderAccess('order-1', raw)).toBeNull()
    })

    it('denies access for unknown orders or empty inputs', async () => {
      fakeOrderRow.data = null
      expect(await verifyGuestOrderAccess('nope', generateGuestAccessToken())).toBeNull()
      expect(await verifyGuestOrderAccess('', 'token')).toBeNull()
      expect(await verifyGuestOrderAccess('order-1', '')).toBeNull()
    })
  })

  describe('ensureFreshGuestTrackingToken', () => {
    it('rotates the token for guest orders only', async () => {
      fakeOrderRow.data = { id: 'order-g', user_id: null }
      const raw = await ensureFreshGuestTrackingToken('order-g')
      expect(typeof raw === 'string' && raw.length >= 40).toBe(true)

      fakeOrderRow.data = { id: 'order-u', user_id: 'someone' }
      expect(await ensureFreshGuestTrackingToken('order-u')).toBeNull()
    })
  })
})
