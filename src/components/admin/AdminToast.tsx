'use client'

import { AnimatePresence, motion } from 'framer-motion'

export type AdminToastState = {
  type: 'success' | 'error' | 'info'
  message: string
} | null

export default function AdminToast({ toast }: { toast: AdminToastState }) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-2xl border border-white/10 bg-[rgba(10,16,31,0.94)] px-4 py-3 text-sm text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <div
            className={
              toast.type === 'error'
                ? 'text-rose-300'
                : toast.type === 'success'
                  ? 'text-emerald-300'
                  : 'text-sky-300'
            }
          >
            {toast.message}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
