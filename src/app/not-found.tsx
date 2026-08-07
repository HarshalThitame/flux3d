import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f9f7f4] px-6">
      <div className="animate-orb-1 pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#6d28d9]/10 blur-3xl" />
      <div className="animate-orb-2 pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#d4af37]/10 blur-3xl" />
      <div className="animate-orb-3 pointer-events-none absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-[#a855f7]/10 blur-3xl" />

      <div className="animate-fadeUp relative w-full max-w-md text-center">
        <div className="liquid-morph-wordmark text-2xl font-bold tracking-[0.28em] sm:text-3xl">FLUX3D</div>

        <div className="mt-10 font-[var(--font-playfair)] text-[clamp(5rem,16vw,8rem)] font-black leading-none gradient-text">
          404
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#070b1d] sm:text-3xl">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#475569]">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/" className="btn-primary">
            Go home
          </Link>
          <Link href="/contact" className="text-sm font-semibold text-[#6d28d9] transition-colors hover:text-[#4c1d95]">
            Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}
