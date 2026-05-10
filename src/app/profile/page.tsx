import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { requireUser } from '@/lib/auth/server'
import { getSettings } from '@/lib/settings'
import {
  isMissingSupabaseTableError,
  QUOTES_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export default async function ProfilePage() {
  const auth = await requireUser('/profile')
  const supabase = await createServerSupabaseClient()
  const settings = await getSettings()
  const { count, error } = await supabase
    .from('quotes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
  const quotesTableUnavailable = isMissingSupabaseTableError(error, 'quotes')

  if (error && !quotesTableUnavailable) {
    throw new Error(error.message)
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] px-4 pb-16 pt-28 text-[#0F1B3D] md:px-8">
      <Navbar transparent />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[32px] border border-[#7C5CFF]/10 bg-[rgba(255,255,255,0.96)] p-6 backdrop-blur-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#7C5CFF]">
            Account Profile
          </div>
          <h1 className="mt-5 font-[var(--font-syne)] text-4xl font-extrabold text-[#0F1B3D]">
            {auth.profile.name}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ea6c4]">
            Your secure {settings.businessName} account stores quote history, uploaded model references, and authentication settings.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="rounded-[28px] border border-[#7C5CFF]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Profile details</div>
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Name</div>
                <div className="mt-2 text-sm text-[#0F1B3D]">{auth.profile.name}</div>
              </div>
              <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Email</div>
                <div className="mt-2 text-sm text-[#0F1B3D]">{auth.profile.email}</div>
              </div>
              <div className="rounded-2xl border border-[#7C5CFF]/10 bg-[#FFFFFF] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#6F7192]">Member since</div>
                <div className="mt-2 text-sm text-[#0F1B3D]">
                  {auth.profile.createdAt
                    ? new Date(auth.profile.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Recently created'}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-[#7C5CFF]/10 bg-white/[0.03] p-6 backdrop-blur-xl">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">Usage snapshot</div>
              <div className="mt-4 font-[var(--font-syne)] text-4xl font-extrabold text-[#0F1B3D]">
                {count ?? 0}
              </div>
              <div className="mt-2 text-sm text-[#9ea6c4]">
                {quotesTableUnavailable
                  ? QUOTES_TABLE_UNAVAILABLE_MESSAGE
                  : 'Saved quotes linked to this account'}
              </div>
            </div>

            <div className="rounded-[28px] border border-[#7C5CFF]/20 bg-[#7C5CFF]/8 p-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#7C5CFF]">Security</div>
              <p className="mt-3 text-sm leading-7 text-[#ffe0d0]">
                Need to rotate credentials or test recovery? Use the password reset flow from the login screen.
              </p>
              <Link
                href="/saved-quotes"
                className="mt-5 inline-flex rounded-2xl bg-white px-4 py-3 text-sm font-medium text-[#FFFFFF]"
              >
                Review saved quotes
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
