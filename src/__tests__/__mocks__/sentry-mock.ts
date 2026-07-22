import { vi } from 'vitest'

const mockSpan = {
  end: vi.fn(),
}

vi.mock('@sentry/nextjs', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  withScope: vi.fn((cb: (s: Record<string, unknown>) => void) => cb({
    setTag: vi.fn(),
    setExtra: vi.fn(),
    setLevel: vi.fn(),
  })),
  startInactiveSpan: vi.fn(() => mockSpan),
  startSpan: vi.fn((_opts: unknown, cb: (s: typeof mockSpan) => unknown) => cb(mockSpan)),
  startSpanManual: vi.fn((_opts: unknown, cb: (s: typeof mockSpan) => unknown) => cb(mockSpan)),
  getCurrentScope: vi.fn(() => ({
    setSpan: vi.fn(),
    getSpan: vi.fn(() => mockSpan),
  })),
  getActiveSpan: vi.fn(() => mockSpan),
  httpIntegration: vi.fn(() => ({})),
  requestDataIntegration: vi.fn(() => ({})),
  browserTracingIntegration: vi.fn(() => ({})),
  replayIntegration: vi.fn(() => ({})),
  captureRequestError: vi.fn(),
}))
