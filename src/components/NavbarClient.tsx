'use client'

import { type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChevronDown, Menu, MoreVertical, ShoppingCart, X, MessageCircle, ArrowUpRight } from 'lucide-react'
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
  darkLogoUrl?: string
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
        className="navbar-action-button group relative flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-sm font-semibold transition"
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
  darkLogoUrl,
  whatsappNumber = '+919623023480',
}: NavbarClientProps) {
  const { profile: liveProfile, loading } = useProfile(user, { enabled: true })
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isMoreOpen, setIsMoreOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const navRef = useRef<HTMLElement | null>(null)
  const navBoundsRef = useRef<DOMRect | null>(null)
  const navPointerFrameRef = useRef(0)
  const navPointerRef = useRef({ x: '50%', y: '50%' })
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const moreMenuRef = useRef<HTMLDivElement | null>(null)
  const currentUser = liveProfile ?? user
  const isAuthPending = loading && !currentUser
  const whatsappHrefNumber = (whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')
  const navIsElevated = scrolled || !transparent
  const activeLogo = navIsElevated ? logoUrl : (darkLogoUrl || logoUrl)
  const logoSrc = activeLogo || '/logo.webp'

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
      const { useShopCartStore } = await import('@/stores/shopCartStore')
      useShopCartStore.getState().clearCart()
      setIsOpen(false)
      setIsProfileOpen(false)
      setIsMoreOpen(false)
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
    { href: '/3d-shop', label: '3D Shop' },
    { href: '/pricing', label: 'Pricing' },
  ], [])
  const moreLinks = useMemo(() => [
    { href: '/materials', label: 'Materials' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/blog', label: 'Blog' },
  ], [])
  const accountLinks = useMemo(() => [
    { href: '/cart', label: 'Cart' },
    { href: '/saved-quotes', label: 'Saved Quotes' },
    { href: '/my-orders', label: 'My Orders' },
    { href: '/3d-shop/orders', label: '3D Shop Orders' },
    { href: '/3d-shop/wishlist', label: 'My Wishlist ♥' },
    { href: '/profile', label: 'Profile' },
  ], [])

  const currentPath = pathname ?? '/'
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
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setIsOpen(false)
      }
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.body.style.overflow = ''
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isOpen])

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
    if (!isMoreOpen) return

    const handlePointerDown = (event: PointerEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMoreOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMoreOpen])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsOpen(false)
      setIsProfileOpen(false)
      setIsMoreOpen(false)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [pathname])

  return (
    <>
      <nav
        ref={navRef}
        className="navbar"
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
        {/* Dynamic pointer spotlight overlay */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full opacity-70 transition-opacity duration-500"
          style={{
            background:
              'radial-gradient(400px circle at var(--nav-pointer-x, 50%) var(--nav-pointer-y, 50%), rgba(124, 58, 237, 0.14), rgba(99, 102, 241, 0.06) 40%, transparent 80%)',
          }}
        />

        <div className="navbar-left relative z-10 flex min-w-0 items-center gap-4">
          <Link
            href="/"
            prefetch={false}
            className="navbar-logo-link group flex min-h-[48px] items-center px-2"
            aria-label={`${businessName} home`}
          >
            <Image
              src={logoSrc}
              alt={`${businessName} logo`}
              width={1160}
              height={478}
              sizes="(min-width: 640px) 220px, 180px"
              priority
              className="h-11 w-auto max-w-[180px] object-contain transition-transform duration-300 group-hover:scale-[1.02] sm:h-12 sm:max-w-[220px]"
            />
          </Link>

          <ul className="navbar-link-cluster hidden list-none items-center gap-0 lg:flex">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    prefetch={false}
                    onNavigate={() => {
                      setIsOpen(false)
                      setIsProfileOpen(false)
                      setIsMoreOpen(false)
                    }}
                    className={`nav-link relative flex items-center whitespace-nowrap px-4 py-2 text-sm transition-all duration-200 ${
                      active ? 'nav-link-active' : ''
                    }`}
                  >
                    <span>{link.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="navbar-actions relative z-10 hidden items-center gap-2.5 lg:flex">
          <CartButton />
          <ShopNavControls currentPath={currentPath} currentUser={currentUser} />

          <div>
            <a
              href={`https://wa.me/${whatsappHrefNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="navbar-action-button navbar-whatsapp-button flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-300"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </span>
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

          <div>
            <Link
              href="/instant-quote"
              prefetch={false}
              className="navbar-quote-button relative flex min-h-[40px] items-center gap-2 overflow-hidden whitespace-nowrap rounded-full px-5 text-sm font-semibold transition-all duration-300 active:scale-[0.97]"
            >
              <span className="relative z-10">Get Instant Quote</span>
              <ArrowUpRight className="relative z-10 h-4 w-4" />
            </Link>
          </div>

          {isAuthPending ? (
            <div className="h-9 w-[74px] rounded-full bg-purple-100/60 animate-pulse" />
          ) : currentUser ? (
            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="navbar-profile-button flex min-h-[40px] items-center gap-2 rounded-full px-2 py-1 pr-3 transition-all duration-200"
              >
                {currentUser.avatarUrl ? (
                  <span className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-purple-400/30">
                    <Image
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      fill
                      sizes="28px"
                      className="object-cover"
                    />
                  </span>
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-orange-400 text-[10px] font-bold text-white shadow-sm">
                    {getInitials(currentUser.name)}
                  </span>
                )}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-purple-400 transition-transform duration-200 ${
                    isProfileOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isProfileOpen && (
                <div className="navbar-profile-menu absolute right-0 top-[calc(100%+0.75rem)] w-[300px] overflow-hidden rounded-2xl p-1.5 backdrop-blur-2xl transition-all duration-200">
                  <div className="border-b border-purple-100/60 p-3.5">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-purple-400/70">Signed in as</p>
                    <p className="mt-1 text-sm font-semibold text-purple-900">{currentUser.name}</p>
                    <p className="truncate text-xs text-purple-500/70">{currentUser.email}</p>
                  </div>

                  <div className="p-1.5">
                    {moreLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-purple-700/70 transition-colors hover:bg-purple-50/80 hover:text-purple-900"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <div className="my-1.5 h-px bg-purple-100/60" />
                    {accountLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-purple-700/70 transition-colors hover:bg-purple-50/80 hover:text-purple-900"
                      >
                        {item.label}
                      </Link>
                    ))}
                    {showAdminLink ? (
                      <Link
                        href="/admin"
                        prefetch={false}
                        onClick={() => setIsProfileOpen(false)}
                        className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-50"
                      >
                        Admin Dashboard
                      </Link>
                    ) : null}
                    <div className="my-1.5 h-px bg-purple-100/60" />
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      disabled={isLoggingOut}
                      className="flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoggingOut ? 'Logging out...' : 'Log out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div ref={moreMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsMoreOpen((current) => !current)}
                  className="navbar-action-button flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all duration-200"
                  aria-label="More navigation"
                  aria-expanded={isMoreOpen}
                >
                  <MoreVertical className="h-5 w-5" />
                </button>

                {isMoreOpen && (
                  <div className="navbar-more-menu absolute right-0 top-[calc(100%+0.75rem)] w-[210px] overflow-hidden rounded-2xl p-1.5 backdrop-blur-2xl transition-all duration-200">
                    <div className="p-1">
                      {moreLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          onClick={() => setIsMoreOpen(false)}
                          className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-purple-700/70 transition-colors hover:bg-purple-50/80 hover:text-purple-900"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Link
                  href={`/login?next=${encodeURIComponent(pathname ?? '/')}`}
                  prefetch={false}
                  className="navbar-action-button flex min-h-[40px] items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all duration-200"
                >
                  Log In
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="navbar-menu-button relative z-10 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full transition-all duration-200 lg:hidden"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <span className="flex h-6 w-6 items-center justify-center">
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </span>
        </button>
      </nav>

      {/* Mobile Navigation Drawer Sheet */}
      {isOpen && (
        <div
          className="navbar-mobile-overlay fixed inset-0 z-[90] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          {/* Backdrop Overlay */}
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-md transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer Content */}
          <div className="navbar-mobile-panel absolute right-0 top-0 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-l-3xl backdrop-blur-2xl">
            {/* Header bar */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-gradient-to-r from-orange-400 to-purple-600" />
                <p className="font-mono text-xs uppercase tracking-widest">Navigation</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-50 text-purple-500 transition-all duration-200 hover:bg-purple-100 hover:text-purple-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-6 space-y-6">
              {currentUser && (
                <div className="flex items-center gap-3 rounded-2xl bg-purple-50/60 p-3.5">
                  {currentUser.avatarUrl ? (
                    <span className="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-purple-400/20">
                      <Image
                        src={currentUser.avatarUrl}
                        alt={currentUser.name}
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-orange-400 text-sm font-bold text-white shadow-sm">
                      {getInitials(currentUser.name)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-purple-900">{currentUser.name}</p>
                    <p className="truncate text-xs text-purple-500/70">{currentUser.email}</p>
                  </div>
                </div>
              )}

              {/* Main Links */}
              <div>
                <p className="mb-2.5 px-1 font-mono text-[10px] uppercase tracking-wider">Main Menu</p>
                <ul className="space-y-1">
                  {navLinks.map((link) => {
                    const active = isActive(link.href)
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          prefetch={false}
                          onClick={() => {
                            setIsOpen(false)
                            setIsProfileOpen(false)
                            setIsMoreOpen(false)
                          }}
                          className={`navbar-mobile-link flex min-h-[52px] items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 ${
                            active ? 'navbar-mobile-link-active' : ''
                          }`}
                        >
                          <span>{link.label}</span>
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-sm" />}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* More Links */}
              <div>
                <p className="mb-2.5 px-1 font-mono text-[10px] uppercase tracking-wider">Explore</p>
                <ul className="space-y-1">
                  {moreLinks.map((link) => {
                    const active = isActive(link.href)
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          prefetch={false}
                          onClick={() => {
                            setIsOpen(false)
                            setIsProfileOpen(false)
                            setIsMoreOpen(false)
                          }}
                          className={`navbar-mobile-link flex min-h-[52px] items-center justify-between rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 ${
                            active ? 'navbar-mobile-link-active' : ''
                          }`}
                        >
                          <span>{link.label}</span>
                          {active && <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* Controls & CTA buttons */}
              <div className="pt-2 space-y-3">
                <ShopNavControls
                  mobile
                  currentPath={currentPath}
                  currentUser={currentUser}
                  onOpenAction={() => setIsOpen(false)}
                />

                <Link
                  href="/instant-quote"
                  prefetch={false}
                  onClick={() => setIsOpen(false)}
                  className="navbar-quote-button flex w-full min-h-[50px] items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold text-white transition-all active:scale-[0.98]"
                >
                  Get Instant Quote
                  <ArrowUpRight className="h-4 w-4" />
                </Link>

                <a
                  href={`https://wa.me/${whatsappHrefNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="navbar-action-button navbar-whatsapp-button flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl py-3 text-base font-semibold transition-all"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Us
                </a>

                {isAuthPending ? (
                  <div className="h-12 w-full rounded-2xl bg-purple-100/50 animate-pulse" />
                ) : currentUser ? (
                  <div className="pt-3 space-y-2">
                    <p className="px-1 font-mono text-[10px] uppercase tracking-wider">Account Options</p>
                    <div className="grid grid-cols-2 gap-2">
                      {accountLinks.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          onClick={() => setIsOpen(false)}
                          className="flex min-h-[44px] items-center justify-center rounded-xl px-3 py-2.5 text-center text-xs font-semibold transition"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    {showAdminLink ? (
                      <Link
                        href="/admin"
                        prefetch={false}
                        onClick={() => setIsOpen(false)}
                        className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-orange-50 py-2.5 text-center text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
                      >
                        Admin Dashboard
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      disabled={isLoggingOut}
                      className="w-full rounded-xl border border-rose-200/60 bg-rose-50/80 py-3 text-center text-sm font-medium text-rose-600 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      {isLoggingOut ? 'Logging out...' : 'Log out'}
                    </button>
                  </div>
                ) : (
                  <Link
                    href={`/login?next=${encodeURIComponent(pathname ?? '/')}`}
                    prefetch={false}
                    onClick={() => setIsOpen(false)}
                    className="navbar-action-button flex min-h-[48px] w-full items-center justify-center rounded-2xl py-3 text-center text-base font-semibold transition"
                  >
                    Log In to Account
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
