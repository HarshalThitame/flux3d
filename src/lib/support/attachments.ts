// ============================================================================
// Support Attachment Utilities
// ============================================================================
// Handles uploading and downloading support ticket attachments to/from
// Supabase Storage in the 'ticket-attachments' bucket.
//
// Structure:
//   ticket-attachments/
//     {ticket_number}/
//       {filename}
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'ticket-attachments'

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\]/g, '_').trim()
}

function guessContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'application/pdf'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    case 'svg':
      return 'image/svg+xml'
    case 'txt':
      return 'text/plain'
    case 'csv':
      return 'text/csv'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Upload a support attachment to the ticket-attachments bucket.
 */
export async function uploadSupportAttachment(
  buffer: Buffer,
  filename: string,
  ticketNumber: string,
  contentType?: string
): Promise<{ path: string; url: string }> {
  const supabase = createAdminClient()
  const safeName = sanitizeFilename(filename)
  if (!safeName) throw new Error('Invalid filename')

  const storagePath = `${ticketNumber}/${Date.now()}_${safeName}`

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      upsert: true,
      contentType: contentType || guessContentType(safeName),
    })

  if (error) {
    console.error('[support-attachments] Upload error:', error.message)
    throw new Error(error.message)
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return { path: data.path, url: urlData.publicUrl }
}

/**
 * Download attachment bytes from a URL (e.g. Resend attachment URL).
 */
export async function downloadAttachmentBytes(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      console.warn('[support-attachments] Download failed:', response.status, url)
      return null
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    console.warn('[support-attachments] Download error:', err)
    return null
  }
}

/**
 * Get a signed download URL for an attachment path.
 */
export async function getSupportAttachmentUrl(path: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60) // 1 hour
  if (error || !data) {
    console.warn('[support-attachments] Signed URL error:', error?.message)
    return null
  }
  return data.signedUrl
}
