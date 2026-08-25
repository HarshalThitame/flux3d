'use client'

import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-px w-6 bg-[var(--accent-gold)]" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--accent-gold-deep)]">
        {children}
      </span>
    </div>
  )
}

export function FieldRow({
  label,
  value,
  muted = false,
  action,
}: {
  label: string
  value: string
  muted?: boolean
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--line-subtle)] py-5 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--text-faint)]">{label}</div>
        <div
          className={`mt-1.5 break-words text-[15px] leading-7 ${
            muted ? 'text-[var(--text-faint)]' : 'text-[var(--text-primary)]'
          }`}
        >
          {value}
        </div>
      </div>
      {action}
    </div>
  )
}

export function IconButton({
  onClick,
  label,
  disabled = false,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--line-subtle)] bg-white text-[var(--text-muted)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold-deep)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
    </button>
  )
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-faint)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-[var(--line-subtle)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-gold)] focus:ring-4 focus:ring-[var(--accent-gold-glow)]"
      />
    </label>
  )
}

export function SheetActions({
  onCancel,
  saving,
  saveLabel = 'Save',
}: {
  onCancel: () => void
  saving: boolean
  saveLabel?: string
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-[var(--line-subtle)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--fill-brand-soft)]"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[var(--accent-primary)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-primary-deep)] disabled:opacity-60"
      >
        {saving ? 'Saving…' : saveLabel}
      </button>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = 'default',
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  tone?: 'default' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-[#070b1d]/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onCancel}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-[var(--line-subtle)] bg-[var(--surface-elevated)] shadow-[var(--shadow-float)]"
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6">
              <h2 className="[font-family:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                {title}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg p-1 text-[var(--text-faint)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-secondary)]"
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pt-3 text-sm leading-7 text-[var(--text-muted)]">{body}</div>
            <div className="mt-6 flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-[var(--line-subtle)] bg-white px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                  tone === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#25d366] hover:bg-[#1da851]'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function formatDate(value: string | null) {
  if (!value) return 'Recently created'

  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatAddress(address: {
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  pincode: string
}) {
  return [address.addressLine1, address.addressLine2, address.city, address.state, address.pincode]
    .filter(Boolean)
    .join(', ')
}
