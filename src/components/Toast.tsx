'use client'

import { CheckCircle2, AlertCircle, Info, X, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useToasts, removeToast, type Toast, type ToastType } from '@/lib/toast/store'

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const colors: Record<ToastType, { border: string; bg: string; icon: string; text: string }> = {
  success: { border: 'border-emerald-200', bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-800' },
  error: { border: 'border-red-200', bg: 'bg-red-50', icon: 'text-red-600', text: 'text-red-800' },
  info: { border: 'border-sky-200', bg: 'bg-sky-50', icon: 'text-sky-600', text: 'text-sky-800' },
}

// Mirrors the prior Framer Motion spring (damping:22, stiffness:260) via CSS
// keyframes easing (cubic-bezier(0.34,1.56,0.64,1)) defined in globals.css.
const EXIT_AFTER_MS = 250

type VisibleToast = {
  toast: Toast
  exiting: boolean
}

export default function ToastContainer() {
  const storeToasts = useToasts()
  const [visible, setVisible] = useState<VisibleToast[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Reconcile the store -> our locally-animated list. New toasts enter;
  // departed toasts are marked exiting so the CSS exit animation can run
  // before they are unmounted. This mirrors Framer Motion's AnimatePresence.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setVisible((prev) => {
      const prevById = new Map(prev.map((v) => [v.toast.id, v]))
      const next: VisibleToast[] = []
      for (const toast of storeToasts) {
        const existing = prevById.get(toast.id)
        next.push(existing ? { ...existing, exiting: false } : { toast, exiting: false })
      }
      prev.forEach((v) => {
        if (!storeToasts.some((t) => t.id === v.toast.id)) {
          next.push({ ...v, exiting: true })
        }
      })
      return next
    })
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [storeToasts])

  // Schedule removal of toasts that have finished their exit transition.
  useEffect(() => {
    const timers = timersRef.current
    visible
      .filter((v) => v.exiting && !timers.has(v.toast.id))
      .forEach((v) => {
        const t = setTimeout(() => {
          setVisible((cur) => cur.filter((x) => x.toast.id !== v.toast.id))
          timers.delete(v.toast.id)
        }, EXIT_AFTER_MS)
        timers.set(v.toast.id, t)
      })
  }, [visible])

  // Clear any leaked timers on unmount.
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((t) => clearTimeout(t))
      timers.clear()
    }
  }, [])

  const dismiss = (id: string) => removeToast(id)

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      {visible.map((entry) => {
        const Icon = icons[entry.toast.type]
        const c = colors[entry.toast.type]
        return (
          <div
            key={entry.toast.id}
            className={`toast-entry pointer-events-auto flex w-[360px] gap-3 rounded-2xl border ${c.border} ${c.bg} p-4 shadow-[var(--shadow-elevated)] backdrop-blur-xl ${
              entry.exiting ? 'toast-exit' : ''
            }`}
          >
            <span className={`mt-0.5 shrink-0 ${c.icon}`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-semibold ${c.text}`}>{entry.toast.title}</p>
              {entry.toast.description && (
                <p className={`mt-0.5 text-xs leading-5 ${c.text} opacity-75`}>{entry.toast.description}</p>
              )}
              {entry.toast.action && (
                <button
                  type="button"
                  onClick={entry.toast.action.onClick}
                  className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 ${
                    entry.toast.type === 'success'
                      ? 'bg-emerald-200 text-emerald-800'
                      : entry.toast.type === 'error'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-sky-200 text-sky-800'
                  }`}
                >
                  <Undo2 className="h-3 w-3" />
                  {entry.toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(entry.toast.id)}
              aria-label="Dismiss notification"
              className={`mt-0.5 shrink-0 rounded-lg p-1 transition hover:opacity-70 ${c.icon}`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
