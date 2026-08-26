import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

const BRANDING_BUCKET = 'branding'

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'])
const MAX_FILE_SIZE = 2 * 1024 * 1024

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const field = formData.get('field') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (!field) {
      return NextResponse.json({ error: 'Field name is required.' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, SVG, and GIF files are allowed.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be under 2MB.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() ?? 'png'
    const fileName = `${field}-${Date.now()}.${ext}`
    const filePath = `business/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())

    // Favicons are fetched on every page load — downscale rasters to a small
    // PNG before storing so the DB never ends up pointing at a huge image.
    let uploadBuffer = buffer
    let contentType = file.type
    if (field === 'faviconUrl' && file.type !== 'image/svg+xml' && file.type !== 'image/gif') {
      uploadBuffer = await sharp(buffer)
        .resize(64, 64, { fit: 'inside', withoutEnlargement: true })
        .png({ compressionLevel: 9 })
        .toBuffer()
      contentType = 'image/png'
    }

    const supabase = createAdminSupabaseClient()

    const { error: uploadError } = await supabase.storage
      .from(BRANDING_BUCKET)
      .upload(filePath, uploadBuffer, {
        contentType,
        upsert: true,
        cacheControl: '31536000',
      })

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('bucket')) {
        const { error: bucketError } = await supabase.storage.createBucket(BRANDING_BUCKET, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
        })
        if (bucketError) throw new Error(`Storage setup failed: ${bucketError.message}`)

        const { error: retryError } = await supabase.storage
          .from(BRANDING_BUCKET)
          .upload(filePath, uploadBuffer, {
            contentType,
            upsert: true,
            cacheControl: '31536000',
          })
        if (retryError) throw new Error(`Upload failed: ${retryError.message}`)
      } else {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }
    }

    const { data: urlData } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(filePath)
    const publicUrl = urlData.publicUrl

    return NextResponse.json({ url: publicUrl, field })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
