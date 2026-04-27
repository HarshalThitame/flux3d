export type AuthFormState = {
  status?: 'error' | 'success'
  message?: string
  fieldErrors?: Partial<Record<'name' | 'email' | 'password', string[]>>
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string) {
  return emailPattern.test(email)
}

export function validatePassword(password: string) {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Use at least 8 characters.')
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
