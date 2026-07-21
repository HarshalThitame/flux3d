import { useCallback, useSyncExternalStore } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type ToastAction = {
  label: string
  onClick: () => void
}

export type Toast = {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
  action?: ToastAction
}

type Listener = () => void

let toasts: Toast[] = []
const listeners = new Set<Listener>()

function emit() {
  listeners.forEach((fn) => fn())
}

let counter = 0

export function addToast(toast: Omit<Toast, 'id'>) {
  counter += 1
  const id = `toast-${Date.now()}-${counter}`
  toasts = [...toasts, { ...toast, id }]
  emit()

  const duration = toast.duration ?? (toast.type === 'error' ? 5000 : 3000)
  if (duration > 0) {
    setTimeout(() => removeToast(id), duration)
  }
}

export function removeToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export function subscribe(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getSnapshot() {
  return toasts
}

export function useToasts() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useAddToast() {
  return useCallback(addToast, [])
}
