import Image from 'next/image'
import type { ReactNode } from 'react'
import { Clock3, Gauge, Layers3, PackageCheck, ShieldCheck } from 'lucide-react'

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}

const trustItems = [
  {
    icon: ShieldCheck,
    label: 'Private uploads',
    value: 'Project files stay behind your account',
  },
  {
    icon: PackageCheck,
    label: 'Quote to order',
    value: 'Saved estimates, checkout, and tracking',
  },
  {
    icon: Clock3,
    label: 'Faster repeats',
    value: 'Reuse profile details on future builds',
  },
]

const metrics = [
  { label: 'Sessions', value: 'Secure' },
  { label: 'Queue', value: 'Live' },
  { label: 'Files', value: 'Private' },
]

export default function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <section className="premium-auth-shell relative isolate flex min-h-screen items-center overflow-hidden px-4 py-5 sm:px-6 lg:px-10">
      <div className="premium-auth-media" aria-hidden="true" style={{ position: 'absolute' }}>
        <Image
          src="/bg1.webp"
          alt=""
          fill
          priority
          quality={75}
          sizes="100vw"
          className="premium-auth-poster"
        />
      </div>
      <div className="premium-auth-surface" aria-hidden="true" />
      <div className="premium-auth-grid" aria-hidden="true" />
      <div className="premium-auth-lines" aria-hidden="true" />
      <div className="premium-corner-frame premium-auth-frame" aria-hidden="true" />

      <div className="auth-layout-grid relative z-10 mx-auto grid w-full max-w-7xl gap-8 py-2 sm:py-4 md:gap-10 lg:gap-16">
        <div className="auth-copy-column order-2 mx-auto w-full min-w-0 max-w-2xl text-center md:order-1 md:mx-0 md:text-left">
          <div className="mb-5 flex flex-col items-center gap-3 md:items-start">
            <div className="premium-hero-badge">
              <span className="premium-live-dot" />
              {eyebrow}
            </div>
            <p className="flex max-w-full flex-wrap items-center justify-center gap-2 text-center text-[10px] font-semibold uppercase leading-5 tracking-[0.14em] text-gray-500 sm:text-xs sm:tracking-[0.18em] md:justify-start md:text-left">
              <Gauge className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
              <span className="min-w-0">Flux3D secure production portal</span>
            </p>
          </div>

          <h1 className="premium-auth-title mx-auto w-full max-w-[19rem] text-3xl font-black leading-tight sm:max-w-3xl sm:text-5xl sm:leading-[0.98] md:mx-0 md:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-5 w-full max-w-[20rem] text-base leading-8 text-gray-600 sm:max-w-xl md:mx-0">
            {description}
          </p>

          <div className="mt-6 hidden flex-wrap justify-center gap-2 sm:flex md:justify-start">
            {['NDA ready', 'Saved quotes', 'Tracked orders', 'Pan-India delivery'].map((chip) => (
              <span key={chip} className="premium-chip">
                {chip}
              </span>
            ))}
          </div>

          <div className="premium-atelier-strip auth-atelier-strip !hidden sm:!grid">
            {metrics.map((metric) => (
              <div key={metric.label} className="premium-atelier-metric">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>

          <div className="premium-auth-command mt-7 hidden lg:block">
            <div className="premium-console-header">
              <span>Account Command</span>
              <strong>READY</strong>
            </div>
            <div className="premium-auth-command-body">
              <div className="premium-auth-command-visual" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                  Production pass
                </p>
                <p className="mt-1 text-xl font-black leading-tight text-[#070b1d]">
                  Secure access for quotes, files, and orders
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  One workspace for upload history, checkout details, and repeat builds.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 hidden gap-3 lg:grid">
            {trustItems.map(({ icon: Icon, label, value }) => (
              <div key={label} className="premium-auth-feature">
                <span className="premium-auth-feature-icon">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-black text-[#070b1d]">{label}</div>
                  <p className="mt-1 text-xs leading-5 text-gray-500">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 hidden items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400 lg:flex lg:justify-start">
            <Layers3 className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
            Built for repeat production, prototyping, and secure file handling
          </p>
        </div>

        <div className="auth-form-column order-1 w-full min-w-0 max-w-[520px] justify-self-center md:order-2 md:justify-self-end">
          <div className="premium-machine-panel auth-form-panel w-full p-5">
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
