'use client'

import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  linkWhatsappAction,
  verifyOtpAction,
  unlinkWhatsAppAction,
  changeWhatsAppAction,
} from '@/app/link/actions'
import { addToast } from '@/lib/toast/store'
import type { ProfileDetailsData } from './types'
import { ConfirmDialog, SectionLabel } from './ui'

type StatusTone = 'linked' | 'pending' | 'unlinked'

const inputClasses =
  'w-full rounded-xl border border-[var(--line-subtle)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-gold)] focus:ring-4 focus:ring-[var(--accent-gold-glow)]'

function StatusDot({ tone }: { tone: StatusTone }) {
  const color = tone === 'linked' ? 'bg-[#25d366]' : tone === 'pending' ? 'bg-amber-500' : 'bg-[var(--line-soft)]'
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className={`absolute inline-flex h-full w-full rounded-full opacity-40 ${color}`} />
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  )
}

export default function WhatsappSection({ profile }: { profile: ProfileDetailsData }) {
  const [phoneDraft, setPhoneDraft] = useState('')
  const [optIn, setOptIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [otpSubmitting, setOtpSubmitting] = useState(false)
  const [linkedPhone, setLinkedPhone] = useState(
    profile.phoneVerified ? profile.phoneCanonical ?? profile.phone : null
  )
  const [pendingPhone, setPendingPhone] = useState<string | null>(profile.pendingLinkPhone)
  const [showChangeForm, setShowChangeForm] = useState(false)
  const [changeSubmitting, setChangeSubmitting] = useState(false)
  const [linkFormOpen, setLinkFormOpen] = useState(false)
  const [showLinkConfirm, setShowLinkConfirm] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)
  const [showChangeConfirm, setShowChangeConfirm] = useState(false)
  const linkFormRef = useRef<HTMLFormElement>(null)
  const unlinkFormRef = useRef<HTMLFormElement>(null)
  const changeFormRef = useRef<HTMLFormElement>(null)

  const tone: StatusTone = pendingPhone
    ? 'pending'
    : linkedPhone
      ? 'linked'
      : 'unlinked'
  const statusText = pendingPhone
    ? `Verification pending · +91 ${pendingPhone}`
    : linkedPhone
      ? `Connected · +91 ${linkedPhone}`
      : 'Not linked'

  const showInlineForm =
    otpSent || showChangeForm || (!pendingPhone && !linkedPhone && linkFormOpen)

  return (
    <div className="px-6 py-8 sm:px-10">
      <SectionLabel>WhatsApp</SectionLabel>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line-subtle)] bg-white px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <StatusDot tone={tone} />
          <span className="truncate text-sm font-medium text-[var(--text-primary)]">{statusText}</span>
        </div>

        {!otpSent && !showChangeForm && (
          <div className="flex items-center gap-2">
            {pendingPhone && (
              <button
                type="button"
                onClick={() => setPendingPhone(null)}
                className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)]"
              >
                Dismiss
              </button>
            )}
            {linkedPhone && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeForm(true)
                    setPhoneDraft('')
                    setOptIn(false)
                  }}
                  className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-[var(--accent-primary)] transition hover:bg-[var(--fill-brand-soft)]"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={() => setShowUnlinkConfirm(true)}
                  disabled={submitting}
                  className="rounded-lg px-3 py-1.5 text-[13px] font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  Unlink
                </button>
              </>
            )}
            {!linkedPhone && !pendingPhone && !linkFormOpen && (
              <button
                type="button"
                onClick={() => {
                  setLinkFormOpen(true)
                  setOptIn(false)
                }}
                disabled={submitting}
                className="rounded-lg bg-[#25d366] px-3.5 py-1.5 text-[13px] font-semibold text-white transition hover:bg-[#1da851] disabled:opacity-50"
              >
                Link number
              </button>
            )}
          </div>
        )}

        <form
          ref={unlinkFormRef}
          hidden
          action={async (formData: FormData) => {
            setSubmitting(true)
            const result = await unlinkWhatsAppAction(formData)
            setSubmitting(false)
            if (result?.error) {
              addToast({ type: 'error', title: 'Could not unlink', description: result.error })
            } else if (result?.success) {
              addToast({
                type: 'success',
                title: result.message ?? 'WhatsApp unlinked successfully.',
              })
              setLinkedPhone(null)
            }
          }}
        />
      </div>

      <AnimatePresence initial={false}>
        {(showInlineForm || pendingPhone) && (
          <motion.div
            key="whatsapp-forms"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4">
              {pendingPhone && !showChangeForm && !otpSent && (
                <p className="rounded-2xl bg-[var(--fill-gold-soft)] px-4 py-3.5 text-sm leading-7 text-[var(--accent-gold-deep)]">
                  A confirmation link was sent to your email. Click it to complete linking your WhatsApp number.
                  Past orders placed under this number will be imported once you confirm. The link expires in 15
                  minutes.
                </p>
              )}

              {otpSent && (
                <form
                  action={async (formData: FormData) => {
                    setOtpSubmitting(true)
                    const result = await verifyOtpAction(formData)
                    setOtpSubmitting(false)
                    if (result?.error) {
                      addToast({ type: 'error', title: 'Verification failed', description: result.error })
                    } else if (result?.success) {
                      addToast({
                        type: 'success',
                        title: result.message ?? 'WhatsApp number linked successfully.',
                      })
                      setLinkedPhone(phoneDraft || null)
                      setOtpSent(false)
                      setLinkFormOpen(false)
                      setOtpCode('')
                      setPendingPhone(null)
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <input type="hidden" name="phone" value={phoneDraft} />
                  <label className="text-[13px] font-medium text-[var(--text-secondary)]">Verification code</label>
                  <input
                    type="text"
                    name="otp"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    placeholder="123456"
                    className={inputClasses}
                    required
                  />
                  <button
                    type="submit"
                    disabled={otpSubmitting}
                    className="rounded-xl bg-[#25d366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1da851] disabled:opacity-50"
                  >
                    {otpSubmitting ? 'Verifying…' : 'Verify and link account'}
                  </button>
                </form>
              )}

              {showChangeForm && !otpSent && (
                <form
                  ref={changeFormRef}
                  action={async (formData: FormData) => {
                    setChangeSubmitting(true)
                    const result = await changeWhatsAppAction(formData)
                    setChangeSubmitting(false)
                    if (result?.error) {
                      addToast({ type: 'error', title: 'Could not change number', description: result.error })
                    } else if (result?.success) {
                      addToast({ type: 'success', title: result.message ?? 'Check your email.' })
                      if (result.message?.includes('verification code')) {
                        setOtpSent(true)
                        setShowChangeForm(false)
                      } else {
                        setPendingPhone(phoneDraft || null)
                        setShowChangeForm(false)
                        setPhoneDraft('')
                      }
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <label className="text-[13px] font-medium text-[var(--text-secondary)]">
                    New WhatsApp number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputClasses}
                    required
                  />
                  <label className="flex items-start gap-2.5 text-[13px] leading-6 text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      name="whatsapp_opt_in"
                      checked={optIn}
                      onChange={(e) => setOptIn(e.target.checked)}
                      className="mt-1 accent-[#25d366]"
                    />
                    I agree to receive a verification message from Flux3D on WhatsApp.
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowChangeConfirm(true)}
                      disabled={changeSubmitting || !optIn}
                      className="rounded-xl bg-[#25d366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {changeSubmitting ? 'Sending…' : 'Send confirmation link'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowChangeForm(false)}
                      disabled={changeSubmitting}
                      className="rounded-xl border border-[var(--line-subtle)] bg-white px-4 py-3 text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--surface-soft)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {!pendingPhone && !linkedPhone && linkFormOpen && !otpSent && !showChangeForm && (
                <form
                  ref={linkFormRef}
                  action={async (formData: FormData) => {
                    setSubmitting(true)
                    const result = await linkWhatsappAction(formData)
                    setSubmitting(false)
                    if (result.error) {
                      addToast({ type: 'error', title: 'Could not send', description: result.error })
                    } else if (result.success) {
                      addToast({ type: 'success', title: result.message ?? 'Check your email.' })
                      if (result.message?.includes('verification code')) {
                        setOtpSent(true)
                      } else {
                        setPendingPhone(phoneDraft || null)
                        setPhoneDraft('')
                        setLinkFormOpen(false)
                      }
                    }
                  }}
                  className="flex flex-col gap-3"
                >
                  <label className="text-[13px] font-medium text-[var(--text-secondary)]">
                    WhatsApp phone number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={phoneDraft}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="+91 98765 43210"
                    className={inputClasses}
                    required
                  />
                  <label className="flex items-start gap-2.5 text-[13px] leading-6 text-[var(--text-muted)]">
                    <input
                      type="checkbox"
                      name="whatsapp_opt_in"
                      checked={optIn}
                      onChange={(e) => setOptIn(e.target.checked)}
                      className="mt-1 accent-[#25d366]"
                    />
                    I agree that Flux3D may send a verification message to this WhatsApp number and process the
                    linked order data for account linking.
                  </label>
                  <p className="text-xs leading-5 text-[var(--text-faint)]">
                    Your consent is recorded with a timestamp (DPDP Act, 2023) and can be withdrawn at any time
                    from the dashboard or by contacting support.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowLinkConfirm(true)}
                    disabled={submitting || !optIn}
                    className="rounded-xl bg-[#25d366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1da851] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? 'Sending…' : 'Send confirmation link'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={showUnlinkConfirm}
        title="Unlink WhatsApp number?"
        tone="danger"
        confirmLabel="Unlink"
        onConfirm={() => {
          setShowUnlinkConfirm(false)
          unlinkFormRef.current?.requestSubmit()
        }}
        onCancel={() => setShowUnlinkConfirm(false)}
        body={
          <>
            This removes <strong>+91 {linkedPhone}</strong> from your account. WhatsApp orders previously imported
            to your 3D Shop orders will be removed from your account. You can link the number again anytime.
          </>
        }
      />

      <ConfirmDialog
        open={showLinkConfirm}
        title="Link WhatsApp number?"
        confirmLabel="Yes, send confirmation link"
        onConfirm={() => {
          setShowLinkConfirm(false)
          linkFormRef.current?.requestSubmit()
        }}
        onCancel={() => setShowLinkConfirm(false)}
        body={
          <>
            This connects <strong>+91 {phoneDraft}</strong> to your account. We&apos;ll send a one-time code on
            WhatsApp or a confirmation link to your email to verify ownership. Past orders placed under this number
            are imported once confirmed — your consent is recorded (DPDP Act, 2023).
          </>
        }
      />

      <ConfirmDialog
        open={showChangeConfirm}
        title="Change WhatsApp number?"
        confirmLabel="Yes, send confirmation link"
        onConfirm={() => {
          setShowChangeConfirm(false)
          changeFormRef.current?.requestSubmit()
        }}
        onCancel={() => setShowChangeConfirm(false)}
        body={
          <>
            This connects <strong>+91 {phoneDraft}</strong> to your account. We&apos;ll send a one-time code on
            WhatsApp or a confirmation link to your email to verify ownership. Past orders placed under this number
            are imported once confirmed — your consent is recorded (DPDP Act, 2023).
          </>
        }
      />
    </div>
  )
}
