import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    // Get distinct senders with their latest message and unread count
    const { data: conversations, error } = await supabase
      .from('whatsapp_messages')
      .select('sender, created_at, message_text, direction, automated, responded')
      .not('sender', 'is', null)
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    // Group by sender
    const grouped = new Map<string, {
      sender: string
      lastMessage: string
      lastTimestamp: string
      lastDirection: string
      lastAutomated: boolean
      unread: number
    }>()

    for (const msg of (conversations ?? [])) {
      const s = msg.sender!
      if (!grouped.has(s)) {
        grouped.set(s, {
          sender: s,
          lastMessage: msg.message_text?.slice(0, 100) ?? '',
          lastTimestamp: msg.created_at ?? '',
          lastDirection: msg.direction,
          lastAutomated: msg.automated ?? false,
          unread: 0,
        })
      }
      // Count incoming messages that haven't been replied to manually
      if (msg.direction === 'incoming' && !msg.automated && !msg.responded) {
        const entry = grouped.get(s)!
        entry.unread += 1
      }
    }

    // Look up profiles for sender phone numbers
    const phones = Array.from(grouped.keys())
    const { data: profiles } = await supabase
      .from('profiles')
      .select('phone_number, full_name')
      .in('phone_number', phones)

    const profileMap = new Map<string, string>()
    for (const p of (profiles ?? [])) {
      if (p.phone_number && p.full_name) {
        profileMap.set(p.phone_number, p.full_name)
      }
    }

    const result = Array.from(grouped.values())
      .sort((a, b) => b.lastTimestamp.localeCompare(a.lastTimestamp))
      .map((conv) => ({
        ...conv,
        contactName: profileMap.get(conv.sender) ?? null,
      }))

    return NextResponse.json({ conversations: result })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
