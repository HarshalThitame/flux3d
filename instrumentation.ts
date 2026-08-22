import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
    // Dynamically imported so the Edge bundle never traces Node-only APIs
    // (process.on / process.exit).
    const { registerProcessGuards } = await import('@/lib/process-guards')
    registerProcessGuards()
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
