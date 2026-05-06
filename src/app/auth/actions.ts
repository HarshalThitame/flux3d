'use server'

import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAuthCallbackUrl, normalizeNextPath } from '@/lib/auth/redirect'
import { upsertProfileForUser } from '@/lib/auth/profile'
import {
  type AuthFormState,
  validateEmail,
  validatePassword,
} from '@/lib/auth/validation'

function readString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function signupAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const name = readString(formData, 'name')
  const email = readString(formData, 'email').toLowerCase()
  const password = readString(formData, 'password')
  const nextPath = normalizeNextPath(readString(formData, 'next'))

  const fieldErrors: AuthFormState['fieldErrors'] = {}

  if (name.length < 2) {
    fieldErrors.name = ['Enter your full name.']
  }

  if (!validateEmail(email)) {
    fieldErrors.email = ['Enter a valid email address.']
  }

  const passwordErrors = validatePassword(password)
  if (passwordErrors.length > 0) {
    fieldErrors.password = passwordErrors
  }

  if (fieldErrors.name || fieldErrors.email || fieldErrors.password) {
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
      },
    },
  })

  if (error) {
    return {
      status: 'error',
      message: error.message,
    }
  }

  if (data.user && data.session) {
    try {
      await upsertProfileForUser(supabase, data.user, name)
    } catch {
      // Don't block signup if profile sync fails
    }
    redirect(nextPath)
  }

  return {
    status: 'success',
    message:
      'Account created successfully! You can now sign in.',
  }
}

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = readString(formData, 'email').toLowerCase()
  const password = readString(formData, 'password')
  const nextPath = normalizeNextPath(readString(formData, 'next'))

  const fieldErrors: AuthFormState['fieldErrors'] = {}

  if (!validateEmail(email)) {
    fieldErrors.email = ['Enter a valid email address.']
  }

  if (!password) {
    fieldErrors.password = ['Enter your password.']
  }

  if (fieldErrors.email || fieldErrors.password) {
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
      message: error?.message ?? 'Unable to sign in.',
    }
  }

  await upsertProfileForUser(supabase, data.user)
  redirect(nextPath)
}

export async function forgotPasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const email = readString(formData, 'email').toLowerCase()

  if (!validateEmail(email)) {
    return {
      status: 'error',
      fieldErrors: {
        email: ['Enter a valid email address.'],
      },
    }
  }

  const supabase = await createServerSupabaseClient()
  const callbackUrl = await getAuthCallbackUrl('/auth/update-password')
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl,
  })

  if (error) {
    return {
      status: 'error',
      message: error.message,
    }
  }

  return {
    status: 'success',
    message: 'Password reset email sent. Open the link there to continue.',
  }
}

export async function updatePasswordAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const password = readString(formData, 'password')
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
