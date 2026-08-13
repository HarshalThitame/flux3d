import { createClient } from '@supabase/supabase-js'

const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION?.trim() || 'v22.0'
export const WHATSAPP_MEDIA_BUCKET = 'whatsapp-media'
export const WHATSAPP_MEDIA_MAX_BYTES = 10 * 1024 * 1024
export const WHATSAPP_MEDIA_ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'audio/ogg',
  'audio/mpeg',
  'video/mp4',
  'application/octet-stream',
  'model/stl',
  'model/3mf',
  'model/obj',
]

const META_FETCH_TIMEOUT_MS = 15_000

async function fetchWithTimeout(url: string | URL, init: RequestInit = {}, timeoutMs = META_FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export type MediaResult = {
  url: string | null
  filename: string
  mimeType: string
  sizeBytes: number
  mediaType: 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'stl'
}

/**
 * Downloads media from Meta Graph API and uploads to Supabase Storage.
 */
export async function downloadAndStoreWhatsAppMedia(mediaId: string, mimeTypeHint?: string, filenameHint?: string): Promise<MediaResult | null> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!accessToken || !mediaId) return null

  try {
    // Step 1: Query Meta to get media download URL
    const metaRes = await fetchWithTimeout(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!metaRes.ok) {
      console.error('[whatsapp-media] Failed to fetch media metadata:', await metaRes.text())
      return null
    }

    const metaData = (await metaRes.json()) as { url?: string; mime_type?: string; file_size?: number }
    if (!metaData.url) return null

    const mimeType = metaData.mime_type || mimeTypeHint || 'application/octet-stream'
    const sizeBytes = metaData.file_size || 0

    // Step 2: Download binary content from Meta URL
    const binaryRes = await fetchWithTimeout(metaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!binaryRes.ok) {
      console.error('[whatsapp-media] Failed to download binary media content:', binaryRes.status)
      return null
    }

    const buffer = Buffer.from(await binaryRes.arrayBuffer())

    // Determine extension and filename
    let ext = mimeType.split('/')[1]?.split(';')[0] || 'bin'
    const filename = filenameHint || `media_${mediaId}.${ext}`

    if (filename.toLowerCase().endsWith('.stl') || filename.toLowerCase().endsWith('.3mf') || filename.toLowerCase().endsWith('.obj')) {
      ext = filename.split('.').pop() || ext
    }

    let mediaType: MediaResult['mediaType'] = 'document'
    if (mimeType.startsWith('image/')) mediaType = 'image'
    else if (mimeType.startsWith('audio/')) mediaType = 'audio'
    else if (mimeType.startsWith('video/')) mediaType = 'video'
    else if (filename.toLowerCase().endsWith('.stl') || filename.toLowerCase().endsWith('.3mf') || filename.toLowerCase().endsWith('.obj')) {
      mediaType = 'stl'
    }

    // Step 3: Save file to Supabase Storage
    const supabase = getServiceClient()
    if (!supabase) return null

    // Ensure bucket exists
    const storagePath = `inbound/${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error: uploadErr } = await supabase.storage.from(WHATSAPP_MEDIA_BUCKET).upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    })

    if (uploadErr) {
      console.error('[whatsapp-media] Supabase storage upload failed:', uploadErr)
      return null
    }

    const { data: publicUrlData } = supabase.storage.from(WHATSAPP_MEDIA_BUCKET).getPublicUrl(storagePath)

    return {
      url: publicUrlData.publicUrl,
      filename,
      mimeType,
      sizeBytes: buffer.length || sizeBytes,
      mediaType,
    }
  } catch (err) {
    console.error('[whatsapp-media] Error processing media:', err)
    return null
  }
}

/**
 * Sends outgoing media message to WhatsApp customer using Meta API.
 */
export async function sendWhatsAppMediaMessage(
  to: string,
  mediaUrl: string,
  mediaType: 'image' | 'document' | 'audio' | 'video',
  filename?: string,
  caption?: string
) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) {
    throw new Error('Missing WhatsApp API configuration.')
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`

  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: mediaType,
  }

  const mediaObj: Record<string, unknown> = { link: mediaUrl }
  if (caption) mediaObj.caption = caption
  if (filename && mediaType === 'document') mediaObj.filename = filename

  payload[mediaType] = mediaObj

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errorText = await res.text().catch(() => 'Unknown error')
    throw new Error(`WhatsApp send media failed: ${res.status} ${errorText.slice(0, 300)}`)
  }

  return (await res.json()) as { messages?: Array<{ id: string }> }
}
