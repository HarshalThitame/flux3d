'use client'

import type { Json } from '../../../types/database'

export type LogErrorParams = {
  user_id?: string | null
  page_url?: string | null
  error_message: string
  stack_trace?: string | null
  device_info?: Json
}

export function logError(params: LogErrorParams) {
  const payload = {
    ...params,
    page_url: params.page_url ?? (typeof window !== 'undefined' ? window.location.pathname : null),
  }

  void fetch('/api/log-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).then((response) => {
    if (!response.ok) {
      console.error('[tracking] Failed to submit error log:', response.status)
    }
  }).catch((error) => {
    console.error('[tracking] Failed to submit error log:', error)
  })
}
