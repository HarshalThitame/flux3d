import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildCsp } from '@/proxy'

const NONCE = 'dGVzdC1ub25jZQ=='

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

function directive(csp: string, name: string): string[] {
  const dir = csp.split('; ').find((d) => d.startsWith(`${name} `))
  return dir ? dir.split(' ').slice(1) : []
}

describe('buildCsp', () => {
  it('embeds the per-request nonce in script-src', () => {
    expect(directive(buildCsp(NONCE), 'script-src')).toContain(`'nonce-${NONCE}'`)
  })

  it('does not use strict-dynamic (it blocks nonce-less framework chunks)', () => {
    const csp = buildCsp(NONCE)
    expect(directive(csp, 'script-src')).not.toContain("'strict-dynamic'")
  })

  it('allows the hosts used by runtime script injectors', () => {
    const sources = directive(buildCsp(NONCE), 'script-src')
    for (const host of [
      "'self'",
      'https://checkout.razorpay.com',
      'https://api.razorpay.com',
      'https://cdn.razorpay.com',
      'https://connect.facebook.net',
      'https://www.googletagmanager.com',
    ]) {
      expect(sources).toContain(host)
    }
  })

  it('allows the Facebook Pixel beacon image and event transports', () => {
    const csp = buildCsp(NONCE)
    expect(directive(csp, 'img-src')).toContain('https://www.facebook.com')
    expect(directive(csp, 'connect-src')).toContain('https://www.facebook.com')
  })

  it('allows Google Tag Manager pixel transport beacons', () => {
    const csp = buildCsp(NONCE)
    expect(directive(csp, 'img-src')).toContain('https://www.googletagmanager.com')
    expect(directive(csp, 'script-src')).toContain('https://www.googletagmanager.com')
    expect(directive(csp, 'connect-src')).toContain('https://www.googletagmanager.com')
  })

  it('allows Google Identity Services styles and credential-status fetches', () => {
    const csp = buildCsp(NONCE)
    expect(directive(csp, 'style-src')).toContain('https://accounts.google.com')
    expect(directive(csp, 'connect-src')).toContain('https://accounts.google.com')
    expect(directive(csp, 'script-src')).toContain('https://accounts.google.com')
    expect(directive(csp, 'frame-src')).toContain('https://accounts.google.com')
  })

  it('allows the Pixel form-post and iframe transports exactly once', () => {
    const csp = buildCsp(NONCE)
    expect(directive(csp, 'form-action')).toContain('https://www.facebook.com')
    expect(directive(csp, 'frame-src')).toContain('https://www.facebook.com')
    // No duplicate directives (browsers only honour the first occurrence).
    for (const name of ['form-action', 'frame-src', 'script-src']) {
      expect(csp.split('; ').filter((d) => d.startsWith(`${name} `))).toHaveLength(1)
    }
  })

  it('includes the Meta CAPI Gateway relay hosts in connect-src', () => {
    const connectSrc = directive(buildCsp(NONCE), 'connect-src')
    expect(connectSrc).toContain(
      'https://8b-ffbbe167ddcc42afb5f860276d91024e.ecs.us-west-2.on.aws',
    )
    expect(connectSrc).toContain(
      'https://bded8a3c6ae-1-1053047382554.us-central1.run.app',
    )
  })

  it('adds unsafe-eval only in development', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(directive(buildCsp(NONCE), 'script-src')).not.toContain("'unsafe-eval'")

    vi.stubEnv('NODE_ENV', 'development')
    expect(directive(buildCsp(NONCE), 'script-src')).toContain("'unsafe-eval'")
  })

  it('allows product hero videos from Supabase Storage via media-src', () => {
    const mediaSrc = directive(buildCsp(NONCE), 'media-src')
    expect(mediaSrc).toContain("'self'")
    expect(mediaSrc).toContain('https://jqgaebdtuasenyojvbsi.supabase.co')
  })

  it('locks down object-src, base-uri and frame-ancestors', () => {
    const csp = buildCsp(NONCE)
    expect(directive(csp, 'object-src')).toEqual(["'none'"])
    expect(directive(csp, 'base-uri')).toEqual(["'self'"])
    expect(directive(csp, 'frame-ancestors')).toEqual(["'self'"])
    expect(directive(csp, 'form-action')[0]).toBe("'self'")
  })
})
