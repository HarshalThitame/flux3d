// Reads test env vars from .env.test (which is gitignored).
// This avoids hardcoding secrets in test files.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  try {
    const path = resolve(process.cwd(), '.env.test')
    const text = readFileSync(path, 'utf8')
    const vars: Record<string, string> = {}
    for (const line of text.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i === -1) continue
      vars[t.slice(0, i).trim()] = t.slice(i + 1).trim()
    }
    return vars
  } catch {
    return {}
  }
}

const env = loadEnv()

export const LOCAL_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
export const LOCAL_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY ?? ''
export const LOCAL_ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
