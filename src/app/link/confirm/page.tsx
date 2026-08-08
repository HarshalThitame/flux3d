import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getLinkRequestByToken } from '@/lib/account-linking/link-requests'
import { confirmLinkAction } from '../actions'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Confirm Account Link | Flux3D',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function LinkConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <main className="min-h-screen bg-[#f9f7f4] px-4 pb-16 text-[#070b1d] md:px-8">
        <div className="mx-auto mt-24 max-w-md text-center">
          <h1 className="text-2xl font-semibold">Invalid link</h1>
          <p className="mt-2 text-[#6b7280]">No token was provided. Please use the link from your email.</p>
        </div>
      </main>
    )
  }

  // Read-only lookup — the token is only consumed when confirmLinkAction runs.
  const request = await getLinkRequestByToken(token)

  if (!request) {
    return (
      <main className="min-h-screen bg-[#f9f7f4] px-4 pb-16 text-[#070b1d] md:px-8">
        <div className="mx-auto mt-24 max-w-md text-center">
          <h1 className="text-2xl font-semibold">Link expired or already used</h1>
          <p className="mt-2 text-[#6b7280]">This confirmation link is no longer valid. Please request a new one from your profile.</p>
        </div>
      </main>
    )
  }

  const supabase = await createServerSupabaseClient()

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', request.target_user_id)
    .maybeSingle()

  // The number being linked is the one on the (consumed) link request.
  const phone = request.target_phone ?? ''
  const targetName = targetProfile?.full_name ?? 'your account'

  // Preview only counts orders NOT yet owned by the target account that match
  // this phone — i.e. the orders that will actually be imported on confirm.
  // Admin client: the rows belong to other users and are RLS-invisible to the
  // session client, which would silently undercount (0).
  const admin = createAdminClient()
  const last10 = phone.replace(/\D/g, '').slice(-10)
  const { count: shelfCount } = await admin
    .from('shelf_orders')
    .select('id', { count: 'exact', head: true })
    .neq('user_id', request.target_user_id)
    .filter('shipping_address->>phone', 'like', `%${last10}`)
  const { count: customCount } = await admin
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .neq('user_id', request.target_user_id)
    .filter('phone', 'like', `%${last10}`)
  const orderCount = (shelfCount ?? 0) + (customCount ?? 0)

  return (
    <main className="min-h-screen bg-[#f9f7f4] px-4 pb-16 text-[#070b1d] md:px-8">
      <div className="mx-auto mt-16 max-w-md">
        <h1 className="text-2xl font-semibold">Confirm account link</h1>
        <p className="mt-3 text-[#4b5563]">
          This link will connect WhatsApp number <strong>+91 {phone}</strong> to{' '}
          <strong>{targetName}</strong>.
        </p>
        {orderCount && orderCount > 0 && (
          <p className="mt-2 text-[#4b5563]">
            {orderCount} past order{orderCount !== 1 ? 's' : ''} will be imported to your account.
          </p>
        )}
        <form
          action={async (formData: FormData) => {
            'use server'
            const result = await confirmLinkAction(formData)
            if (result?.error) {
              // re-render with error — the page will show the error via revalidation
              console.error('[account-linking] confirm failed:', result.error)
            }
          }}
          className="mt-6"
        >
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full rounded-lg bg-[#070b1d] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[#0d1230]"
          >
            Confirm and link account
          </button>
        </form>
      </div>
    </main>
  )
}