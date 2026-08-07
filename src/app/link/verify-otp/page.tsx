import { verifyOtpAction } from '@/app/link/actions'

export const dynamic = 'force-dynamic'

export default async function VerifyOtpPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string }>
}) {
  const params = await searchParams
  return (
    <main className="min-h-screen bg-[#f9f7f4] px-4 pb-16 text-[#070b1d] md:px-8">
      <div className="mx-auto mt-16 max-w-md">
        <h1 className="text-2xl font-semibold">Verify WhatsApp OTP</h1>
        <p className="mt-3 text-[#4b5563]">
          Enter the verification code we sent to your WhatsApp number to complete the account link.
        </p>
        <form
          action={async (formData: FormData) => {
            'use server'
            const result = await verifyOtpAction(formData)
            if (result?.error) {
              console.error('[account-linking] OTP verification failed:', result.error)
            }
          }}
          className="mt-6 flex flex-col gap-4"
        >
          <input type="hidden" name="phone" value={params.phone ?? ''} />
          <div>
            <label className="block text-sm font-medium text-[#4b4b4b]">Verification Code</label>
            <input
              type="text"
              name="otp"
              maxLength={6}
              placeholder="123456"
              className="mt-2 w-full rounded-xl border border-[#e8e4df] bg-white px-3.5 py-3 text-sm text-[#070b1d] outline-none transition focus:border-[#c8bfff] focus:ring-4 focus:ring-[#ebe5ff]"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[#25d366] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#1da851]"
          >
            Verify and Link Account
          </button>
        </form>
      </div>
    </main>
  )
}
