// Request context using AsyncLocalStorage for correlation ID propagation.
import { AsyncLocalStorage } from 'node:async_hooks'

export type RequestContext = {
  correlationId: string
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore()
}

export function getCorrelationId(): string {
  return getRequestContext()?.correlationId ?? ''
}

export { asyncLocalStorage }
