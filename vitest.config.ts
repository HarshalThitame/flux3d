import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

// Load env vars from .env.test (gitignored) for test workers
function loadTestEnv() {
  try {
    const path = fileURLToPath(new URL('.env.test', import.meta.url))
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
  } catch { return {} }
}

const testEnv = loadTestEnv()

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./src/__tests__/__mocks__/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    fileParallelism: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: testEnv.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: testEnv.SUPABASE_SERVICE_ROLE_KEY ?? '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: testEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
  },
})
