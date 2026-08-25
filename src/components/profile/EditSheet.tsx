'use client'

import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'

export default function EditSheet({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[100] bg-[#070b1d]/50 backdrop-blur-sm"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="pointer-events-none fixed inset-0 z-[101] flex items-end justify-center sm:items-center sm:p-6"
                >
                  <motion.div
                    initial={{ y: 64, scale: 0.98 }}
                    animate={{ y: 0, scale: 1 }}
                    exit={{ y: 48, scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    className="pointer-events-auto max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-[var(--line-subtle)] bg-[var(--surface-elevated)] p-6 shadow-[var(--shadow-float)] [max-width:32rem] sm:max-h-[85vh] sm:rounded-3xl sm:p-8"
                    data-lenis-prevent
                  >
                    <div aria-hidden className="mx-auto mb-5 h-1 w-10 rounded-full bg-[var(--line-soft)] sm:hidden" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Dialog.Title className="[font-family:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--text-primary)]">
                          {title}
                        </Dialog.Title>
                        {description ? (
                          <Dialog.Description className="mt-1.5 text-sm leading-6 text-[var(--text-muted)]">
                            {description}
                          </Dialog.Description>
                        ) : (
                          <Dialog.Description className="sr-only">{title}</Dialog.Description>
                        )}
                      </div>
                      <Dialog.Close
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line-subtle)] text-[var(--text-faint)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-secondary)]"
                        aria-label="Close"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </Dialog.Close>
                    </div>
                    <div className="mt-6">{children}</div>
                  </motion.div>
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
