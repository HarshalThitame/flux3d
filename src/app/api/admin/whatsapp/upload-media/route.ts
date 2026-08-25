import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { WHATSAPP_MEDIA_BUCKET, WHATSAPP_MEDIA_MAX_BYTES, WHATSAPP_MEDIA_ALLOWED_MIME } from '@/lib/whatsapp/media'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded.' }, { status: 400 })
    }

    if (file.size > WHATSAPP_MEDIA_MAX_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum allowed is ${Math.floor(WHATSAPP_MEDIA_MAX_BYTES / 1024 / 1024)}MB.` },
        { status: 400 }
      )
    }

    const filename = file.name || 'uploaded_file'
    let mimeType = file.type || 'application/octet-stream'
    if (!WHATSAPP_MEDIA_ALLOWED_MIME.includes(mimeType)) {
      mimeType = 'application/octet-stream'
    }
    const sizeBytes = file.size
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let mediaType: 'image' | 'document' | 'audio' | 'video' = 'document'
    if (mimeType.startsWith('image/')) mediaType = 'image'
    else if (mimeType.startsWith('audio/')) mediaType = 'audio'
    else if (mimeType.startsWith('video/')) mediaType = 'video'

    const supabase = createAdminSupabaseClient()
    const storagePath = `outbound/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`

    const { error: uploadErr } = await supabase.storage
      .from(WHATSAPP_MEDIA_BUCKET)
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (uploadErr) {
      throw new Error(`Failed to upload media to storage: ${uploadErr.message}`)
    }

    // The bucket is private, so there is no public URL. Meta needs a fetchable
    // link to deliver the media: mint the maximum-length signed URL (7 days).
    // The reply endpoint stores the bare storage path in the DB and the inbox
    // re-signs at read time.
    const { data: signedData, error: signErr } = await supabase.storage
      .from(WHATSAPP_MEDIA_BUCKET)
      .createSignedUrl(storagePath, 604800)

    if (signErr || !signedData?.signedUrl) {
      throw new Error(`Failed to sign media URL: ${signErr?.message ?? 'unknown error'}`)
    }

    return NextResponse.json({
      success: true,
      mediaUrl: signedData.signedUrl,
      storagePath,
      mediaType,
      mediaFilename: filename,
      mediaMimeType: mimeType,
      mediaSizeBytes: sizeBytes,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
