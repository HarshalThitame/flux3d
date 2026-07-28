import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { listEmailAttachments, uploadEmailAttachment } from '@/lib/email/attachments'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/email-attachments
 *
 * Returns a list of files in the email-attachments bucket.
 */
export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const files = await listEmailAttachments()
    return NextResponse.json({ data: files })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

/**
 * POST /api/admin/email-attachments
 *
 * Uploads a new file. Accepts multipart/form-data.
 * Body: { file: File }
 */
export async function POST(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    // Validate size (10 MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 400 })
    }

    // Validate MIME type
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, JPEG, PNG, WEBP' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const result = await uploadEmailAttachment(buffer, file.name)

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
