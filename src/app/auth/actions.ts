'use server'

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
import { sendWelcomeEmail } from '@/lib/email/triggers'

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

function formatForgotPasswordError(message?: string): AuthFormState {
  const fallback = 'Unable to send a reset link right now. Please try again.'
  const rawMessage = message || fallback
  const normalizedMessage = rawMessage.toLowerCase()

  if (
    normalizedMessage.includes('user not found') ||
    normalizedMessage.includes('user does not exist') ||
    normalizedMessage.includes('not found') ||
    normalizedMessage.includes('not exist')
  ) {
    return {
      status: 'success',
      message: 'If an account exists for that email, a secure reset link will arrive shortly.',
    }
  }

  if (normalizedMessage.includes('rate') || normalizedMessage.includes('too many')) {
    return {
      status: 'error',
      message: 'Too many reset requests. Please wait a moment and try again.',
    }
  }

  if (normalizedMessage.includes('redirect') || normalizedMessage.includes('email')) {
    return {
      status: 'error',
      message: 'Password reset email could not be sent. Please try again or contact support.',
    }
  }

  return {
    status: 'error',
    message: rawMessage,
  }
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

  const supabase = await createServerSupabaseClient()
  const callbackUrl = await getAuthCallbackUrl(
    `/auth/update-password?next=${encodeURIComponent(nextPath)}`
  )
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl,
  })

  if (error) {
    return formatForgotPasswordError(error.message)
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

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    return {
      status: 'error',
      message: error.message,
    }
  }

  redirect(nextPath)
}
