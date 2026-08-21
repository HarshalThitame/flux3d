'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type RealtimeStatus = 'connecting' | 'live' | 'polling'

/**
 * Subscribes to INSERT/UPDATE/DELETE events on support_tickets and
 * support_ticket_messages via Supabase Realtime.
 *
 * Falls back to lightweight polling when realtime is unavailable.
 */
export function useTicketsRealtime(
  onTicketChange: () => void,
  options: { enabled?: boolean; pollIntervalMs?: number; connectTimeoutMs?: number } = {}
) {
  const { enabled = true, pollIntervalMs = 30000, connectTimeoutMs = 8000 } = options
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const onChangeRef = useRef(onTicketChange)

  useEffect(() => {
    onChangeRef.current = onTicketChange
  }, [onTicketChange])

  useEffect(() => {
    if (!enabled) return

    const supabase = getSupabaseBrowserClient()
    let subscribed = false
    let disposed = false

    const channel = supabase
      .channel('admin-tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => {
        if (disposed) return
        onChangeRef.current()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_ticket_messages' }, () => {
        if (disposed) return
        onChangeRef.current()
      })
      .subscribe((state: string) => {
        if (disposed) return
        subscribed = state === 'SUBSCRIBED'
        setStatus(subscribed ? 'live' : 'polling')
      })

    const connectTimeout = window.setTimeout(() => {
      if (!subscribed && !disposed) {
        setStatus('polling')
      }
    }, connectTimeoutMs)

    const pollTimer = window.setInterval(() => {
      if (!subscribed && !disposed && document.visibilityState === 'visible') {
        onChangeRef.current()
      }
    }, pollIntervalMs)

    return () => {
      disposed = true
      window.clearTimeout(connectTimeout)
      window.clearInterval(pollTimer)
      void supabase.removeChannel(channel)
    }
  }, [enabled, pollIntervalMs, connectTimeoutMs])

  return { status }
}
