'use client'

import { AnimatePresence, motion } from 'framer-motion'

export type ToastState = {
  type: 'success' | 'error' | 'info'
  message: string
} | null

export default function Toast({ toast }: { toast: ToastState }) {
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-3 text-sm text-[#0F1B3D] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          <div className={toast.type === 'error' ? 'text-rose-300' : toast.type === 'success' ? 'text-emerald-300' : 'text-sky-300'}>
            {toast.message}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

