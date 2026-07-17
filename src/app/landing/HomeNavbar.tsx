import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { ArrowUpRight, Menu, MessageCircle, ShoppingCart } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/materials', label: 'Materials' },
  { href: '/3d-shop', label: '3D Shop' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/blog', label: 'Blog' },
  { href: '/pricing', label: 'Pricing' },
]

export default function HomeNavbar() {
  const whatsappHref = 'https://wa.me/919623023480'

  return (
    <nav
      className="navbar navbar-premium navbar-premium-float"
      data-elevated="false"
      data-transparent="true"
      style={{
        '--navbar-shadow':
          '0 18px 56px rgba(15,23,42,0.1), 0 6px 18px rgba(109,40,217,0.06), inset 0 1px 0 rgba(255,255,255,0.84)',
      } as CSSProperties}
    >
      <div className="navbar-left flex min-w-0 items-center gap-5">
        <Link
          href="/"
          prefetch={false}
          className="navbar-logo-link group flex min-h-[48px] items-center rounded-2xl bg-white/55 px-2.5 ring-1 ring-white/70 transition hover:bg-white/80"
          aria-label="Flux3D home"
        >
          <Image
            src="/logo.webp"
            alt="Flux3D logo - Premium 3D printing India"
            width={170}
            height={40}
            sizes="(min-width: 640px) 168px, 146px"
            className="h-auto w-[120px] object-contain transition-transform duration-200 group-hover:scale-[1.02] sm:w-[168px]"
            style={{ height: 'auto' }}
          />
        </Link>

        <ul className="navbar-link-cluster hidden list-none items-center gap-1 rounded-full border border-white/70 bg-white/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                prefetch={false}
                className={`nav-link navbar-premium-link whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold ${
                  link.href === '/' ? 'nav-link-active' : ''
                }`}
              >
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="navbar-actions hidden items-center gap-2.5 lg:flex">
        <div>
          <Link
            href="/cart"
            prefetch={false}
            className="navbar-action-button group relative flex min-h-[42px] items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3.5 text-sm font-semibold text-[var(--text-secondary)] shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white hover:text-[var(--text-primary)]"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
          </Link>
        </div>

        <div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="navbar-action-button navbar-whatsapp-button flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-full border border-[#25D366]/25 bg-white/70 px-3.5 text-sm font-semibold text-[#138a42] shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur transition hover:border-[#25D366]/40 hover:bg-[#25D366]/10"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>

        <div>
          <Link
            href="/login"
            prefetch={false}
            className="navbar-action-button flex min-h-[42px] items-center whitespace-nowrap rounded-full border border-white/80 bg-white/75 px-4 text-sm font-semibold text-[var(--text-secondary)] shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white hover:text-[var(--text-primary)]"
          >
            Log In
          </Link>
        </div>
        <div>
          <Link
            href="/signup"
            prefetch={false}
            className="navbar-signup-button btn-primary flex min-h-[42px] items-center whitespace-nowrap rounded-full px-[18px]"
          >
            Sign Up
          </Link>
        </div>
      </div>

      <details className="relative lg:hidden">
        <summary className="navbar-menu-button relative flex min-h-[44px] min-w-[44px] list-none items-center justify-center rounded-full border border-white/80 bg-white/70 text-[var(--text-primary)] shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur [&::-webkit-details-marker]:hidden">
          <span className="sr-only">Open menu</span>
          <Menu className="h-5 w-5" />
        </summary>

        <div className="navbar-mobile-panel absolute right-0 top-[calc(100%+0.75rem)] w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  className={`navbar-mobile-link flex min-h-[44px] items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-colors ${
                    link.href === '/'
                      ? 'navbar-mobile-link-active bg-[var(--brand-faint)] text-[var(--brand-primary)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {link.label}
                  {link.href === '/' ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> : null}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-3">
            <Link
              href="/instant-quote"
              prefetch={false}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
            >
              Get Instant Quote
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 py-3.5 text-base font-medium text-[#25D366]"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp Us
            </a>
          </div>
        </div>
      </details>
    </nav>
  )
}
