import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeSiteUrl } from '@/lib/site'

const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv
  vi.unstubAllEnvs()
})

describe('site url resolver', () => {
  it('rejects localhost values in production', () => {
    process.env.NODE_ENV = 'production'

    expect(normalizeSiteUrl('http://localhost:3000')).toBe('https://flux3d.in')
    expect(normalizeSiteUrl('localhost:3000')).toBe('https://flux3d.in')
  })

  it('keeps localhost values in development', () => {
    process.env.NODE_ENV = 'development'

    expect(normalizeSiteUrl('http://localhost:3000')).toBe('http://localhost:3000')
  })
})
