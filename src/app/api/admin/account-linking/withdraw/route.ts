import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withdrawConsent, canonicalPhone } from '@/lib/account-linking/consent'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  try {
    const body = await request.json()
    const phoneRaw = (body.phone as string | undefined)?.trim()

    if (!phoneRaw) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 })
    }

    const phone = canonicalPhone(phoneRaw)
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
    }

    // Append-only DPDP evidence: granted=false + withdrawn_at (one row per type).
    await withdrawConsent(phone, 'whatsapp_messaging')
    await withdrawConsent(phone, 'account_linking')

    // Per plan §7: withdrawal => opt-out of WhatsApp messages; no OTPs are
    // ever sent without re-opt-in. The phone stays attributed to the account,
    // but it is no longer a verified, messageable WhatsApp channel.
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .or(`phone_canonical.eq.${phone},phone_number.eq.${phone}`)

    if (profileError) {
      console.error('[admin] Withdraw profile lookup failed:', profileError.message)
      return NextResponse.json({ error: 'Failed to find accounts for this phone' }, { status: 500 })
    }

    for (const profile of profiles ?? []) {
      await supabase
        .from('profiles')
        .update({
          whatsapp_opt_in: false,
          whatsapp_opt_in_at: null,
          phone_verified: false,
        })
        .eq('id', profile.id)
    }

    await supabase.from('admin_audit_logs').insert({
      admin_id: null,
      action: 'withdraw_consent',
      target_type: 'link_request',
      target_id: null,
      new_value: {
        phone,
        consent_types: ['whatsapp_messaging', 'account_linking'],
        profile_ids: (profiles ?? []).map((p) => p.id),
        performed_at: new Date().toISOString(),
      },
    })

    return NextResponse.json({ success: true, phone })
  } catch (error) {
    console.error('[admin] Withdraw consent error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Withdraw failed' }, { status: 500 })
  }
}
