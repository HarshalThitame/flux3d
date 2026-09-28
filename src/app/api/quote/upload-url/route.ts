import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getExtension, safeFileName } from '@/lib/storage/validate'
import { rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'

const ALLOWED_EXTENSIONS = new Set([
  'stl', 'obj', '3mf', 'step', 'stp', 'iges', 'igs', 'brep',
  'glb', 'gltf', 'fbx', 'ply', 'dae', 'amf', 'wrl', 'vrml', 'dxf', 'dwg',
])
const MAX_FILE_SIZE = 100 * 1024 * 1024
const uploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().min(1).max(MAX_FILE_SIZE),
  quoteId: z.string().regex(/^F3D-[A-F0-9]{8}$/),
})

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
    const parsed = uploadRequestSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 })
    }
    const { fileName, quoteId } = parsed.data

    const extension = getExtension(fileName)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: `Unsupported format ".${extension}".` }, { status: 400 })
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
