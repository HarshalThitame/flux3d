import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getSettings } from '@/lib/settings'
import { sendContactNotification } from '@/lib/email/triggers'
import { getBusinessSettings } from '@/lib/admin/business-settings'

export const dynamic = 'force-dynamic'

type ContactBody = {
  name?: unknown
  email?: unknown
  phone?: unknown
  subject?: unknown
  message?: unknown
  honey?: unknown
}

const recentSubmissions = new Map<string, number>()
const RATE_LIMIT_WINDOW_MS = 60_000

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function cleanupRateLimit() {
  const cutoff = Date.now() - RATE_LIMIT_WINDOW_MS
  for (const [key, timestamp] of recentSubmissions.entries()) {
    if (timestamp < cutoff) recentSubmissions.delete(key)
  }
}

export async function POST(request: Request) {
  cleanupRateLimit()

  const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const clientKey = forwardedFor.split(',')[0]?.trim() || 'unknown'
  const existing = recentSubmissions.get(clientKey)
  if (existing && Date.now() - existing < RATE_LIMIT_WINDOW_MS) {
    return NextResponse.json({ error: 'Please wait a moment before sending another message.' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as ContactBody
    const name = text(body.name)
    const email = text(body.email)
    const phone = text(body.phone)
    const subject = text(body.subject)
    const message = text(body.message)
    const honey = text(body.honey)

    if (honey) {
      return NextResponse.json({ error: 'Submission rejected.' }, { status: 400 })
    }

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    if (!subject || subject.length < 3) {
      return NextResponse.json({ error: 'Please enter a subject.' }, { status: 400 })
    }

    if (!message || message.length < 10) {
      return NextResponse.json({ error: 'Please enter a message with at least 10 characters.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const ticketId = `CT-${Date.now().toString(36).toUpperCase()}`
    const { error } = await supabase.from('support_tickets').insert({
      ticket_id: ticketId,
      customer: name,
      customer_email: email,
      customer_phone: phone || null,
      subject,
      category: 'General',
      priority: 'Normal',
      status: 'Open',
      assigned_to: null,
      description: message,
      last_updated: new Date().toISOString(),
    })

    if (error) {
      return NextResponse.json(
        { error: error.message || 'We could not save your message right now. Please email us directly.' },
        { status: 503 }
      )
    }

    recentSubmissions.set(clientKey, Date.now())

    // Send email notification via Resend
    const settings = await getBusinessSettings().catch(() => null)
    const supportEmail = settings?.supportEmail || settings?.primaryEmail || 'support@flux3d.in'
    sendContactNotification(supportEmail, name, email, phone, message).catch((err) => {
      console.error('[contact] Failed to send notification email:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Your message was received. We will review it and respond through the contact details provided.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'We could not send your message right now.' },
      { status: 400 }
    )
  }
}
