import Link from 'next/link'
import { getSettings } from '@/lib/settings'

type AuthShellProps = {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}

export default async function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  const settings = await getSettings()
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFFFFF] px-4 py-24 text-[#0F1B3D]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(124, 92, 255,0.22),transparent_35%),radial-gradient(circle_at_80%_20%,rgba(61,115,255,0.16),transparent_28%),linear-gradient(180deg,#FFFFFF_0%,#FFFFFF_100%)]" />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(rgba(124, 92, 255,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 92, 255,0.25) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 82%)',
        }}
      />

      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_480px] lg:items-center">
        <div className="max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[#9fa8c6]"
          >
            {settings.businessName || 'Flux3D'} Auth Layer
          </Link>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-[#A78BFA]">
            {eyebrow}
          </div>
          <h1 className="mt-6 font-[var(--font-syne)] text-[clamp(2.6rem,5vw,4.6rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-[#0F1B3D]">
            {title}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-[#9ea6c4]">{description}</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ['Secure sessions', 'Supabase SSR cookies'],
              ['Protected quotes', 'Uploads and saved pricing'],
              ['Fast access', 'Google or email login'],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-[#7C5CFF]/10 bg-white/[0.03] px-4 py-4 backdrop-blur-xl"
              >
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">{label}</div>
                <div className="mt-2 text-sm font-medium text-[#0F1B3D]">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-[#7C5CFF]/10 bg-[rgba(255,255,255,0.96)] p-5 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-7">
          {children}
        </div>
      </div>
    </div>
  )
}
