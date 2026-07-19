import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import {
  buildStoragePath,
  getExtension,
  validateModelFile,
} from '@/lib/storage/validate'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = authData.user.id

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'quote_upload',
    windowSeconds: 60,
    maxRequests: 10,
    userId,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many upload attempts. Please try again later.' }, { status: 429 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const quoteId = (formData.get('quoteId') as string) ?? ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (!quoteId.trim()) {
      return NextResponse.json({ error: 'Quote ID is required.' }, { status: 400 })
    }

    const validation = await validateModelFile(file)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const extension = getExtension(file.name)
    const objectPath = buildStoragePath(userId, quoteId, file.name)
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'
    const adminSupabase = createAdminSupabaseClient()

    const arrayBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from(bucket)
      .upload(objectPath, new Uint8Array(arrayBuffer), {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Storage upload failed: ${uploadError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      path: uploadData.path,
      extension,
      size: file.size,
    })
  } catch (error) {
    console.error('[quote/upload] Upload failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed.' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const path = searchParams.get('path')?.trim() ?? ''

  if (!path) {
    return NextResponse.json({ error: 'Path is required.' }, { status: 400 })
  }

  if (!path.startsWith(`${authData.user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'
  const adminSupabase = createAdminSupabaseClient()
  const { data, error } = await adminSupabase.storage.from(bucket).createSignedUrl(path, 60 * 60)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ signedUrl: data.signedUrl })
}
