import { createServerSupabaseClient } from '@/lib/supabase/server'
import { consumeLinkRequestByToken } from '@/lib/account-linking/link-requests'
import { confirmLinkAction } from '../actions'

export const dynamic = 'force-dynamic'

export default async function LinkConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <main className="min-h-screen bg-[#f9f7f4] px-4 pb-16 text-[#1a1a1a] md:px-8">
        <div className="mx-auto mt-24 max-w-md text-center">
          <h1 className="text-2xl font-semibold">Invalid link</h1>
          <p className="mt-2 text-[#6b7280]">No token was provided. Please use the link from your email.</p>
        </div>
      </main>
    )
  }

  const request = await consumeLinkRequestByToken(token)

  if (!request) {
    return (
      <main className="min-h-screen bg-[#f9f7f4] px-4 pb-16 text-[#1a1a1a] md:px-8">
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
    .select('id, phone, phone_number, full_name')
    .eq('id', request.target_user_id)
    .maybeSingle()

  const phone = targetProfile?.phone ?? targetProfile?.phone_number ?? ''
  const targetName = targetProfile?.full_name ?? 'your account'

  const { count: orderCount } = await supabase
    .from('shelf_orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', request.target_user_id)

  return (
    <main className="min-h-screen bg-[#f9f7f4] px-4 pb-16 text-[#1a1a1a] md:px-8">
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
            className="w-full rounded-lg bg-[#1a1a1a] px-4 py-3 text-center text-sm font-medium text-white hover:bg-[#333]"
          >
            Confirm and link account
          </button>
        </form>
      </div>
    </main>
  )
}