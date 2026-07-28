import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { deleteEmailAttachment } from '@/lib/email/attachments'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * DELETE /api/admin/email-attachments/[filename]
 *
 * Removes a file from the email-attachments bucket.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { filename } = await params
    await deleteEmailAttachment(decodeURIComponent(filename))
    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
