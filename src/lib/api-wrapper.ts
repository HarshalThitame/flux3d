// API route wrapper that captures the correlation ID and provides structured logging.
import { NextResponse } from 'next/server'
import { asyncLocalStorage } from '@/lib/request-context'
import { logError } from '@/lib/logger'

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>

export function withApiHandler(handler: Handler): Handler {
  return async (request: Request, context: { params: Promise<Record<string, string>> }) => {
    const correlationId = request.headers.get('x-flux3d-request-id') ?? crypto.randomUUID()
    const startTime = Date.now()

    try {
      return await asyncLocalStorage.run({ correlationId }, () => handler(request, context))
    } catch (error) {
      const path = new URL(request.url).pathname
      logError(`API error: ${path}`, {
        module: 'api',
        error: error instanceof Error ? error : new Error(String(error)),
        duration: Date.now() - startTime,
        metadata: { path, correlationId },
      })
      const message = error instanceof Error ? error.message : 'Internal server error'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }
}
