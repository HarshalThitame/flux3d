import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowUpRight, Menu, MessageCircle, ShoppingCart, X } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/materials', label: 'Materials' },
  { href: '/3d-shop', label: '3D Shop' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/blog', label: 'Blog' },
  { href: '/pricing', label: 'Pricing' },
]

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, textarea, select'

export default function HomeNavbar() {
  const whatsappHref = 'https://wa.me/919623023480'
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  /* ── Sync React state with native <details> open/close ── */
  useEffect(() => {
    const details = detailsRef.current
    if (!details) return
    const onToggle = () => setIsOpen(details.open)
    details.addEventListener('toggle', onToggle)
    return () => details.removeEventListener('toggle', onToggle)
  }, [])

  /* ── Imperative close helper ── */
  const closeMenu = useCallback(() => {
    if (detailsRef.current?.open) {
      detailsRef.current.open = false
    }
  }, [])

  /* ── Close on scroll ── */
  useEffect(() => {
    if (!isOpen) return
    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        closeMenu()
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [isOpen, closeMenu])

  /* ── Close on route change (popstate for back/forward) ── */
  useEffect(() => {
    if (!isOpen) return
    const onPopState = () => closeMenu()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [isOpen, closeMenu])

  /* ── Focus trap + Escape key ── */
  useEffect(() => {
    if (!isOpen) return

    /* Save the currently focused element so we can restore it later */
    previousFocusRef.current = document.activeElement as HTMLElement | null

    const panel = panelRef.current
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      /* Delay focus so it doesn't get stolen by the toggle event */
      requestAnimationFrame(() => first?.focus())
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeMenu()
        summaryRef.current?.focus()
        return
      }

      if (e.key !== 'Tab' || !panel) return

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      /* Restore focus to the trigger when menu closes */
      if (!detailsRef.current?.open) {
        previousFocusRef.current?.focus()
      }
    }
  }, [isOpen, closeMenu])

  /* ── Close on outside click/touch ── */
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen, closeMenu])

  /* ── Body scroll lock ── */
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('mobile-nav-open')
    } else {
      document.body.classList.remove('mobile-nav-open')
    }
    return () => document.body.classList.remove('mobile-nav-open')
  }, [isOpen])

  /* ── Handle link clicks inside the menu ── */
  const onNavLinkClick = useCallback(() => {
    closeMenu()
  }, [closeMenu])

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

      <details ref={detailsRef} className="relative lg:hidden">
        <summary
          ref={summaryRef}
          className="navbar-menu-button relative flex min-h-[44px] min-w-[44px] list-none items-center justify-center rounded-full border border-white/80 bg-white/70 text-[var(--text-primary)] shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur [&::-webkit-details-marker]:hidden"
          aria-expanded={isOpen}
          aria-controls="navbar-mobile-menu"
          aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <span className="sr-only">{isOpen ? 'Close menu' : 'Open menu'}</span>
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </summary>

        <div
          id="navbar-mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal={isOpen ? 'true' : undefined}
          aria-label="Navigation menu"
          className="navbar-mobile-panel absolute right-0 top-[calc(100%+0.75rem+env(safe-area-inset-top,0px))] w-[min(320px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white/95 p-4 shadow-[var(--shadow-lg)] backdrop-blur-xl"
          style={{ overscrollBehavior: 'contain' } as CSSProperties}
        >
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  onClick={onNavLinkClick}
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
              onClick={onNavLinkClick}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
            >
              Get Instant Quote
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onNavLinkClick}
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
