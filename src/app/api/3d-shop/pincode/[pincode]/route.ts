import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type CachedPincode = {
  expiresAt: number
  value: {
    serviceable: boolean
    city: string
    state: string
  }
}

const pincodeCache = new Map<string, CachedPincode>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

export async function GET(_request: Request, context: { params: Promise<{ pincode: string }> }) {
  try {
    const { pincode } = await context.params
    const normalized = pincode.trim()
    if (!/^\d{6}$/.test(normalized)) {
      return NextResponse.json({ serviceable: false, city: '', state: '', error: 'Invalid pincode.' }, { status: 400 })
    }

    const cached = pincodeCache.get(normalized)
    if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.value)

    const response = await fetch(`https://api.postalpincode.in/pincode/${normalized}`, {
      next: { revalidate: 86400 },
    })
    const payload = await response.json() as Array<{
      Status?: string
      PostOffice?: Array<{ District?: string; State?: string; Name?: string }>
    }>
    const first = payload?.[0]?.PostOffice?.[0]
    const value = {
      serviceable: Boolean(first),
      city: first?.District || first?.Name || '',
      state: first?.State || '',
    }

    pincodeCache.set(normalized, { expiresAt: Date.now() + CACHE_TTL_MS, value })
    return NextResponse.json(value)
  } catch {
    return NextResponse.json({ serviceable: false, city: '', state: '', error: 'Could not verify pincode.' }, { status: 500 })
  }
}
