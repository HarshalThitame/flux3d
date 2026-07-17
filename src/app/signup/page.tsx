import type { Metadata } from 'next'
import Image from 'next/image'
import { getSettings } from '@/lib/settings'
import { redirect } from 'next/navigation'
import { CheckCircle2, CircuitBoard, Layers3, PackageCheck } from 'lucide-react'
import SignupForm from '@/components/auth/SignupForm'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { normalizeNextPath } from '@/lib/auth/redirect'

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings()
  return {
    title: `${settings.businessName} - Create Account`,
    description: settings.businessDescription || 'Create your account to save quotes and manage orders.',
  }
}

const trustTags = ['NDA ready', 'Instant quotes', 'Tracked orders', 'Pan-India delivery']

const passMetrics = [
  { icon: CircuitBoard, label: 'Access', value: 'Full' },
  { icon: Layers3, label: 'Builds', value: 'Unlimited' },
  { icon: PackageCheck, label: 'Files', value: 'Private' },
]

const passChecklist = [
  { step: '01', label: 'File intake', value: 'STL / STEP / 3MF' },
  { step: '02', label: 'Saved quotes', value: 'Auto-stored' },
  { step: '03', label: 'Order tracking', value: 'Real-time' },
  { step: '04', label: 'Repeat builds', value: 'One-click reorder' },
]

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  const nextPath = normalizeNextPath(
    typeof params.next === 'string' ? params.next : undefined
  )
  const auth = await getCurrentUserProfile()

  if (auth) {
    redirect(nextPath)
  }

  return (
    <main className="flex min-h-screen flex-col overflow-x-hidden bg-[#0a0a0a] text-white md:grid md:grid-cols-[55fr_45fr]">
      <section className="relative order-2 flex min-h-[86svh] w-full min-w-0 overflow-hidden bg-[#05060a] px-6 py-12 md:order-1 md:min-h-screen md:px-12 lg:px-16">
        <Image
          src="/printer2-poster.webp"
          alt=""
          fill
          preload
          quality={50}
          sizes="(min-width: 768px) 55vw, 100vw"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-[#05060a]/82" aria-hidden="true" />

        <div className="relative z-10 flex w-full max-w-3xl min-w-0 flex-col justify-center">
          <h1 className="max-w-3xl break-words text-4xl font-black leading-[1.03] tracking-normal !text-white sm:text-5xl lg:text-7xl">
            Start building with <span className="!text-[#67e8f9]">Flux3D</span>.
          </h1>

          <p className="mt-6 max-w-xl text-[15px] leading-7 !text-white/64">
            Upload your files, get instant quotes, track your orders, and manage repeat builds — all from one secure production account.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {trustTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex min-h-8 items-center rounded-lg border border-white/[0.14] bg-white/[0.06] px-3 text-xs font-bold !text-white/76"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-10 max-w-xl rounded-lg border border-white/[0.14] bg-[#0f1013]/95 p-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.11] bg-white/[0.055] px-3 py-3">
              <span className="text-[11px] font-black uppercase leading-none tracking-[0.18em] !text-white/62">
                Production pass
              </span>
              <strong className="rounded-full bg-emerald-400/15 px-2 py-1.5 text-[10px] font-black uppercase leading-none text-emerald-200">
                Free
              </strong>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {passMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="min-w-0 rounded-lg border border-white/[0.11] bg-white/[0.065] p-3 text-white/70"
                >
                  <metric.icon className="h-4 w-4 text-[#67e8f9]" aria-hidden="true" />
                  <span className="mt-2 block text-[9px] font-black uppercase leading-tight tracking-[0.14em] !text-white/48">
                    {metric.label}
                  </span>
                  <strong className="mt-1.5 block text-[12px] font-bold leading-tight text-white">
                    {metric.value}
                  </strong>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-2">
              {passChecklist.map((item) => (
                <div
                  key={item.step}
                  className="grid min-w-0 grid-cols-[auto_28px_minmax(0,1fr)] items-center gap-2 rounded-lg border border-white/[0.11] bg-white/[0.055] p-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#67e8f9]" aria-hidden="true" />
                  <span className="text-[9px] font-black uppercase leading-none tracking-[0.14em] !text-white/48">
                    {item.step}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase leading-tight tracking-[0.12em] !text-white/62">
                      {item.label}
                    </p>
                    <strong className="mt-1 block text-[12px] font-bold leading-tight text-white">
                      {item.value}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="order-1 flex min-h-screen w-full min-w-0 items-center justify-start overflow-x-hidden bg-[#0f0f0f] px-6 py-10 md:order-2 md:justify-center md:px-10">
        <SignupForm nextPath={nextPath} />
      </section>
    </main>
  )
}
