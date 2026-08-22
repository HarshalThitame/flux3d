import * as Sentry from '@sentry/nextjs'
import { logError, logWarn, type LogLevel } from './logger'

type ReportOptions = {
  level?: 'error' | 'warn'
  module?: string
  tags?: Record<string, string>
  metadata?: Record<string, unknown>
}

/**
 * Reports an error to both the structured logger and Sentry. Used as the
 * replacement for silent `.catch(() => {})` fire-and-forget patterns so that
 * background failures (emails, notifications, audit logs, tracking) are
 * never invisible in production.
 */
export function reportError(
  error: unknown,
  message: string,
  options: ReportOptions = {}
) {
  const { level = 'error', module = 'app', tags, metadata } = options

  if (level === 'warn') {
    logWarn(message, { module, error: asError(error), metadata })
  } else {
    logError(message, { module, error: asError(error), metadata })
  }

  if (process.env.NODE_ENV === 'production') {
    Sentry.withScope((scope) => {
      if (tags) {
        for (const [key, value] of Object.entries(tags)) {
          scope.setTag(key, value)
        }
      }
      if (metadata) {
        scope.setExtras(metadata)
      }
      Sentry.captureException(asError(error))
    })
  }
}

/**
 * Fire-and-forget wrapper that never throws, reports failures via
 * reportError. Replaces `promise.catch(() => {})` in critical paths.
 */
export function safeFireAndForget(
  promise: Promise<unknown>,
  message: string,
  options: ReportOptions = {}
) {
  promise.catch((error) => reportError(error, message, options))
}

function asError(error: unknown): Error {
  if (error instanceof Error) return error
  if (typeof error === 'string') return new Error(error)
  return new Error(`Non-Error value: ${JSON.stringify(error ?? null)}`)
}

export type { LogLevel }