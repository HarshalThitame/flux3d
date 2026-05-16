'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Modal({
  open,
  onOpenChangeAction,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChangeAction}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[80] bg-slate-900/40 backdrop-blur-sm"
              />
            </Dialog.Overlay>
          )}
        </AnimatePresence>
        <Dialog.Content asChild>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,580px)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-gray-200 bg-[#FFFFFF] shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-[#0F1B3D]">
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-sm text-[#6F7192]">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              <Dialog.Close className="shrink-0 rounded-lg border border-[#7C5CFF]/10 bg-gray-50 p-2 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D]">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
