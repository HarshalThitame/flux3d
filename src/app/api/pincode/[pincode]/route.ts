import { NextResponse } from 'next/server'
import type { PincodeLookupResult } from '@/lib/pincode'

type IndiaPostOffice = {
  District?: string
  State?: string
}

type IndiaPostResponse = {
  Status?: string
  PostOffice?: IndiaPostOffice[] | null
}

const PINCODE_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pincode: string }> }
) {
  const { pincode } = await params

  if (!/^\d{6}$/.test(pincode)) {
    return NextResponse.json({ error: 'Invalid pincode.' }, { status: 400 })
  }

  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
    next: { revalidate: 86400 },
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Pincode lookup failed.' }, { status: 502 })
  }

  const payload = (await response.json()) as IndiaPostResponse[]
  const firstResult = payload[0]
  const postOffice = firstResult?.PostOffice?.[0]

  if (firstResult?.Status !== 'Success' || !postOffice?.District || !postOffice.State) {
    return NextResponse.json({ error: 'No city/state found for this pincode.' }, { status: 404 })
  }

  const result: PincodeLookupResult = {
    city: postOffice.District,
    state: postOffice.State,
  }

  return NextResponse.json(result, { headers: PINCODE_CACHE_HEADERS })
}
