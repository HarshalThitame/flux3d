import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

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
      NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      SUPABASE_SERVICE_ROLE_KEY: '$SUPABASE_SERVICE_ROLE_KEY',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH',
      NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET: 'quote-models',
      RAZORPAY_KEY_ID: 'rzp_test_placeholder',
      RAZORPAY_KEY_SECRET: 'test_secret_placeholder',
      RAZORPAY_WEBHOOK_SECRET: 'whsec_placeholder',
    },
  },
})
