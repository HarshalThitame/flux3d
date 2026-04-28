'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'

export default function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[#03060d]/72 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[90] w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border border-white/10 bg-[#0b1325] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.48)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-[var(--font-syne)] text-2xl font-bold text-white">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-2 text-sm leading-6 text-[#96a0c0]">
                  {description}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-[#c8d0e8] transition hover:bg-white/[0.07]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="mt-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
