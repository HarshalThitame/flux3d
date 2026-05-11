'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

export type AdminToastState = {
  type: 'success' | 'error' | 'info'
  message: string
} | null

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

const styles = {
  success: 'border-emerald-400/20 bg-emerald-50 text-emerald-600',
  error: 'border-rose-200 bg-rose-50 text-rose-600',
  info: 'border-cyan-200 bg-cyan-50 text-cyan-600',
}

export default function AdminToast({ toast }: { toast: AdminToastState }) {
  const Icon = toast ? icons[toast.type] : null
  const style = toast ? styles[toast.type] : ''

  return (
    <AnimatePresence>
      {toast && Icon && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          className="fixed bottom-5 right-5 z-[120] max-w-sm overflow-hidden rounded-xl border border-gray-200 bg-[#FFFFFF] shadow-2xl backdrop-blur-xl"
        >
          <div className={`flex items-center gap-3 px-4 py-3 ${style}`}>
            <Icon className="h-4.5 w-4.5 shrink-0" />
            <div className="text-sm">{toast.message}</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
