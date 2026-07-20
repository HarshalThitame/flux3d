'use client'

import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, Menu, ShoppingCart, X, MessageCircle, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AppUserProfile } from '@/lib/auth/server'
import { useProfile } from '@/hooks/useProfile'

const ShopNavControls = dynamic(() => import('@/components/shop/ShopNavControls'), { ssr: false })
const CART_SKIP_RESTORE_FLAG = 'flux3d-cart-skip-restore'

interface NavbarClientProps {
  transparent?: boolean
  user: AppUserProfile | null
  showAdminLink?: boolean
  businessName?: string
  logoUrl?: string
  whatsappNumber?: string
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function CartButton() {
  return (
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
  )
}

export default function NavbarClient({
  transparent = false,
  user,
  showAdminLink = false,
  businessName = 'Flux3D',
  logoUrl = '/logo.webp',
  whatsappNumber = '+919623023480',
}: NavbarClientProps) {
  const { profile: liveProfile, loading } = useProfile(user, { enabled: Boolean(user) })
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navRef = useRef<HTMLElement | null>(null)
  const navBoundsRef = useRef<DOMRect | null>(null)
  const navPointerFrameRef = useRef(0)
  const navPointerRef = useRef({ x: '50%', y: '50%' })
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const currentUser = liveProfile ?? user
  const isAuthPending = loading && !currentUser
  const whatsappHrefNumber = (whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')
  const navIsElevated = scrolled || !transparent
  const logoIsRemote = /^https?:\/\//.test(logoUrl)
  const logoSrc = logoIsRemote ? '/logo.webp' : logoUrl || '/logo.webp'

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[Auth] Failed to sign out', error)
        return
      }

      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(CART_SKIP_RESTORE_FLAG, '1')
      }
      const { clearCart, getCartStorageKey } = await import('@/lib/cart/utils')
      clearCart(getCartStorageKey(null))
      if (currentUser?.id) {
        clearCart(getCartStorageKey(currentUser.id))
      }
      const { useShopWishlistStore } = await import('@/stores/shopWishlistStore')
      useShopWishlistStore.getState().setWishlist([])
      setIsOpen(false)
      setIsProfileOpen(false)
      router.push('/login')
    } catch (error) {
      console.error('[Auth] Unexpected logout error', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navLinks = useMemo(() => [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/materials', label: 'Materials' },
    { href: '/3d-shop', label: '3D Shop' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/blog', label: 'Blog' },
    { href: '/pricing', label: 'Pricing' },
    ...(showAdminLink ? [{ href: '/admin', label: 'Admin' }] : []),
  ], [showAdminLink])
  const accountLinks = useMemo(() => [
    { href: '/cart', label: 'Cart' },
    { href: '/saved-quotes', label: 'Saved Quotes' },
    { href: '/my-orders', label: 'My Orders' },
    { href: '/3d-shop/orders', label: '3D Shop Orders' },
    { href: '/3d-shop/wishlist', label: 'My Wishlist ♥' },
    { href: '/profile', label: 'Profile' },
  ], [])

  const currentPath = pathname ?? '/'
  const isShopSection = currentPath.startsWith('/3d-shop')
  const isActive = useCallback((href: string) => (href === '/' ? currentPath === '/' : currentPath.startsWith(href)), [currentPath])
  const navStyle = {
    '--navbar-shadow': navIsElevated
      ? '0 24px 70px rgba(15,23,42,0.16), 0 8px 24px rgba(109,40,217,0.08), inset 0 1px 0 rgba(255,255,255,0.88)'
      : '0 18px 56px rgba(15,23,42,0.1), 0 6px 18px rgba(109,40,217,0.06), inset 0 1px 0 rgba(255,255,255,0.84)',
  } as CSSProperties

  const handleNavPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const nav = navRef.current
    if (!nav || !window.matchMedia('(pointer: fine)').matches) return
    const bounds = navBoundsRef.current ?? nav.getBoundingClientRect()
    navBoundsRef.current = bounds
    navPointerRef.current = {
      x: `${event.clientX - bounds.left}px`,
      y: `${event.clientY - bounds.top}px`,
    }

    if (navPointerFrameRef.current) return
    navPointerFrameRef.current = window.requestAnimationFrame(() => {
      navPointerFrameRef.current = 0
      nav.style.setProperty('--nav-pointer-x', navPointerRef.current.x)
      nav.style.setProperty('--nav-pointer-y', navPointerRef.current.y)
    })
  }, [])

  useEffect(() => {
    let frame = 0
    let lastScrolled = false

    const updateScrolled = () => {
      frame = 0
      const nextScrolled = window.scrollY > 20
      if (nextScrolled === lastScrolled) return
      lastScrolled = nextScrolled
      setScrolled(nextScrolled)
    }

    const handleScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateScrolled)
    }

    const handleResize = () => {
      navBoundsRef.current = null
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (navPointerFrameRef.current) window.cancelAnimationFrame(navPointerFrameRef.current)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!isProfileOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProfileOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isProfileOpen])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsOpen(false)
      setIsProfileOpen(false)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [pathname])

  return (
    <>
      <nav
        ref={navRef}
        className={`navbar navbar-premium ${navIsElevated ? 'navbar-premium-elevated' : 'navbar-premium-float'}`}
        data-elevated={navIsElevated ? 'true' : 'false'}
        data-transparent={transparent ? 'true' : 'false'}
        onPointerMove={handleNavPointerMove}
        onPointerLeave={() => {
          if (navPointerFrameRef.current) {
            window.cancelAnimationFrame(navPointerFrameRef.current)
            navPointerFrameRef.current = 0
          }
          navBoundsRef.current = null
          navRef.current?.style.setProperty('--nav-pointer-x', '50%')
          navRef.current?.style.setProperty('--nav-pointer-y', '50%')
        }}
        style={navStyle}
      >
        <div className="navbar-left flex min-w-0 items-center gap-5">
          <Link
            href="/"
            prefetch={false}
            className="navbar-logo-link group flex min-h-[48px] items-center rounded-2xl bg-white/55 px-2.5 ring-1 ring-white/70 transition hover:bg-white/80"
            aria-label={`${businessName} home`}
          >
            <Image
              src={logoSrc}
              alt={`${businessName} logo — Premium 3D printing India`}
              width={170}
              height={40}
              sizes="(min-width: 640px) 168px, 146px"
              className="h-9 w-auto max-w-[146px] object-contain transition-transform duration-200 group-hover:scale-[1.02] sm:max-w-[168px]"
            />
          </Link>

          <ul className="navbar-link-cluster hidden list-none items-center gap-1 rounded-full border border-white/70 bg-white/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur lg:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  prefetch={false}
                  onNavigate={() => {
                    setIsOpen(false)
                    setIsProfileOpen(false)
                  }}
                  className={`nav-link navbar-premium-link whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold ${isActive(link.href) ? 'nav-link-active' : ''}`}
                >
                  <span>{link.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="navbar-actions hidden items-center gap-2.5 lg:flex">
          <CartButton />
          {isShopSection ? <ShopNavControls currentPath={currentPath} currentUser={currentUser} /> : null}

          <div>
            <a
              href={`https://wa.me/${whatsappHrefNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="navbar-action-button navbar-whatsapp-button flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-full border border-[#25D366]/25 bg-white/70 px-3.5 text-sm font-semibold text-[#138a42] shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur transition hover:border-[#25D366]/40 hover:bg-[#25D366]/10"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

          {isAuthPending ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-[74px] rounded-lg border border-[var(--border-light)] bg-[var(--bg-soft)]" />
              <div className="h-9 w-[94px] rounded-lg bg-[var(--accent)]/40" />
            </div>
          ) : currentUser ? (
            <>
              <div>
                <Link
                  href="/instant-quote"
                  prefetch={false}
                  className="navbar-quote-button relative flex min-h-[44px] items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] px-5 font-semibold text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition-all duration-300 before:absolute before:inset-y-0 before:left-0 before:w-1/2 before:-translate-x-full before:bg-white/20 before:blur-xl before:content-[''] hover:from-[#3b0764] hover:to-[#6d28d9] hover:before:translate-x-[220%]"
                >
                  <span className="relative z-10">Get Quote</span>
                  <ArrowUpRight className="relative z-10 h-4 w-4" />
                </Link>
              </div>

              <div ref={profileMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((current) => !current)}
                  className="navbar-profile-button flex min-h-[42px] items-center gap-2 rounded-full border border-white/80 bg-white/75 px-2 py-1 pr-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white"
                >
                  {currentUser.avatarUrl ? (
                    <span className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-[var(--accent)]/20">
                      <Image
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        fill
                        sizes="28px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--gradient-brand)] text-[10px] font-bold text-white shadow-[var(--shadow-brand)]">
                      {getInitials(currentUser.name)}
                    </span>
                  )}
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-[var(--text-secondary)] transition-transform duration-200 ${
                      isProfileOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isProfileOpen && (
                  <div className="navbar-profile-menu absolute right-0 top-[calc(100%+0.75rem)] w-[300px] overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white/95 shadow-[var(--shadow-lg)] backdrop-blur-xl">
                      <div className="border-b border-[var(--border-light)] p-4">
                        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">Signed in as</p>
                        <p className="mt-1.5 text-base font-semibold text-[var(--text-primary)]">{currentUser.name}</p>
                        <p className="truncate text-sm text-[var(--text-secondary)]">{currentUser.email}</p>
                      </div>

                      <div className="p-3">
                        {accountLinks.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={false}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]"
                          >
                            {item.label}
                          </Link>
                        ))}
                        <button
                          type="button"
                          onClick={() => void handleLogout()}
                          disabled={isLoggingOut}
                          className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isLoggingOut ? 'Logging out...' : 'Log out'}
                        </button>
                      </div>
                    </div>
                  )}
              </div>
            </>
          ) : (
            <>
              <div>
                <Link
                  href={`/login?next=${encodeURIComponent(pathname ?? '/')}`}
                  prefetch={false}
                  className="navbar-action-button flex min-h-[42px] items-center whitespace-nowrap rounded-full border border-white/80 bg-white/75 px-4 text-sm font-semibold text-[var(--text-secondary)] shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white hover:text-[var(--text-primary)]"
                >
                  Log In
                </Link>
              </div>
              <div>
                <Link
                  href={`/signup?next=${encodeURIComponent(pathname ?? '/')}`}
                  prefetch={false}
                  className="navbar-signup-button btn-primary flex min-h-[42px] items-center whitespace-nowrap rounded-full px-[18px]"
                >
                  Sign Up
                </Link>
              </div>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="navbar-menu-button relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/80 bg-white/70 text-[var(--text-primary)] shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="flex h-6 w-6 items-center justify-center">
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </span>
        </button>
      </nav>

      {isOpen && (
          <div className="navbar-mobile-overlay fixed inset-0 z-[90] lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl"
              onClick={() => setIsOpen(false)}
            />

            <div className="navbar-mobile-panel absolute left-4 right-4 top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-[var(--border-light)] bg-white/95 shadow-[var(--shadow-lg)] backdrop-blur-xl">
              <div className="p-6">
                {currentUser && (
                  <div className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-3">
                    {currentUser.avatarUrl ? (
                      <span className="relative h-10 w-10 overflow-hidden rounded-full">
                        <Image
                          src={currentUser.avatarUrl}
                          alt={currentUser.name}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--gradient-brand)] text-sm font-bold text-white">
                        {getInitials(currentUser.name)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{currentUser.name}</p>
                      <p className="truncate text-xs text-[var(--text-secondary)]">{currentUser.email}</p>
                    </div>
                  </div>
                )}

                <ul className="space-y-1">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        onClick={() => {
                          setIsOpen(false)
                          setIsProfileOpen(false)
                        }}
                        className={`navbar-mobile-link flex min-h-[44px] items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-colors ${
                          isActive(link.href)
                            ? 'navbar-mobile-link-active bg-[var(--brand-faint)] text-[var(--brand-primary)]'
                            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-soft)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {link.label}
                        {isActive(link.href) && (
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-6 space-y-3">
                  {isShopSection ? (
                    <ShopNavControls
                      mobile
                      currentPath={currentPath}
                      currentUser={currentUser}
                      onOpenAction={() => setIsOpen(false)}
                    />
                  ) : null}
                  <Link
                    href="/instant-quote"
                    prefetch={false}
                    onClick={() => setIsOpen(false)}
                    className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
                  >
                    Get Instant Quote
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={`https://wa.me/${whatsappHrefNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 py-3.5 text-base font-medium text-[#25D366]"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp Us
                  </a>

                  {isAuthPending ? (
                    <>
                      <div className="block w-full rounded-xl border border-[var(--border-light)] bg-[var(--bg-soft)] py-3.5" />
                      <div className="block w-full rounded-xl bg-[var(--accent)]/40 py-3.5" />
                    </>
                  ) : currentUser ? (
                    <>
                      {accountLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          onClick={() => setIsOpen(false)}
                          className="navbar-mobile-action-light block w-full rounded-xl border border-[var(--border-light)] bg-white py-3.5 text-center text-base font-medium text-[var(--text-secondary)]"
                        >
                          {item.label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        onClick={() => void handleLogout()}
                        disabled={isLoggingOut}
                        className="block w-full rounded-xl border border-[var(--border-light)] py-3.5 text-center text-base font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoggingOut ? 'Logging out...' : 'Log out'}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/login?next=${encodeURIComponent(pathname ?? '/')}`}
                        prefetch={false}
                        onClick={() => setIsOpen(false)}
                        className="navbar-mobile-action-light block w-full rounded-xl border border-[var(--border-light)] bg-white py-3.5 text-center text-base font-medium text-[var(--text-secondary)]"
                      >
                        Log In
                      </Link>
                      <Link
                        href={`/signup?next=${encodeURIComponent(pathname ?? '/')}`}
                        prefetch={false}
                        onClick={() => setIsOpen(false)}
                        className="btn-primary block w-full py-3.5 text-center text-base"
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </>
  )
}
