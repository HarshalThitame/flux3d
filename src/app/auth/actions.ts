'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthCallbackUrl, normalizeNextPath } from '@/lib/auth/redirect'
import { upsertProfileForUser } from '@/lib/auth/profile'
import {
  type AuthFormState,
  normalizeName,
  validateEmail,
  validateName,
  validatePassword,
} from '@/lib/auth/validation'
import {
  sendWelcomeEmail,
  sendEmailVerification,
  sendPasswordReset,
  sendPasswordChangedNotification,
} from '@/lib/email/triggers'
import { createAdminClient } from '@/lib/supabase/admin'
import { rateLimitCheck } from '@/lib/rate-limit'
import { buildOtpConfirmUrl } from '@/lib/auth/otp-link'
import { getClientIp, getDeviceInfo, formatChangedAt } from '@/lib/auth/request-context'

function readString(formData: FormData, key: string, options: { trim?: boolean } = {}) {
  const value = formData.get(key)
  if (typeof value !== 'string') {
    return ''
  }

  return options.trim === false ? value : value.trim()
}

function formatSignupError(message?: string) {
  const fallback = 'Unable to create your account right now. Please try again.'
  const rawMessage = message || fallback
  const normalizedMessage = rawMessage.toLowerCase()

  if (normalizedMessage.includes('already') || normalizedMessage.includes('registered')) {
    return 'An account already exists for this email. Log in or reset your password.'
  }

  if (normalizedMessage.includes('rate') || normalizedMessage.includes('too many')) {
    return 'Too many signup attempts. Please wait a moment and try again.'
  }

  if (normalizedMessage.includes('confirmation') || normalizedMessage.includes('confirm')) {
    return 'Email confirmation is not configured. Please contact support or try signing in with Google.'
  }

  return rawMessage
}

function formatLoginError(message?: string) {
  const fallback = 'Unable to sign in right now. Please try again.'
  const rawMessage = message || fallback
  const normalizedMessage = rawMessage.toLowerCase()

  if (normalizedMessage.includes('invalid login') || normalizedMessage.includes('invalid credentials')) {
    return 'Email or password is incorrect. Check your details or reset your password.'
  }

  if (normalizedMessage.includes('email not confirmed') || normalizedMessage.includes('not confirmed')) {
    return 'Confirm your email before logging in. Check your inbox or continue with Google.'
  }

  if (normalizedMessage.includes('rate') || normalizedMessage.includes('too many')) {
    return 'Too many login attempts. Please wait a moment and try again.'
  }

  return rawMessage
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = normalizeName(readString(formData, 'name'))
  const email = readString(formData, 'email').toLowerCase()
  const phone = readString(formData, 'phone')
  const password = readString(formData, 'password', { trim: false })
  const confirmPassword = readString(formData, 'confirmPassword', { trim: false })
  const nextPath = normalizeNextPath(readString(formData, 'next'))
  const acceptedTerms = formData.get('terms') === 'on'

  const fieldErrors: AuthFormState['fieldErrors'] = {}

  const nameErrors = validateName(name)
  if (nameErrors.length > 0) {
    fieldErrors.name = nameErrors
  }

  if (!validateEmail(email)) {
    fieldErrors.email = ['Enter a valid email address.']
  }

  const passwordErrors = validatePassword(password)
  if (passwordErrors.length > 0) {
    fieldErrors.password = passwordErrors
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = ['Confirm your password.']
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = ['Passwords do not match.']
  }

  if (!acceptedTerms) {
    fieldErrors.terms = ['Accept the terms to create your account.']
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      fieldErrors,
    }
  }

  const supabase = await createServerSupabaseClient()
  const callbackUrl = await getAuthCallbackUrl(nextPath)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
      data: {
        full_name: name,
        ...(phone ? { phone, phone_number: phone } : {}),
      },
    },
  })

  if (error) {
    return {
      status: 'error',
      message: formatSignupError(error.message),
    }
  }

  if (!data.user) {
    return {
      status: 'error',
      message: 'Signup succeeded but Supabase did not return a user record.',
    }
  }

  if (data.session) {
    try {
      await upsertProfileForUser(supabase, data.user, name, phone)
      // Enqueue welcome email for new accounts (fire-and-forget)
      sendWelcomeEmail(data.user.id, data.user.email ?? email, name).catch((err) => {
        console.error('[Auth] Failed to enqueue welcome email:', err)
      })
    } catch (profileError) {
      console.error('[Auth] Failed to create profile during signup', profileError)
    }
    redirect(nextPath)
  }

  // No session — email confirmation is required.
  // Generate a verification link via the admin API and send it through our EMS.
  try {
    const adminClient = createAdminClient()
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: { redirectTo: callbackUrl },
    })
    const tokenHash = linkData?.properties?.hashed_token
    if (tokenHash) {
      const verificationUrl = buildOtpConfirmUrl({
        tokenHash,
        type: 'signup',
        nextPath,
      })
      sendEmailVerification(data.user.id, data.user.email ?? email, name, verificationUrl).catch((err) => {
        console.error('[Auth] Failed to enqueue verification email:', err)
      })
    }
  } catch (err) {
    console.error('[Auth] Failed to generate verification link:', err)
  }

  return {
    status: 'success',
    message:
      'Account created. Check your email to confirm your address, then sign in.',
  }
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = readString(formData, 'email').toLowerCase()
  const password = readString(formData, 'password', { trim: false })
  const nextPath = normalizeNextPath(readString(formData, 'next'))

  const fieldErrors: AuthFormState['fieldErrors'] = {}

  if (!validateEmail(email)) {
    fieldErrors.email = ['Enter a valid email address.']
  }

  if (!password) {
    fieldErrors.password = ['Enter your password.']
  } else if (password.length > 128) {
    fieldErrors.password = ['Use 128 characters or fewer.']
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      status: 'error',
      fieldErrors,
    }
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return {
      status: 'error',
      message: formatLoginError(error?.message),
    }
  }

  try {
    await upsertProfileForUser(supabase, data.user)
  } catch (profileError) {
    console.error('[Auth] Failed to upsert profile after login', profileError)
  }

  redirect(nextPath)
}

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = readString(formData, 'email').toLowerCase()
  const nextPath = normalizeNextPath(readString(formData, 'next'))

  if (!validateEmail(email)) {
    return {
      status: 'error',
      fieldErrors: {
        email: ['Enter a valid email address.'],
      },
    }
  }

  // Server-side guards so direct requests cannot bypass the client countdown.
  // Respond with the generic success message so they don't reveal account
  // existence or the rate limit.
  const cooldown = await rateLimitCheck(`forgot-password:cooldown:${email}`, 60, 1)
  if (!cooldown.success) {
    return {
      status: 'success',
      message: 'If an account exists for that email, a secure reset link will arrive shortly.',
    }
  }

  const hourly = await rateLimitCheck(`forgot-password:${email}`, 3600, 5)
  if (!hourly.success) {
    return {
      status: 'success',
      message: 'If an account exists for that email, a secure reset link will arrive shortly.',
    }
  }

  const forwarded = (await headers()).get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  const ipHourly = await rateLimitCheck(`forgot-password:ip:${ip}`, 3600, 20)
  if (!ipHourly.success) {
    return {
      status: 'success',
      message: 'If an account exists for that email, a secure reset link will arrive shortly.',
    }
  }

  const callbackUrl = await getAuthCallbackUrl(
    `/auth/update-password?next=${encodeURIComponent(nextPath)}`
  )

  // Generate a recovery OTP via the admin API and send the branded reset
  // email through our EMS. This is the single delivery path — the Supabase
  // built-in recovery email is never triggered, so users receive exactly one
  // email and no dashboard template configuration is required.
  try {
    const adminClient = createAdminClient()
    const { data: linkData } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: callbackUrl },
    })
    const tokenHash = linkData?.properties?.hashed_token
    if (!tokenHash) {
      // Same generic response as every other failure: never reveal whether
      // the account exists or whether the infrastructure misbehaved.
      console.error('[Auth] Recovery link generated without a hashed token')
      return {
        status: 'success',
        message: 'If an account exists for that email, a secure reset link will arrive shortly.',
      }
    }

    const resetUrl = buildOtpConfirmUrl({
      tokenHash,
      type: 'recovery',
      nextPath,
    })

    // Best-effort profile lookup for a personalized greeting. The email is
    // sent regardless — a missing profile must never silently drop the link.
    const { data: profileData } = await adminClient
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .maybeSingle()
    const userId = profileData?.id ?? ''
    const userName = profileData?.full_name ?? 'User'
    await sendPasswordReset(userId, email, userName, resetUrl, await getClientIp(), await getDeviceInfo())
  } catch (err) {
    // generateLink throws "User not found" for unknown accounts — mapping this
    // to an error would hand attackers an account-existence oracle.
    console.error('[Auth] Failed to generate recovery link:', err)
  }

  return {
    status: 'success',
    message: 'If an account exists for that email, a secure reset link will arrive shortly.',
  }
}

export async function updatePasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = readString(formData, 'password', { trim: false })
  const confirmPassword = readString(formData, 'confirmPassword', { trim: false })
  const nextPath = normalizeNextPath(readString(formData, 'next'), '/profile')
  const passwordErrors = validatePassword(password)

  if (passwordErrors.length > 0) {
    return {
      status: 'error',
      fieldErrors: {
        password: passwordErrors,
      },
    }
  }

  if (!confirmPassword) {
    return {
      status: 'error',
      fieldErrors: {
        confirmPassword: ['Confirm your password.'],
      },
    }
  }

  if (password !== confirmPassword) {
    return {
      status: 'error',
      fieldErrors: {
        confirmPassword: ['Passwords do not match.'],
      },
    }
  }

  const supabase = await createServerSupabaseClient()
  const { data: updateData, error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    const normalized = error.message.toLowerCase()
    if (normalized.includes('session')) {
      return {
        status: 'error',
        message: 'Your session has expired. Please request a new password reset link.',
      }
    }

    if (normalized.includes('same as') || normalized.includes('different from')) {
      return {
        status: 'error',
        message: 'The new password must be different from your current password.',
      }
    }

    return {
      status: 'error',
      message: 'Unable to update your password right now. Please try again.',
    }
  }

  // Enterprise hardening: the recovery link is single-use and expires in 1
  // hour (enforced by GoTrue). After a successful change we additionally
  // revoke every other session and notify the account owner, so a leaked
  // session dies with the old password.
  try {
    await supabase.auth.signOut({ scope: 'others' })
  } catch (signOutError) {
    console.error('[Auth] Failed to revoke other sessions after password change', signOutError)
  }

  try {
    const user = updateData?.user ?? (await supabase.auth.getUser()).data.user
    const email = user?.email ?? ''
    if (email) {
      const customerName = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? 'there'
      await sendPasswordChangedNotification(
        user?.id ?? '',
        email,
        customerName,
        formatChangedAt(),
        await getClientIp(),
        await getDeviceInfo()
      )
    }
  } catch (notificationError) {
    // Never fail the password update because a notification could not be sent.
    console.error('[Auth] Failed to enqueue password-changed notification', notificationError)
  }

  redirect(nextPath)
}
