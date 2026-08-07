'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, X } from 'lucide-react'
import { productTemplates, type ProductTemplate } from '@/lib/shop/templates'
import { useProductEditor } from './editor-context'

export function TemplatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { applyTemplate, setToast } = useProductEditor()
  const [applyingId, setApplyingId] = useState<string | null>(null)

  async function handleApply(template: ProductTemplate) {
    setApplyingId(template.id)
    try {
      await applyTemplate(template)
      onClose()
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to apply template.' })
    } finally {
      setApplyingId(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className="relative z-10 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="font-[var(--font-syne)] text-lg font-bold text-[#0F1B3D]">Product Templates</h2>
                <p className="mt-1 text-sm text-[#6F7192]">
                  Start from a pre-configured product with variants, copy, and customization baked in.
                </p>
              </div>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-[#6F7192] hover:bg-gray-50">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 overflow-y-auto p-6 sm:grid-cols-2">
              {productTemplates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  disabled={applyingId !== null}
                  onClick={() => void handleApply(template)}
                  className="group flex flex-col rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-[#6d28d9]/40 hover:bg-[#6d28d9]/5 disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                      {template.emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-[#0F1B3D]">
                        {template.name}
                        {applyingId === template.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#6d28d9]" />}
                      </div>
                      <div className="mt-0.5 text-xs text-[#6F7192]">{template.description}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {template.variants.map((variant) => (
                      <span
                        key={variant.option_name}
                        className="rounded-full bg-[#6d28d9]/10 px-2 py-0.5 text-[10px] font-semibold text-[#6d28d9]"
                      >
                        {variant.option_name}
                      </span>
                    ))}
                    {template.is_customizable && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Personalized
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                    <span className="text-[10px] text-[#6F7192]">Includes copy + tags</span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#6d28d9]">
                      Use template
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
