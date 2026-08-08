import Link from 'next/link'
import type { Metadata } from 'next'
import DeleteSavedQuoteButton from '@/app/saved-quotes/DeleteSavedQuoteButton'
import { deleteSavedQuoteAction } from '@/app/saved-quotes/actions'
import Navbar from '@/components/Navbar'
import { requireUser } from '@/lib/auth/server'
import {
  isMissingSupabaseTableError,
  QUOTES_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type SavedQuoteRow = {
  id: number
  quote_id: string | null
  file_path: string | null
  estimate: {
    total?: number
    estimatedHours?: number
    dimensions?: { x?: number; y?: number; z?: number }
  } | null
  config: {
    materialId?: string
    layerHeight?: number
    infill?: number
  } | null
  created_at: string
}

export const metadata: Metadata = {
  title: 'Saved Quotes | Flux3D',
  description: 'Review your previous pricing snapshots and saved 3D printing quotes.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function SavedQuotesPage() {
  const auth = await requireUser('/saved-quotes')
  const supabase = await createServerSupabaseClient()
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, quote_id, file_path, estimate, config, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  const quotesTableUnavailable = isMissingSupabaseTableError(error, 'quotes')

  if (error && !quotesTableUnavailable) {
    throw new Error(error.message)
  }

  const rows = (quotes ?? []) as SavedQuoteRow[]

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#070b1d]">
      <Navbar transparent />
      <main className="px-4 pb-16 pt-8 md:px-8 md:pt-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[32px] border border-[#6d28d9]/10 bg-[rgba(255,255,255,0.96)] p-6 backdrop-blur-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#6d28d9]">
            Quote History
          </div>
          <h1 className="mt-5 font-[var(--font-syne)] text-4xl font-extrabold text-[#070b1d]">
            Saved Quotes
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ea6c4]">
            Review your previous pricing snapshots, uploaded file references, and print settings from one authenticated workspace.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-[28px] border border-[#6d28d9]/10 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
            <div className="text-xl font-medium text-[#070b1d]">
              {quotesTableUnavailable ? 'Saved quotes unavailable' : 'No quotes saved yet.'}
            </div>
            <p className="mt-3 text-sm leading-7 text-[#9ea6c4]">
              {quotesTableUnavailable
                ? QUOTES_TABLE_UNAVAILABLE_MESSAGE
                : 'Start with the protected quote workspace and your first saved quote will appear here.'}
            </p>
            <Link
              href="/instant-quote"
              className="mt-6 inline-flex rounded-2xl bg-[#6d28d9] px-5 py-3 text-sm font-medium text-white"
            >
              Create a quote
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {rows.map((quote) => (
              <div
                key={quote.id}
                className="rounded-[28px] border border-[#6d28d9]/10 bg-white/[0.03] p-6 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">
                      Quote ID
                    </div>
                    <div className="mt-2 font-[var(--font-syne)] text-2xl font-bold text-[#070b1d]">
                      {quote.quote_id ?? `Quote ${quote.id}`}
                    </div>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
                    {new Date(quote.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">
                      Estimated total
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[#070b1d]">
                      {typeof quote.estimate?.total === 'number'
                        ? `₹${quote.estimate.total.toFixed(0)}`
                        : 'Unavailable'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">
                      Machine hours
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[#070b1d]">
                      {typeof quote.estimate?.estimatedHours === 'number'
                        ? quote.estimate.estimatedHours.toFixed(1)
                        : '—'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Material</div>
                    <div className="mt-2 text-sm text-[#070b1d]">
                      {quote.config?.materialId ?? 'Unknown'}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Storage path</div>
                    <div className="mt-2 break-all text-sm text-[#070b1d]">
                      {quote.file_path ?? 'No uploaded file path'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[#6d28d9]/10 bg-[#FFFFFF] px-4 py-4">
                  <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Dimensions</div>
                  <div className="mt-2 text-sm text-[#070b1d]">
                    {quote.estimate?.dimensions
                      ? `${quote.estimate.dimensions.x ?? 0} × ${quote.estimate.dimensions.y ?? 0} × ${quote.estimate.dimensions.z ?? 0} mm`
                      : 'Unavailable'}
                  </div>
                </div>

                <form
                  id={`delete-saved-quote-${quote.id}`}
                  action={deleteSavedQuoteAction}
                  className="mt-5 flex justify-end"
                >
                  <input type="hidden" name="quoteId" value={quote.id} />
                  <DeleteSavedQuoteButton quoteLabel={quote.quote_id ?? `Quote ${quote.id}`} />
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </div>
  )
}
