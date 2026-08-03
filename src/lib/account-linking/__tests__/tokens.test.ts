import { describe, expect, it } from 'vitest'
import {
  generateToken,
  generateOtp,
  hashOtp,
  canonicalPhone,
  phoneMatchKey,
  safeEqual,
} from '@/lib/account-linking/tokens'

describe('tokens', () => {
  it('generates a token with high entropy', () => {
    const t = generateToken()
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(generateToken()).not.toBe(t)
  })

  it('token hashes are deterministic and do not expose the raw token', () => {
    const t = generateToken()
    expect(hashOtp(t)).toHaveLength(64) // sha256 hex
    expect(hashOtp(t)).toBe(hashOtp(t))
    expect(hashOtp(t)).not.toBe(t)
  })

  it('generates a 6-digit OTP', () => {
    const code = generateOtp()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('hashes OTPs consistently and without the raw code', () => {
    expect(hashOtp('123456')).toHaveLength(64)
    expect(hashOtp('123456')).toBe(hashOtp('123456'))
    expect(hashOtp('123456')).not.toBe('123456')
    expect(hashOtp('123456')).not.toBe(hashOtp('654321'))
  })

  it('canonicalizes phones to digits-only', () => {
    expect(canonicalPhone('+91 96 23 023 480')).toBe('919623023480')
    expect(canonicalPhone('91-96230-23480')).toBe('919623023480')
    expect(canonicalPhone('9623023480')).toBe('9623023480')
    expect(canonicalPhone('')).toBe('')
    expect(canonicalPhone('abc')).toBe('')
  })

  it('matches phones on the last 10 digits (wa_id vs 10-digit address)', () => {
    // WhatsApp wa_id (12 digits w/ 91) should match a 10-digit shipping phone.
    expect(phoneMatchKey('919623023480')).toBe('9623023480')
    expect(phoneMatchKey('+91 9623023480')).toBe('9623023480')
    expect(phoneMatchKey('9623023480')).toBe('9623023480')
  })

  it('compares digests in constant time and rejects mismatches', () => {
    const h = hashOtp(generateToken())
    expect(safeEqual(h, h)).toBe(true)
    expect(safeEqual(h, 'x')).toBe(false)
    expect(safeEqual('a', 'abc')).toBe(false)
  })
})
