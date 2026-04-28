'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export default function Drawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#03060d]/72 backdrop-blur-sm" />
        <Dialog.Content className="fixed right-0 top-0 z-[90] flex h-screen w-[min(100vw,480px)] flex-col border-l border-white/10 bg-[#091120] p-6 shadow-[-20px_0_70px_rgba(0,0,0,0.42)]">
          <div className="flex items-center justify-between gap-4 border-b border-white/8 pb-4">
            <Dialog.Title className="font-[var(--font-syne)] text-2xl font-bold text-white">
              {title}
            </Dialog.Title>
            <Dialog.Close className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-[#c8d0e8] transition hover:bg-white/[0.07]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pb-10">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
