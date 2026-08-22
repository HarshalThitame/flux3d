import * as Sentry from '@sentry/nextjs'
import { logError } from './logger'

/**
 * Global process-level error guards. Unhandled promise rejections and
 * uncaught exceptions in Node.js otherwise crash the process (or on Vercel,
 * terminate the serverless invocation). These handlers ensure every failure
 * is captured in both the structured log and Sentry.
 *
 * IMPORTANT: register() must be idempotent — Next.js may invoke it more than
 * once across hot reloads in development.
 */
let registered = false

export function registerProcessGuards() {
  if (registered) return
  registered = true

  process.on('unhandledRejection', (reason) => {
    logError('Unhandled promise rejection', {
      module: 'process',
      error: reason instanceof Error ? reason : new Error(String(reason)),
    })
    Sentry.captureException(reason instanceof Error ? reason : new Error(String(reason)), {
      tags: { handler: 'unhandledRejection' },
    })
  })

  process.on('uncaughtException', (error) => {
    logError('Uncaught exception', { module: 'process', error })
    Sentry.captureException(error, { tags: { handler: 'uncaughtException' } })
  })

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => {
      logError(`Received ${signal}, flushing and exiting`, { module: 'process' })
      // Give Sentry a short window to flush queued events before exit.
      const timeout = setTimeout(() => process.exit(0), 2000)
      timeout.unref()
    })
  }
}