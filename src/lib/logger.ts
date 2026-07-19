// Structured logger with JSON output, log levels, and correlation ID support.
// Writes to stdout/stderr directly to bypass Next.js removeConsole transform.
import { getCorrelationId } from './request-context'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogEntry = {
  timestamp: string
  level: LogLevel
  message: string
  correlationId?: string
  module?: string
  duration?: number
  error?: string
  metadata?: Record<string, unknown>
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const currentLevel: LogLevel =
  process.env.NODE_ENV === 'production' ? 'info' : 'debug'

const startedAt = Date.now()

function writeEntry(entry: LogEntry) {
  const json = JSON.stringify(entry)
  if (entry.level === 'error' || entry.level === 'warn') {
    process.stderr.write(json + '\n')
  } else {
    process.stdout.write(json + '\n')
  }
}

function log(level: LogLevel, message: string, meta?: { module?: string; error?: Error; duration?: number; metadata?: Record<string, unknown> }) {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLevel]) return

  const correlationId = getCorrelationId()

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...correlationId ? { correlationId } : {},
    ...meta?.module ? { module: meta.module } : {},
    ...meta?.duration !== undefined ? { duration: meta.duration } : {},
    ...meta?.error ? { error: `${meta.error.name}: ${meta.error.message}` } : {},
    ...meta?.metadata ? { metadata: meta.metadata } : {},
  }

  writeEntry(entry)
}

export function logDebug(message: string, options?: { module?: string; duration?: number; metadata?: Record<string, unknown> }) {
  log('debug', message, options)
}

export function logInfo(message: string, options?: { module?: string; duration?: number; metadata?: Record<string, unknown> }) {
  log('info', message, options)
}

export function logWarn(message: string, options?: { module?: string; error?: Error; duration?: number; metadata?: Record<string, unknown> }) {
  log('warn', message, options)
}

export function logError(message: string, options?: { module?: string; error?: Error; duration?: number; metadata?: Record<string, unknown> }) {
  log('error', message, options)
}

export function getUptimeSeconds(): number {
  return Math.round((Date.now() - startedAt) / 1000)
}

