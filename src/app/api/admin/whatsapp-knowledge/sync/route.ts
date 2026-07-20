import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { requireAdminRequest } from '@/lib/admin/request'
import { getWhatsappKnowledgeSeed, syncWhatsAppKnowledgeChunks } from '@/lib/whatsapp-rag'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    await syncWhatsAppKnowledgeChunks()
    const seedCount = getWhatsappKnowledgeSeed().length

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'sync_whatsapp_knowledge',
      target_type: 'whatsapp_knowledge',
      target_id: 'seed-sync',
      old_value: null,
      new_value: { seedCount },
    })

    return NextResponse.json({ success: true, seedCount })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
