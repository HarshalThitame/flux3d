'use client'

import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'

type FormState = {
  name: string
  email: string
  phone: string
  subject: string
  message: string
  honey: string
}

const initialState: FormState = {
  name: '',
  email: '',
  phone: '',
  subject: '',
  message: '',
  honey: '',
}

export default function ContactForm() {
  const [form, setForm] = useState<FormState>(initialState)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setStatus(null)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const body = await response.json().catch(() => ({})) as { success?: boolean; message?: string; error?: string }

      if (!response.ok || !body.success) {
        setStatus({ type: 'error', message: body.error || 'We could not send your message right now.' })
        return
      }

      setForm(initialState)
      setStatus({ type: 'success', message: body.message || 'Your message was received.' })
    } catch {
      setStatus({ type: 'error', message: 'We could not send your message right now.' })
    } finally {
      setSubmitting(false)
    }
  }

  const fields = [
    { key: 'name', label: 'Full name', type: 'text', required: true },
    { key: 'email', label: 'Email address', type: 'email', required: true },
    { key: 'phone', label: 'Phone number', type: 'tel', required: false },
    { key: 'subject', label: 'Subject', type: 'text', required: true },
  ] as const

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-[#6d28d9]/10 bg-white p-6 shadow-sm md:p-8">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-10000px] h-px w-px opacity-0"
        value={form.honey}
        onChange={(event) => setForm((current) => ({ ...current, honey: event.target.value }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className={field.key === 'subject' ? 'sm:col-span-2' : ''}>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6F7192]">{field.label}</span>
            <input
              required={field.required}
              type={field.type}
              value={form[field.key]}
              onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-[#e4dff5] bg-white px-4 text-sm text-[#070b1d] outline-none transition focus:border-[#6d28d9]"
            />
          </label>
        ))}

        <label className="sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6F7192]">Message</span>
          <textarea
            required
            rows={6}
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            className="mt-2 w-full rounded-xl border border-[#e4dff5] bg-white px-4 py-3 text-sm text-[#070b1d] outline-none transition focus:border-[#6d28d9]"
            placeholder="Tell us what you want to print or manufacture."
          />
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-[#6d28d9]/10 bg-[#faf9f7] p-4 text-sm leading-7 text-[#6F7192]">
        Messages are reviewed by Flux 3D using the public contact workflow. Please do not include payment card data, UPI PINs, passwords, or other sensitive information.
        <div className="mt-2">
          Read our <a href="/privacy-policy" className="font-semibold text-[#6d28d9] hover:underline">Privacy Policy</a> for details on how contact submissions are handled.
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3">
        <input
          type="checkbox"
          required
          className="mt-1 h-4 w-4 rounded border-[#c6b8ea] text-[#6d28d9] focus:ring-[#6d28d9]"
        />
        <p className="text-sm leading-7 text-[#6F7192]">
          I agree that Flux 3D may use my information to respond to this request.
        </p>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-5 text-sm font-semibold text-white transition hover:bg-[#5b21b6] disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? 'Sending...' : 'Send Message'}
      </button>

      <div aria-live="polite" className="mt-4 min-h-6 text-sm">
        {status && (
          <p className={status.type === 'success' ? 'text-emerald-700' : 'text-rose-700'}>
            {status.message}
          </p>
        )}
      </div>
    </form>
  )
}
