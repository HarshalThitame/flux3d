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
  success: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  error: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  info: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
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
          className="fixed bottom-5 right-5 z-[120] max-w-sm overflow-hidden rounded-xl border border-white/[0.06] bg-[#FFFFFF] shadow-2xl backdrop-blur-xl"
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
