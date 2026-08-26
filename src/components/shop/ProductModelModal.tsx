'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import ProductModelViewer from './ProductModelViewer'
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scroll-lock'
import type { ShopProductHotspot } from '@/lib/shop/admin-types'

function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    lockBodyScroll()
    return () => {
      unlockBodyScroll()
    }
  }, [locked])
}

function useEscape(handler: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handler()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handler, active])
}

type ProductModelModalProps = {
  open: boolean
  modelUrl: string
  productName?: string
  onClose: () => void
  hotspots?: ShopProductHotspot[]
  tintColor?: string | null
}

export default function ProductModelModal({ open, modelUrl, productName, onClose, hotspots, tintColor }: ProductModelModalProps) {
  useScrollLock(open)
  useEscape(onClose, open)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[140] grid place-items-center bg-[var(--shop-text-primary)]/30 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] shadow-[var(--shop-shadow-lg)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--shop-border-light)] px-5 py-3">
              <h3 className="font-[var(--shop-font-heading)] min-w-0 truncate text-lg font-semibold text-[var(--shop-text-primary)]">
                {productName || '3D Preview'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[var(--shop-border-light)] text-[var(--shop-text-muted)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                aria-label="Close 3D preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <ProductModelViewer modelUrl={modelUrl} productName={productName} hotspots={hotspots} tintColor={tintColor} className="h-full w-full aspect-square max-h-[70dvh]" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
