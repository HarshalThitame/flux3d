import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.VERCEL_ENV === 'production' ? 0.1 : 1.0,
  includeLocalVariables: true,
  enableLogs: true,
  integrations: [
    Sentry.httpIntegration(),
    Sentry.requestDataIntegration(),
  ],
  enabled: !!process.env.SENTRY_DSN,
})
