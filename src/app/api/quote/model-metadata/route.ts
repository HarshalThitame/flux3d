import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { normalizeOwnedStoragePath } from '@/lib/quote/storage-path'
import { rateLimitResponse } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_FILE_SIZE = 100 * 1024 * 1024
const BUCKET = 'quote-models'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = authData.user.id

  const rateLimit = await rateLimitResponse(request, {
    prefix: 'quote_model_metadata',
    windowSeconds: 60,
    maxRequests: 30,
    userId,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { fileUrl, volumeMm3, dimensionsMm, triangleCount, fileName, fileSize, extension } = body

    if (!fileUrl || !volumeMm3) {
      return NextResponse.json({ error: 'Missing required fields: fileUrl, volumeMm3' }, { status: 400 })
    }

    const safePath = normalizeOwnedStoragePath(fileUrl, userId)
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? BUCKET
    const adminSupabase = createAdminSupabaseClient()

    const { data: fileInfo, error: infoError } = await adminSupabase.storage
      .from(bucket)
      .info(safePath)

    if (infoError) {
      return NextResponse.json({ error: 'Uploaded file not found in storage.' }, { status: 400 })
    }

    if (fileInfo && Number(fileInfo.metadata?.size ?? fileSize ?? 0) > MAX_FILE_SIZE) {
      await adminSupabase.storage.from(bucket).remove([safePath]).catch(() => {})
      return NextResponse.json({ error: 'File exceeds the maximum allowed size of 100MB.' }, { status: 400 })
    }

    const { error: upsertError } = await adminSupabase.from('model_files').upsert(
      {
        user_id: userId,
        file_name: fileName ?? safePath.split('/').pop() ?? 'model',
        file_url: safePath,
        status: 'quoted',
        uploaded_at: new Date().toISOString(),
        model_metadata: {
          volumeMm3,
          dimensionsMm: dimensionsMm ?? { x: 0, y: 0, z: 0 },
          triangleCount: triangleCount ?? 0,
          fileSize: fileSize ?? 0,
          extension: extension ?? '',
        },
      },
      { onConflict: 'user_id,file_url', ignoreDuplicates: false }
    )

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[quote/model-metadata] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save model metadata.' },
      { status: 500 }
    )
  }
}
