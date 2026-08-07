import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { generateShopCopy, type AiGenerateInput } from '@/lib/shop/ai'

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as AiGenerateInput
    if (!body.kind) return NextResponse.json({ error: 'Missing generation kind.' }, { status: 400 })

    const result = await generateShopCopy(body)
    return NextResponse.json({ result })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
