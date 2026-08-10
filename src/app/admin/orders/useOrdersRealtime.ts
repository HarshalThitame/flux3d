'use client'

import { useEffect, useRef, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type RealtimeStatus = 'connecting' | 'live' | 'polling'

/**
 * Subscribes to INSERT/UPDATE/DELETE events on the `orders` table via
 * Supabase Realtime and fires `onOrderChange` (debounced by the caller).
 *
 * Falls back to lightweight polling when:
 *  - Realtime is unavailable on the free tier or the channel fails to connect
 *  - RLS policies block event delivery (postgres_changes respects RLS)
 *
 * Polling only runs while the tab is visible to avoid background network noise.
 */
export function useOrdersRealtime(
  onOrderChange: () => void,
  options: { enabled?: boolean; pollIntervalMs?: number; connectTimeoutMs?: number } = {}
) {
  const { enabled = true, pollIntervalMs = 60000, connectTimeoutMs = 8000 } = options
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const onChangeRef = useRef(onOrderChange)

  useEffect(() => {
    onChangeRef.current = onOrderChange
  }, [onOrderChange])

  useEffect(() => {
    if (!enabled) return

    const supabase = getSupabaseBrowserClient()
    let subscribed = false
    let disposed = false

    const channel = supabase
      .channel('admin-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
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

    // Safety-net polling: only when realtime isn't connected and tab is visible.
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