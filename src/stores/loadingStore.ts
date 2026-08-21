'use client'

import { create } from 'zustand'

type LoadingState = {
  isLoading: boolean
  message: string | null
  start: (message?: string) => void
  stop: () => void
  reset: () => void
  setMessage: (message: string) => void
}

let loadingCount = 0

export const useLoadingStore = create<LoadingState>((set, get) => ({
  isLoading: false,
  message: null,
  start: (message) => {
    loadingCount += 1
    set({
      isLoading: true,
      message: message ?? get().message ?? 'Preparing your experience…',
    })
  },
  stop: () => {
    loadingCount = Math.max(0, loadingCount - 1)
    set({
      isLoading: loadingCount > 0,
      message: loadingCount > 0 ? get().message : null,
    })
  },
  reset: () => {
    loadingCount = 0
    set({ isLoading: false, message: null })
  },
  setMessage: (message) => set({ message }),
}))
