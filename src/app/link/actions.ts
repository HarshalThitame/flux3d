'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getEnv } from '@/lib/env'
import { rateLimitCheck } from '@/lib/rate-limit'
import {
  consumeLinkRequestByToken,
  createLinkRequest,
  issueOtpForRequest,
  verifyOtpForPhone,
} from '@/lib/account-linking/link-requests'
import { generateOtp } from '@/lib/account-linking/tokens'
import { recordConsent } from '@/lib/account-linking/consent'
import { sendAccountLinkConfirmation } from '@/lib/email/triggers'
import { sendWhatsAppTemplate } from '@/lib/whatsapp/messages'
import { canonicalPhone } from '@/lib/account-linking/tokens'

export async function confirmLinkAction(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const token = formData.get('token')
  if (typeof token !== 'string' || !token) {
    return { error: 'Missing token.' }
  }

  const request = await consumeLinkRequestByToken(token)
  if (!request) {
    return { error: 'This link is invalid or has already been used.' }
  }

  const auth = await requireUser('/link/confirm')
  const admin = createAdminClient()
  const supabase = await createServerSupabaseClient()

  if (auth.user.id !== request.target_user_id) {
    await recordConsent({
      userId: auth.user.id,
      consentType: 'account_linking',
      granted: false,
      method: 'button_click',
      ipAddress: formData.get('ip') as string | undefined,
      details: { mismatch: true, targetUserId: request.target_user_id, visitorUserId: auth.user.id },
    })
    return { error: 'This link belongs to a different account.' }
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('phone, phone_number')
    .eq('id', auth.user.id)
    .maybeSingle()

  const currentPhone = profileRow?.phone ?? profileRow?.phone_number ?? ''
  const targetPhone = canonicalPhone(currentPhone)

  if (!targetPhone) {
    return { error: 'No WhatsApp phone number on file. Please add one in your profile first.' }
  }

  const { data: mergeResult, error: mergeError } = await admin
    .rpc('account_linking_merge_to_user', {
      p_target_user_id: auth.user.id,
      p_phone: targetPhone,
    })
    .then((r) => ({ data: r.data, error: r.error }))

  if (mergeError) {
    console.error('[account-linking] merge failed:', mergeError.message)
    return { error: 'Failed to merge orders. Please try again.' }
  }

  const ordersAttributed = (mergeResult as { orders_attributed: number } | null)?.orders_attributed ?? 0

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      phone: targetPhone,
      phone_number: targetPhone,
      phone_verified: true,
      whatsapp_opt_in: true,
      whatsapp_opt_in_at: now,
      phone_canonical: targetPhone,
    })
    .eq('id', auth.user.id)

  if (updateError) {
    console.error('[account-linking] profile update failed:', updateError.message)
  }

  await recordConsent({
    userId: auth.user.id,
    phoneNumber: targetPhone,
    consentType: 'account_linking',
    granted: true,
    method: 'button_click',
    details: { ordersAttributed, token },
  })

  await recordConsent({
    userId: auth.user.id,
    phoneNumber: targetPhone,
    consentType: 'whatsapp_messaging',
    granted: true,
    method: 'button_click',
    details: { ordersAttributed, token },
  })

  redirect('/profile?linked=whatsapp')
}

export async function linkWhatsappAction(
  formData: FormData
): Promise<{ error?: string; success?: boolean; message?: string }> {
  const auth = await requireUser('/profile')
  const supabase = await createServerSupabaseClient()

  const phoneRaw = (formData.get('phone') as string | undefined)?.trim()
  const emailRaw = (formData.get('email') as string | undefined)?.trim()
  const whatsappOptIn = formData.get('whatsapp_opt_in') === 'on'

  const email = emailRaw ?? auth.user.email ?? null

  if (!email) {
    return { error: 'An email address is required to send the confirmation link.' }
  }

  if (!phoneRaw) {
    return { error: 'Please enter your WhatsApp phone number.' }
  }

  const phone = canonicalPhone(phoneRaw)
  if (!phone) {
    return { error: 'Please enter a valid phone number.' }
  }

  const phoneRateLimit = await rateLimitCheck(`link_request:phone:${phone}`, 3600, 5)
  if (!phoneRateLimit.success) {
    return { error: 'Too many requests for this phone number. Please wait before trying again.' }
  }

  const emailRateLimit = await rateLimitCheck(`link_request:email:${email}`, 3600, 5)
  if (!emailRateLimit.success) {
    return { error: 'Too many requests for this email address. Please wait before trying again.' }
  }

  const { data: existing } = await supabase
    .from('link_requests')
    .select('id')
    .eq('target_phone', phone)
    .eq('target_user_id', auth.user.id)
    .is('confirmed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing) {
    return { error: 'A pending link request already exists for this phone number.' }
  }

  const { data: phoneOwner } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone_canonical', phone)
    .neq('id', auth.user.id)
    .maybeSingle()

  if (phoneOwner) {
    return { error: 'This WhatsApp number is already linked to a different account.' }
  }

  const env = getEnv()
  const useOtp = whatsappOptIn && !!env.WHATSAPP_AUTH_TEMPLATE_NAME

  if (useOtp) {
    const result = await createLinkRequest({
      initiatedFrom: 'web',
      method: 'whatsapp_otp',
      targetPhone: phone,
      targetEmail: email,
      targetUserId: auth.user.id,
    })

    if (!result) {
      return { error: 'Failed to create a link request. Please try again.' }
    }

    const otpCode = generateOtp()
    const otpIssued = await issueOtpForRequest(result.linkRequest.id, otpCode)

    if (!otpIssued) {
      return { error: 'Failed to issue verification code. Please try again.' }
    }

    const templateName = env.WHATSAPP_AUTH_TEMPLATE_NAME!
    await sendWhatsAppTemplate(phone, {
      name: templateName,
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: otpCode }],
        },
      ],
    })

    if (whatsappOptIn) {
      await recordConsent({
        userId: auth.user.id,
        phoneNumber: phone,
        consentType: 'whatsapp_messaging',
        granted: true,
        method: 'checkbox_web',
        details: { source: 'profile_card', otpSent: true },
      })
    }

    return { success: true, message: `A verification code has been sent to your WhatsApp number. Please enter it below to complete the link.` }
  }

  const result = await createLinkRequest({
    initiatedFrom: 'web',
    method: 'email_magic_link',
    targetPhone: phone,
    targetEmail: email,
    targetUserId: auth.user.id,
  })

  if (!result) {
    return { error: 'Failed to create a link request. Please try again.' }
  }

  const profile = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', auth.user.id)
    .maybeSingle()

  const customerName = profile.data?.full_name ?? 'there'
  const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'}/link/confirm?token=${result.token}`

  await sendAccountLinkConfirmation(
    auth.user.id,
    email ?? '',
    customerName,
    confirmUrl,
    0
  )

  if (whatsappOptIn) {
    await recordConsent({
      userId: auth.user.id,
      phoneNumber: phone,
      consentType: 'whatsapp_messaging',
      granted: true,
      method: 'checkbox_web',
      details: { source: 'profile_card' },
    })
  }

  return { success: true, message: `A confirmation link has been sent to ${email ?? 'your email'}.` }
}

export async function verifyOtpAction(
  formData: FormData
): Promise<{ error?: string; success?: boolean; message?: string }> {
  const auth = await requireUser('/profile')
  const supabase = await createServerSupabaseClient()

  const phoneRaw = (formData.get('phone') as string | undefined)?.trim()
  const otpCode = (formData.get('otp') as string | undefined)?.trim()

  if (!phoneRaw) {
    return { error: 'Phone number is required.' }
  }

  if (!otpCode) {
    return { error: 'Please enter the verification code.' }
  }

  const phone = canonicalPhone(phoneRaw)
  if (!phone) {
    return { error: 'Invalid phone number.' }
  }

  const confirmed = await verifyOtpForPhone(phone, otpCode)

  if (!confirmed) {
    return { error: 'Invalid or expired verification code. Please try again.' }
  }

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('phone, phone_number')
    .eq('id', auth.user.id)
    .maybeSingle()

  const currentPhone = profileRow?.phone ?? profileRow?.phone_number ?? ''
  const targetPhone = canonicalPhone(currentPhone)

  if (!targetPhone) {
    return { error: 'No WhatsApp phone number on file. Please add one in your profile first.' }
  }

  const admin = createAdminClient()
  const { data: mergeResult, error: mergeError } = await admin
    .rpc('account_linking_merge_to_user', {
      p_target_user_id: auth.user.id,
      p_phone: targetPhone,
    })
    .then((r) => ({ data: r.data, error: r.error }))

  if (mergeError) {
    console.error('[account-linking] merge failed:', mergeError.message)
    return { error: 'Failed to merge orders. Please try again.' }
  }

  const ordersAttributed = (mergeResult as { orders_attributed: number } | null)?.orders_attributed ?? 0

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      phone: targetPhone,
      phone_number: targetPhone,
      phone_verified: true,
      whatsapp_opt_in: true,
      whatsapp_opt_in_at: now,
      phone_canonical: targetPhone,
    })
    .eq('id', auth.user.id)

  if (updateError) {
    console.error('[account-linking] profile update failed:', updateError.message)
  }

  await recordConsent({
    userId: auth.user.id,
    phoneNumber: targetPhone,
    consentType: 'account_linking',
    granted: true,
    method: 'whatsapp_reply',
    details: { ordersAttributed, phone },
  })

  await recordConsent({
    userId: auth.user.id,
    phoneNumber: targetPhone,
    consentType: 'whatsapp_messaging',
    granted: true,
    method: 'whatsapp_reply',
    details: { ordersAttributed, phone },
  })

  redirect('/profile?linked=whatsapp')
}

export async function unlinkWhatsAppAction(
  formData: FormData
): Promise<{ error?: string; success?: boolean; message?: string }> {
  const auth = await requireUser('/profile')
  const supabase = await createServerSupabaseClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, phone_number, phone_canonical')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (!profile?.phone_canonical) {
    return { error: 'No WhatsApp number linked to this account.' }
  }

  const phone = profile.phone_canonical

  await recordConsent({
    userId: auth.user.id,
    phoneNumber: phone,
    consentType: 'whatsapp_messaging',
    granted: false,
    method: 'button_click',
details: { source: 'profile_card', action: 'unlink' },
  })
  ;

  const unlinkConsentInput = {
    userId: auth.user.id,
    phoneNumber: phone,
    consentType: 'account_linking' as const,
    granted: false,
    method: 'button_click' as const,
    details: { source: 'profile_card', action: 'unlink' },
  }
  await recordConsent(unlinkConsentInput)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      phone: '',
      phone_number: '',
      phone_verified: false,
      whatsapp_opt_in: false,
      whatsapp_opt_in_at: null,
      phone_canonical: null,
    })
    .eq('id', auth.user.id)

  if (updateError) {
    console.error('[account-linking] unlink profile update failed:', updateError.message)
    return { error: 'Failed to unlink WhatsApp. Please try again.' }
  }

  return { success: true, message: 'WhatsApp number unlinked successfully.' }
}

export async function changeWhatsAppAction(
  formData: FormData
): Promise<{ error?: string; success?: boolean; message?: string }> {
  const auth = await requireUser('/profile')
  const supabase = await createServerSupabaseClient()

  const phoneRaw = (formData.get('phone') as string | undefined)?.trim()
  const emailRaw = (formData.get('email') as string | undefined)?.trim()
  const whatsappOptIn = formData.get('whatsapp_opt_in') === 'on'

  const email = emailRaw ?? auth.user.email ?? null

  if (!email) {
    return { error: 'An email address is required to send the confirmation link.' }
  }

  if (!phoneRaw) {
    return { error: 'Please enter your new WhatsApp phone number.' }
  }

  const phone = canonicalPhone(phoneRaw)
  if (!phone) {
    return { error: 'Please enter a valid phone number.' }
  }

  const { data: existing } = await supabase
    .from('link_requests')
    .select('id')
    .eq('target_phone', phone)
    .eq('target_user_id', auth.user.id)
    .is('confirmed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existing) {
    return { error: 'A pending link request already exists for this phone number.' }
  }

  const { data: phoneOwner } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone_canonical', phone)
    .neq('id', auth.user.id)
    .maybeSingle()

  if (phoneOwner) {
    return { error: 'This WhatsApp number is already linked to a different account.' }
  }

  const env = getEnv()
  const useOtp = whatsappOptIn && !!env.WHATSAPP_AUTH_TEMPLATE_NAME

  if (useOtp) {
    const result = await createLinkRequest({
      initiatedFrom: 'web',
      method: 'whatsapp_otp',
      targetPhone: phone,
      targetEmail: email,
      targetUserId: auth.user.id,
    })

    if (!result) {
      return { error: 'Failed to create a link request. Please try again.' }
    }

    const otpCode = generateOtp()
    const otpIssued = await issueOtpForRequest(result.linkRequest.id, otpCode)

    if (!otpIssued) {
      return { error: 'Failed to issue verification code. Please try again.' }
    }

    const templateName = env.WHATSAPP_AUTH_TEMPLATE_NAME!
    await sendWhatsAppTemplate(phone, {
      name: templateName,
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: otpCode }],
        },
      ],
    })

    if (whatsappOptIn) {
      await recordConsent({
        userId: auth.user.id,
        phoneNumber: phone,
        consentType: 'whatsapp_messaging',
        granted: true,
        method: 'checkbox_web',
        details: { source: 'profile_card_change', otpSent: true },
      })
    }

    return { success: true, message: `A verification code has been sent to your new WhatsApp number. Please enter it below to complete the change.` }
  }

  const result = await createLinkRequest({
    initiatedFrom: 'web',
    method: 'email_magic_link',
    targetPhone: phone,
    targetEmail: email,
    targetUserId: auth.user.id,
  })

  if (!result) {
    return { error: 'Failed to create a link request. Please try again.' }
  }

  const profileData = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', auth.user.id)
    .maybeSingle()

  const customerName = profileData.data?.full_name ?? 'there'
  const confirmUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'}/link/confirm?token=${result.token}`

  await sendAccountLinkConfirmation(
    auth.user.id,
    email ?? '',
    customerName,
    confirmUrl,
    0
  )

  if (whatsappOptIn) {
    await recordConsent({
      userId: auth.user.id,
      phoneNumber: phone,
      consentType: 'whatsapp_messaging',
      granted: true,
      method: 'checkbox_web',
      details: { source: 'profile_card_change' },
    })
  }

  return { success: true, message: `A confirmation link has been sent to ${email ?? 'your email'}.` }
}