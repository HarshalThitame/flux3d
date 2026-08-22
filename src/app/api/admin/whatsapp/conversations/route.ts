import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

type MetaRow = {
  sender: string
  tags: string[] | null
  is_archived: boolean | null
}

async function safeMeta(supabase: ReturnType<typeof createAdminSupabaseClient>): Promise<MetaRow[]> {
  try {
    const { data, error } = await supabase
      .from('whatsapp_conversation_meta')
      .select('sender, tags, is_archived')
    if (error) throw error
    return (data ?? []) as MetaRow[]
  } catch {
    // Optional table — degrade gracefully so the inbox still loads messages.
    return []
  }
}

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()

    const metaRows = await safeMeta(supabase)
    const metaMap = new Map<string, { tags: string[]; is_archived: boolean }>()
    for (const m of metaRows) {
      metaMap.set(m.sender, {
        tags: m.tags || [],
        is_archived: m.is_archived || false,
      })
    }

    const { data: conversations, error } = await supabase
      .from('whatsapp_messages')
      .select('sender, created_at, message_text, direction, automated, responded, media_type, media_filename')
      .not('sender', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw new Error(error.message)

    const now = new Date().getTime()
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

    const grouped = new Map<string, {
      sender: string
      lastMessage: string
      lastTimestamp: string
      lastDirection: string
      lastAutomated: boolean
      lastCustomerMessageAt: string | null
      unread: number
      hasMedia: boolean
      mediaType: string | null
      tags: string[]
      isArchived: boolean
      windowActive: boolean
      remainingWindowMinutes: number
    }>()

    for (const msg of (conversations ?? [])) {
      const s = msg.sender!
      const meta = metaMap.get(s)

      if (!grouped.has(s)) {
        grouped.set(s, {
          sender: s,
          lastMessage: msg.media_type ? `[${msg.media_type.toUpperCase()}] ${msg.media_filename || msg.message_text}` : (msg.message_text?.slice(0, 100) ?? ''),
          lastTimestamp: msg.created_at ?? '',
          lastDirection: msg.direction,
          lastAutomated: msg.automated ?? false,
          lastCustomerMessageAt: msg.direction === 'incoming' ? msg.created_at : null,
          unread: 0,
          hasMedia: !!msg.media_type,
          mediaType: msg.media_type || null,
          tags: meta?.tags || [],
          isArchived: meta?.is_archived || false,
          windowActive: false,
          remainingWindowMinutes: 0,
        })
      }

      const entry = grouped.get(s)!

      // Update last customer message timestamp if more recent
      if (msg.direction === 'incoming' && !entry.lastCustomerMessageAt) {
        entry.lastCustomerMessageAt = msg.created_at
      }

      if (msg.direction === 'incoming' && !msg.automated && !msg.responded) {
        entry.unread += 1
      }
    }

    // Calculate 24h window for each conversation
    for (const entry of grouped.values()) {
      if (entry.lastCustomerMessageAt) {
        const lastTime = new Date(entry.lastCustomerMessageAt).getTime()
        const diff = now - lastTime
        if (diff < TWENTY_FOUR_HOURS_MS) {
          entry.windowActive = true
          entry.remainingWindowMinutes = Math.floor((TWENTY_FOUR_HOURS_MS - diff) / 60000)
        }
      }
    }

    // Look up profiles & shop orders counts for sender phone numbers
    const phones = Array.from(grouped.keys())
    const { data: profiles } = await supabase
      .from('profiles')
      .select('phone_number, full_name, email')
      .in('phone_number', phones)

    const profileMap = new Map<string, { name: string; email: string | null }>()
    for (const p of (profiles ?? [])) {
      if (p.phone_number) {
        profileMap.set(p.phone_number, { name: p.full_name || p.phone_number, email: p.email || null })
      }
    }

    const result = Array.from(grouped.values())
      .sort((a, b) => b.lastTimestamp.localeCompare(a.lastTimestamp))
      .map((conv) => ({
        ...conv,
        contactName: profileMap.get(conv.sender)?.name ?? null,
        contactEmail: profileMap.get(conv.sender)?.email ?? null,
      }))

    return NextResponse.json({ conversations: result })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
