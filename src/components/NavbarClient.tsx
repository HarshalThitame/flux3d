'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, ShoppingCart, X, MessageCircle, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import type { AppUserProfile } from '@/lib/auth/server'
import { useCart } from '@/lib/cart/context'
import { useProfile } from '@/hooks/useProfile'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useBusinessSettings } from '@/lib/settings-context'
import ShopCartDrawer, { ShopCartNavButton } from '@/components/shop/ShopCartDrawer'
import { useShopWishlistStore } from '@/stores/shopWishlistStore'

interface NavbarClientProps {
  transparent?: boolean
  user: AppUserProfile | null
  showAdminLink?: boolean
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
  const { summary, isLoading } = useCart()

  if (isLoading) return null

  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
      <Link
        href="/cart"
        className="group relative flex min-h-[42px] items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3.5 text-sm font-semibold text-[var(--text-secondary)] shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white hover:text-[var(--text-primary)]"
      >
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden sm:inline">Cart</span>
        {summary.itemCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] text-[10px] font-bold text-white shadow-[var(--shadow-brand)]">
            {summary.itemCount}
          </span>
        )}
      </Link>
    </motion.div>
  )
}

export default function NavbarClient({
  transparent = false,
  user,
  showAdminLink = false,
}: NavbarClientProps) {
  const { settings } = useBusinessSettings()
  const { profile: liveProfile, loading } = useProfile(user)
  const { resetCartState } = useCart()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const setWishlist = useShopWishlistStore((state) => state.setWishlist)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const currentUser = liveProfile ?? user
  const isAuthPending = loading && !currentUser
  const whatsappNumber = (settings.whatsappNumber || '+919623023480').replace(/[^0-9]/g, '')
  const navIsElevated = scrolled || !transparent
  const businessName = settings.businessName || 'Flux3D'
  const logoUrl = settings.logoUrl || '/logo.png'

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('[Auth] Failed to sign out', error)
        return
      }

      resetCartState()
      setWishlist([])
      setIsOpen(false)
      setIsProfileOpen(false)
      router.push('/login')
    } catch (error) {
      console.error('[Auth] Unexpected logout error', error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/materials', label: 'Materials' },
    { href: '/3d-shop', label: '3D Shop' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/blog', label: 'Blog' },
    { href: '/pricing', label: 'Pricing' },
    ...(showAdminLink ? [{ href: '/admin', label: 'Admin' }] : []),
  ]
  const accountLinks = [
    { href: '/cart', label: 'Cart' },
    { href: '/saved-quotes', label: 'Saved Quotes' },
    { href: '/my-orders', label: 'My Orders' },
    { href: '/3d-shop/orders', label: '3D Shop Orders' },
    { href: '/3d-shop/wishlist', label: 'My Wishlist ♥' },
    { href: '/profile', label: 'Profile' },
  ]

  const currentPath = pathname ?? '/'
  const isActive = (href: string) => (href === '/' ? currentPath === '/' : currentPath.startsWith(href))

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    let active = true

    async function loadWishlist() {
      if (!currentUser) {
        setWishlist([])
        return
      }

      try {
        const response = await fetch('/api/3d-shop/wishlist')
        const data = await response.json().catch(() => ({})) as { productIds?: string[] }
        if (active && response.ok) setWishlist(data.productIds ?? [])
      } catch {
        if (active) setWishlist([])
      }
    }

    void loadWishlist()
    return () => {
      active = false
    }
  }, [currentUser, setWishlist])

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setIsOpen(false)
      setIsProfileOpen(false)
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [pathname])

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 1 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="navbar"
        style={{
          boxShadow: navIsElevated
            ? '0 22px 60px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.88)'
            : '0 14px 42px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.84)',
        }}
      >
        <div className="flex min-w-0 items-center gap-5">
          <Link
            href="/"
            className="group flex min-h-[48px] items-center rounded-2xl bg-white/55 px-2.5 ring-1 ring-white/70 transition hover:bg-white/80"
            aria-label={`${businessName} home`}
          >
            <Image
              src={logoUrl}
              alt={`${businessName} logo — Premium 3D printing India`}
              width={170}
              height={40}
              unoptimized
              preload
              className="h-9 w-auto max-w-[146px] object-contain transition-transform duration-200 group-hover:scale-[1.02] sm:max-w-[168px]"
            />
          </Link>

          <ul className="hidden list-none items-center gap-1 rounded-full border border-white/70 bg-white/55 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur lg:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onNavigate={() => {
                    setIsOpen(false)
                    setIsProfileOpen(false)
                  }}
                  className={`nav-link whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold ${isActive(link.href) ? 'nav-link-active' : ''}`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden items-center gap-2.5 lg:flex">
          <CartButton />
          <ShopCartNavButton />

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <a
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[42px] items-center gap-2 whitespace-nowrap rounded-full border border-[#25D366]/25 bg-white/70 px-3.5 text-sm font-semibold text-[#138a42] shadow-[0_10px_28px_rgba(15,23,42,0.05)] backdrop-blur transition hover:border-[#25D366]/40 hover:bg-[#25D366]/10"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </motion.div>

          {isAuthPending ? (
            <div className="flex items-center gap-3">
              <div className="h-9 w-[74px] rounded-lg border border-[var(--border-light)] bg-[var(--bg-soft)]" />
              <div className="h-9 w-[94px] rounded-lg bg-[var(--accent)]/40" />
            </div>
          ) : currentUser ? (
            <>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/instant-quote"
                  className="relative flex min-h-[44px] items-center gap-2 overflow-hidden whitespace-nowrap rounded-full bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] px-5 font-semibold text-white shadow-[0_14px_34px_rgba(109,40,217,0.28)] transition-all duration-300 before:absolute before:inset-y-0 before:left-0 before:w-1/2 before:-translate-x-full before:bg-white/20 before:blur-xl before:content-[''] hover:from-[#3b0764] hover:to-[#6d28d9] hover:before:translate-x-[220%]"
                >
                  <span className="relative z-10">Get Quote</span>
                  <ArrowUpRight className="relative z-10 h-4 w-4" />
                </Link>
              </motion.div>

              <div ref={profileMenuRef} className="relative">
                <motion.button
                  type="button"
                  onClick={() => setIsProfileOpen((current) => !current)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex min-h-[42px] items-center gap-2 rounded-full border border-white/80 bg-white/75 px-2 py-1 pr-3 shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white"
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
                </motion.button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 top-[calc(100%+0.75rem)] w-[300px] overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white/95 shadow-[var(--shadow-lg)] backdrop-blur-xl"
                    >
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/login"
                  className="flex min-h-[42px] items-center whitespace-nowrap rounded-full border border-white/80 bg-white/75 px-4 text-sm font-semibold text-[var(--text-secondary)] shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white hover:text-[var(--text-primary)]"
                >
                  Log In
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/signup"
                  className="btn-primary flex min-h-[42px] items-center whitespace-nowrap rounded-full px-[18px]"
                >
                  Sign Up
                </Link>
              </motion.div>
            </>
          )}
        </div>

        <motion.button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="relative flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/80 bg-white/70 text-[var(--text-primary)] shadow-[0_10px_28px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={isOpen ? 'close' : 'open'}
              initial={{ opacity: 0, rotate: -8, scale: 0.9 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 8, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              className="flex h-6 w-6 items-center justify-center"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </motion.nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[90] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-xl"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-4 right-4 top-24 overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white/95 shadow-[var(--shadow-lg)] backdrop-blur-xl"
            >
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
                        onClick={() => {
                          setIsOpen(false)
                          setIsProfileOpen(false)
                        }}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium transition-colors ${
                          isActive(link.href)
                            ? 'bg-[var(--brand-faint)] text-[var(--brand-primary)]'
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
                  <ShopCartNavButton mobile onOpenAction={() => setIsOpen(false)} />
                  <Link
                    href="/instant-quote"
                    onClick={() => setIsOpen(false)}
                    className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
                  >
                    Get Instant Quote
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <a
                    href={`https://wa.me/${whatsappNumber}`}
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
                          onClick={() => setIsOpen(false)}
                          className="block w-full rounded-xl border border-[var(--border-light)] bg-white py-3.5 text-center text-base font-medium text-[var(--text-secondary)]"
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
                        href="/login"
                        onClick={() => setIsOpen(false)}
                        className="block w-full rounded-xl border border-[var(--border-light)] bg-white py-3.5 text-center text-base font-medium text-[var(--text-secondary)]"
                      >
                        Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsOpen(false)}
                        className="btn-primary block w-full py-3.5 text-center text-base"
                      >
                        Create Account
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ShopCartDrawer />
    </>
  )
}
