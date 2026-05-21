'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Drawer({
  open,
  onOpenChangeAction,
  title,
  children,
}: {
  open: boolean
  onOpenChangeAction: (open: boolean) => void
  title: string
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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 z-[90] flex h-screen w-[min(100vw,460px)] flex-col border-l border-gray-200 bg-[#FFFFFF]"
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <Dialog.Title className="text-lg font-semibold text-[#0F1B3D]">
                {title}
              </Dialog.Title>
              <Dialog.Close className="rounded-lg border border-[#6d28d9]/10 bg-gray-50 p-2 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D]">
                <X className="h-4 w-4" />
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              {children}
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
