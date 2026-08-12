import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getExtension, safeFileName } from '@/lib/storage/validate'
import { rateLimitResponse } from '@/lib/rate-limit'

const ALLOWED_EXTENSIONS = new Set([
  'stl', 'obj', '3mf', 'step', 'iges', 'igs', 'brep',
  'glb', 'gltf', 'fbx', 'ply', 'dae', 'amf', 'vrl', 'dxf', 'dwg',
])
const MAX_FILE_SIZE = 100 * 1024 * 1024

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
    prefix: 'quote_upload_url',
    windowSeconds: 60,
    maxRequests: 20,
    userId,
  })

  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { fileName, fileSize, quoteId } = body

    if (!fileName || !quoteId) {
      return NextResponse.json({ error: 'Missing required fields: fileName, quoteId' }, { status: 400 })
    }

    const extension = getExtension(fileName)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: `Unsupported format ".${extension}".` }, { status: 400 })
    }

    if (typeof fileSize === 'number' && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File is too large. Maximum allowed size is 100MB.' }, { status: 400 })
    }

    const safeName = safeFileName(fileName)
    const objectPath = `${userId}/${quoteId}/${safeName}`
    const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'
    const adminSupabase = createAdminSupabaseClient()

    const { data: uploadUrlData, error: uploadUrlError } = await adminSupabase.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath)

    if (uploadUrlError) {
      return NextResponse.json({ error: `Failed to create upload URL: ${uploadUrlError.message}` }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: uploadUrlData.signedUrl,
      path: uploadUrlData.path,
      extension,
    })
  } catch (error) {
    console.error('[quote/upload-url] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create upload URL.' },
      { status: 500 }
    )
  }
}
