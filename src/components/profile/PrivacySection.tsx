'use client'

import { useState } from 'react'
import { addToast } from '@/lib/toast/store'
import { SectionLabel } from './ui'

export default function PrivacySection() {
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null)

  async function handleExportData() {
    setBusy('export')
    try {
      const response = await fetch('/api/me/export', { method: 'POST' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        addToast({ type: 'error', title: 'Export failed', description: body?.error ?? 'Please try again.' })
        return
      }
      const blob = new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `flux3d-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      addToast({ type: 'success', title: 'Your data export has been downloaded.' })
    } catch {
      addToast({ type: 'error', title: 'Export failed', description: 'Please try again.' })
    } finally {
      setBusy(null)
    }
  }

  async function handleRequestDelete() {
    setBusy('delete')
    try {
      const response = await fetch('/api/me/delete', { method: 'POST' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        addToast({ type: 'error', title: 'Deletion request failed', description: body?.error ?? 'Please try again.' })
        return
      }
      addToast({
        type: 'success',
        title: 'Confirmation email sent',
        description: 'Check your inbox to complete deletion.',
      })
    } catch {
      addToast({ type: 'error', title: 'Deletion request failed', description: 'Please try again.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="px-6 pb-10 pt-8 sm:px-10">
      <SectionLabel>Data &amp; Privacy</SectionLabel>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Export my data</p>
          <p className="mt-0.5 text-[13px] leading-6 text-[var(--text-faint)]">
            Download a copy of your account data (JSON).
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportData}
          disabled={busy !== null}
          className="shrink-0 rounded-xl border border-[var(--line-subtle)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold-deep)] disabled:opacity-60"
        >
          {busy === 'export' ? 'Preparing…' : 'Download'}
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t border-dashed border-[var(--line-soft)] pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-red-600">Delete my account</p>
          <p className="mt-0.5 max-w-md text-[13px] leading-6 text-[var(--text-faint)]">
            Permanent. We email a confirmation link before anything is removed.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRequestDelete}
          disabled={busy !== null}
          className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
        >
          {busy === 'delete' ? 'Requesting…' : 'Request deletion'}
        </button>
      </div>
    </div>
  )
}
