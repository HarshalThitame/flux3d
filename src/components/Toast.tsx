'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X, Undo2 } from 'lucide-react'
import { useToasts, removeToast, type ToastType } from '@/lib/toast/store'

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

export default function ToastContainer() {
  const toasts = useToasts()

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = icons[toast.type]
          const c = colors[toast.type]

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 80, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.92 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className={`pointer-events-auto flex w-[360px] gap-3 rounded-2xl border ${c.border} ${c.bg} p-4 shadow-[var(--shadow-elevated)] backdrop-blur-xl`}
            >
              <span className={`mt-0.5 shrink-0 ${c.icon}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold ${c.text}`}>{toast.title}</p>
                {toast.description && (
                  <p className={`mt-0.5 text-xs leading-5 ${c.text} opacity-75`}>{toast.description}</p>
                )}
                {toast.action && (
                  <button
                    type="button"
                    onClick={toast.action.onClick}
                    className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 ${
                      toast.type === 'success'
                        ? 'bg-emerald-200 text-emerald-800'
                        : toast.type === 'error'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-sky-200 text-sky-800'
                    }`}
                  >
                    <Undo2 className="h-3 w-3" />
                    {toast.action.label}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className={`mt-0.5 shrink-0 rounded-lg p-1 transition hover:opacity-70 ${c.icon}`}
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
