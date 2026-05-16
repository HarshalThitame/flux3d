'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, BookmarkPlus, Layers3, ShieldCheck } from 'lucide-react'
import { layerHeightOptions } from '@/lib/quote/materials'
import { postProcessingOptions } from '@/lib/quote/pricing-engine'
import type { PostProcessingLevel } from '@/lib/quote/types'

type SettingsPanelProps =
  | {
      variant: 'settings'
      infill: number
      layerHeight: number
      quantity: number
      postProcessingLevel: PostProcessingLevel
      postProcessingChargeEstimate?: (level: PostProcessingLevel) => number
      onInfillChange: (value: number) => void
      onLayerHeightChange: (value: number) => void
      onQuantityChange: (value: number) => void
      onPostProcessingChange: (value: PostProcessingLevel) => void
    }
  | {
      variant: 'account'
      isSignedIn: boolean
      userName?: string
      userEmail?: string
      isSaving: boolean
      canSave: boolean
      onSaveQuote: () => void
    }

function PanelShell({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <motion.section
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      className="flex h-full flex-col rounded-[24px] border border-[#7C5CFF]/10 bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] transition-all duration-300 hover:border-[#7C5CFF]/20 hover:shadow-[var(--shadow-md)]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
        </div>
        <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[var(--brand-faint)] p-2 text-[var(--brand-primary)]">
          {icon}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </motion.section>
  )
}

export default function SettingsPanel(props: SettingsPanelProps) {
  if (props.variant === 'settings') {
    return (
      <PanelShell
        icon={<Layers3 className="h-4 w-4" />}
        title="Print Settings"
        description="Dial in the quality, strength, and scale so the quote reflects exactly how you want the part produced."
      >
        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>Infill</span>
              <span>{props.infill}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={props.infill}
              onChange={(event) => props.onInfillChange(Number(event.target.value))}
              className="w-full accent-[#7C5CFF]"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-sm text-[var(--text-secondary)]">
              <span>Quantity</span>
              <span>{props.quantity} pcs</span>
            </div>
            <input
              type="number"
              min={1}
              max={99}
              step={1}
              value={props.quantity}
              onChange={(event) => props.onQuantityChange(Number(event.target.value))}
              className="w-full rounded-[16px] border border-[#7C5CFF]/10 bg-white px-3 py-3 text-sm text-[var(--text-primary)] outline-none"
            />
          </div>

          <div>
            <div className="mb-2 text-sm text-[var(--text-secondary)]">Post-processing</div>
            <div className="grid gap-2">
              {postProcessingOptions.map((option) => {
                const active = option.value === props.postProcessingLevel

                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => props.onPostProcessingChange(option.value)}
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    className={`rounded-[16px] border px-3 py-3 text-left transition-all ${
                      active
                        ? 'border-[#7C5CFF]/35 bg-[var(--brand-faint)]'
                        : 'border-[#7C5CFF]/10 bg-white hover:border-[#7C5CFF]/10 hover:bg-[var(--bg-soft)]'
                    }`}
                  >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-[var(--text-primary)]">{option.label}</div>
                        <div className="text-[10px] uppercase tracking-[0.18em] text-[#7C5CFF]">
                          {props.postProcessingChargeEstimate
                            ? `₹${props.postProcessingChargeEstimate(option.value).toFixed(2)}`
                            : '—'}
                        </div>
                      </div>
                    <div className="mt-1 text-xs leading-5 text-[#8d97b8]">{option.description}</div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm text-[var(--text-secondary)]">Layer Height</div>
            <div className="grid gap-2">
              {layerHeightOptions.map((option) => {
                const active = option.value === props.layerHeight

                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => props.onLayerHeightChange(option.value)}
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.985 }}
                    className={`rounded-[16px] border px-3 py-3 text-left transition-all ${
                      active
                        ? 'border-[#7C5CFF]/35 bg-[var(--brand-faint)]'
                        : 'border-[#7C5CFF]/10 bg-white hover:border-[#7C5CFF]/10 hover:bg-[var(--bg-soft)]'
                    }`}
                  >
                    <div className="text-sm font-medium text-[var(--text-primary)]">{option.label}</div>
                    <div className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{option.description}</div>
                  </motion.button>
                )
              })}
            </div>
          </div>
        </div>
      </PanelShell>
    )
  }

  return (
    <PanelShell
      icon={<BookmarkPlus className="h-4 w-4" />}
      title="Saved to Your Account"
      description="Keep this quote ready for later so moving from idea to order feels seamless."
    >
      {props.isSignedIn ? (
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="rounded-[18px] border border-emerald-400/15 bg-emerald-400/10 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{props.userName ?? 'Signed in'}</div>
                <div className="mt-1 text-xs text-emerald-700">{props.userEmail}</div>
              </div>
            </div>
          </div>

            <div className="rounded-[18px] border border-[#7C5CFF]/10 bg-[var(--bg-soft)] p-4 text-sm leading-6 text-[var(--text-secondary)]">
              Save your file, settings, and estimate in one place so you can revisit, compare, and place your order faster.
            </div>

          <motion.button
            type="button"
            onClick={props.onSaveQuote}
            disabled={!props.canSave || props.isSaving}
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#7C5CFF] px-4 py-3 text-sm font-medium text-white transition-all hover:translate-y-[-1px] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {props.isSaving ? 'Saving Quote...' : 'Save Quote'}
          </motion.button>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between gap-4">
            <div className="rounded-[18px] border border-sky-400/20 bg-sky-50 p-4 text-sm leading-6 text-sky-800">
              You can explore the quote instantly without an account, but login unlocks saved quotes, synced uploads, and a smoother buying journey.
            </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/login?next=%2Finstant-quote"
              className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-[#7C5CFF]/10 bg-white px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-soft)]"
            >
              Log In
            </Link>
            <Link
              href="/signup?next=%2Finstant-quote"
              className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-[#7C5CFF] px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-95"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </PanelShell>
  )
}
