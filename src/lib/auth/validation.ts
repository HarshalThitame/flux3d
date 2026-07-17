export type AuthFormState = {
  status?: 'error' | 'success'
  message?: string
  fieldErrors?: Partial<Record<'name' | 'email' | 'password' | 'confirmPassword' | 'terms', string[]>>
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeName(name: string) {
  return name.replace(/\s+/g, ' ').trim()
}

export function validateName(name: string) {
  const errors: string[] = []

  if (!name) {
    errors.push('Enter your full name.')
    return errors
  }

  if (name.length < 2) {
    errors.push('Use at least 2 characters.')
  }

  if (name.length > 80) {
    errors.push('Use 80 characters or fewer.')
  }

  const letterCount = name.match(/\p{L}/gu)?.length ?? 0
  if (letterCount < 2) {
    errors.push('Use a real name with at least 2 letters.')
  }

  return errors
}

export function validateEmail(email: string) {
  return email.length <= 254 && emailPattern.test(email)
}

export function validatePassword(password: string) {
  const errors: string[] = []

  if (!password) {
    errors.push('Create a password.')
    return errors
  }

  if (password.length < 8) {
    errors.push('Use at least 8 characters.')
  }

  if (password.length > 128) {
    errors.push('Use 128 characters or fewer.')
  }

  if (password.trim() !== password) {
    errors.push('Remove spaces from the beginning or end.')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Include at least one uppercase letter.')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Include at least one lowercase letter.')
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Include at least one number.')
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Include at least one special character.')
  }

  return errors
}
