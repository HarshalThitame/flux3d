'use client'

import { useCallback } from 'react'
import { useLoadingStore } from '@/stores/loadingStore'

export function useGlobalLoading() {
  const start = useLoadingStore((state) => state.start)
  const stop = useLoadingStore((state) => state.stop)
  const isLoading = useLoadingStore((state) => state.isLoading)
  const message = useLoadingStore((state) => state.message)

  const withLoading = useCallback(
    async <T,>(action: () => Promise<T> | T, message?: string): Promise<T> => {
      start(message)
      try {
        return await action()
      } finally {
        stop()
      }
    },
    [start, stop]
  )

  return {
    isLoading,
    message,
    start,
    stop,
    withLoading,
  }
}
