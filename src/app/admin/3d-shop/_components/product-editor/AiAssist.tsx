'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { useProductEditor } from './editor-context'
import type { AiGenerationKind, AiTone } from '@/lib/shop/ai'

const TONES: { value: AiTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'playful', label: 'Playful' },
  { value: 'technical', label: 'Technical' },
  { value: 'minimal', label: 'Minimal' },
]

export function AiToneSelector({ id }: { id?: string }) {
  const { aiTone, setAiTone } = useProductEditor()
  return (
    <div className="flex items-center gap-1 rounded-xl border border-[#6d28d9]/10 bg-gray-50 p-1">
      {TONES.map((tone) => (
        <button
          key={tone.value}
          id={id ? `${id}-${tone.value}` : undefined}
          type="button"
          onClick={() => setAiTone(tone.value)}
          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
            aiTone === tone.value ? 'bg-[#6d28d9] text-white' : 'text-[#6F7192] hover:bg-white'
          }`}
        >
          {tone.label}
        </button>
      ))}
    </div>
  )
}

export function AiAssistButton({
  kind,
  label = 'Write with AI',
  compact = false,
  title,
}: {
  kind: AiGenerationKind
  label?: string
  compact?: boolean
  title?: string
}) {
  const { generateAi, aiBusy } = useProductEditor()
  const busy = aiBusy[kind]

  return (
    <button
      type="button"
      onClick={() => void generateAi(kind)}
      disabled={busy}
      title={title ?? `Generate ${label} with AI`}
      className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        compact
          ? 'border border-[#6d28d9]/20 bg-white px-2 py-1 text-[11px] text-[#6d28d9] hover:bg-[#6d28d9]/5'
          : 'border border-[#6d28d9]/20 bg-white px-3 py-1.5 text-xs text-[#6d28d9] hover:bg-[#6d28d9]/5'
      }`}
    >
      {busy ? <Loader2 className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} animate-spin`} /> : <Sparkles className={`${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}`} />}
      {!compact && label}
    </button>
  )
}

export function AiGenerateAllButton() {
  const { generateAi, aiBusy } = useProductEditor()
  const busy = aiBusy.all

  return (
    <button
      type="button"
      onClick={() => void generateAi('all')}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6d28d9] to-[#7c3aed] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-[#5b21b6] hover:to-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {busy ? 'Writing your listing...' : 'Magic Write — Generate Full Listing'}
    </button>
  )
}
