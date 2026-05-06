'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Menu, ShoppingCart, X, MessageCircle, ArrowUpRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { AppUserProfile } from '@/lib/auth/server'
import { useCart } from '@/lib/cart/context'
import { useProfile } from '@/hooks/useProfile'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface NavbarClientProps {
  transparent?: boolean
  user: AppUserProfile | null
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
    <Link
      href="/cart"
      className="group relative flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5 text-sm font-medium text-[#7a82a0] backdrop-blur-sm transition-all hover:border-[#FF5C1A]/30 hover:text-white hover:bg-white/[0.06]"
    >
      <ShoppingCart className="h-4 w-4 transition-transform group-hover:scale-110" />
      <span className="hidden sm:inline">Cart</span>
      {summary.itemCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF5C1A] text-[10px] font-bold text-white shadow-[0_0_12px_rgba(255,92,26,0.4)]">
          {summary.itemCount}
        </span>
      )}
    </Link>
  )
}

export default function NavbarClient({
  transparent = false,
  user,
}: NavbarClientProps) {
  const { profile } = useProfile(user)
  const { resetCartState } = useCart()
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string | null>(null)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

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
    { href: '/pre-made-products', label: 'Pre-Made' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/blog', label: 'Blog' },
    { href: '/pricing', label: 'Pricing' },
    ...(profile?.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled || !transparent
            ? 'py-3 bg-[#050810]/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_4px_30px_rgba(0,0,0,0.3)]'
            : 'py-4 bg-transparent border-b border-white/[0.04]'
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group" aria-label="Flux3D home">
            <span className="font-[var(--font-syne)] text-xl font-extrabold text-white">
              Flux<span className="text-[#FF5C1A]">3D</span>
            </span>
          </Link>

          {/* Nav Links */}
          <ul className="hidden md:flex items-center gap-1 list-none">
            {navLinks.map((link) => (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  onNavigate={() => {
                    setIsOpen(false)
                    setIsProfileOpen(false)
                  }}
                  onMouseEnter={() => setHoveredLink(link.href)}
                  onMouseLeave={() => setHoveredLink(null)}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                    pathname === link.href || hoveredLink === link.href
                      ? 'text-white'
                      : 'text-[#7a82a0]'
                  }`}
                >
                  {link.label}
                  {(pathname === link.href || hoveredLink === link.href) && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-[#FF5C1A] rounded-full" />
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <CartButton />

            {/* WhatsApp */}
            <a
              href="https://wa.me/919623023480"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-2.5 text-sm font-medium text-[#25D366] transition-all hover:bg-[#25D366]/20 hover:border-[#25D366]/50"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>

            {user ? (
              <>
                <Link
                  href="/instant-quote"
                  className="group relative flex items-center gap-2 rounded-xl bg-[#D94E00] px-5 py-2.5 text-sm font-semibold text-white overflow-hidden transition-all hover:shadow-[0_0_25px_rgba(217,78,0,0.3)]"
                >
                  <span className="relative z-10">Get Quote</span>
                  <ArrowUpRight className="relative z-10 h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>

                <div ref={profileMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((c) => !c)}
                    className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2 py-1.5 pr-3 transition-all hover:bg-white/[0.07] hover:border-white/[0.12]"
                  >
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.name}
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover ring-2 ring-[#FF5C1A]/20"
                      />
                    ) : (
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#ff7a3d] text-xs font-bold text-white shadow-[0_0_12px_rgba(255,92,26,0.3)]">
                        {getInitials(user.name)}
                      </span>
                    )}
                    <ChevronDown
                      className={`h-4 w-4 text-[#93a0c4] transition-transform duration-200 ${
                        isProfileOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 top-[calc(100%+0.75rem)] w-[300px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1120] shadow-[0_24px_80px_rgba(0,0,0,0.5)] animate-slideDown">
                      <div className="p-4 border-b border-white/[0.06]">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#7a82a0]">Signed in as</p>
                        <p className="mt-1.5 text-base font-semibold text-white">{user.name}</p>
                        <p className="text-sm text-[#93a0c4] truncate">{user.email}</p>
                      </div>

                      <div className="p-3">
                        {[
                          { href: '/saved-quotes', label: 'Saved Quotes' },
                          { href: '/my-orders', label: 'My Orders' },
                          { href: '/profile', label: 'Profile' },
                        ].map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-[#7a82a0] transition-colors hover:bg-white/[0.05] hover:text-white"
                          >
                            {item.label}
                          </Link>
                        ))}
                        <button
                          type="button"
                          onClick={() => void handleLogout()}
                          disabled={isLoggingOut}
                          className="flex w-full items-center rounded-xl px-3 py-2.5 text-sm font-medium text-red-400/80 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
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
                <Link
                  href="/login"
                  className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-[#7a82a0] transition-all hover:text-white hover:bg-white/[0.07]"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="group relative rounded-xl bg-[#D94E00] px-5 py-2.5 text-sm font-semibold text-white overflow-hidden transition-all hover:shadow-[0_0_25px_rgba(217,78,0,0.3)]"
                >
                  <span className="relative z-10">Sign Up</span>
                </Link>
              </>
            )}
          </div>

      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative md:hidden p-3 text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        <span className="w-6 h-6 flex items-center justify-center">
          {isOpen ? (
            <X className="h-5 w-5 animate-fadeIn" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </span>
      </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-[#050810]/95 backdrop-blur-2xl animate-fadeIn"
            onClick={() => setIsOpen(false)}
          />

          <div className="animate-slideDown absolute top-20 left-4 right-4 rounded-2xl border border-white/[0.08] bg-[#0d1120]/95 backdrop-blur-xl shadow-[0_24px_80px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-6">
              {user && (
                <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#FF5C1A] to-[#ff7a3d] text-sm font-bold text-white">
                      {getInitials(user.name)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-[#7a82a0] truncate">{user.email}</p>
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
                      className={`flex items-center justify-between rounded-xl py-3.5 px-4 text-base font-medium transition-colors min-h-[44px] ${
                        pathname === link.href
                          ? 'bg-white/[0.06] text-white'
                          : 'text-[#7a82a0] hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      {link.label}
                      {pathname === link.href && (
                        <div className="h-1.5 w-1.5 rounded-full bg-[#FF5C1A]" />
                      )}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3">
                <Link
                  href="/instant-quote"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#D94E00] py-3.5 text-base font-semibold text-white"
                >
                  Get Instant Quote
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://wa.me/919623023480"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full rounded-xl border border-[#25D366]/30 bg-[#25D366]/10 py-3.5 text-base font-medium text-[#25D366]"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Us
                </a>

                {user ? (
                  <>
                    {['/saved-quotes', '/my-orders', '/profile'].map((href) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setIsOpen(false)}
                        className="block w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-3.5 text-center text-base font-medium text-[#7a82a0]"
                      >
                        {href === '/saved-quotes' ? 'Saved Quotes' : href === '/my-orders' ? 'My Orders' : 'Profile'}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      disabled={isLoggingOut}
                      className="block w-full rounded-xl border border-white/[0.06] py-3.5 text-center text-base font-medium text-red-400/80 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoggingOut ? 'Logging out...' : 'Log out'}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3.5 text-center text-base font-medium text-[#7a82a0]"
                    >
                      Log In
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setIsOpen(false)}
                      className="block w-full rounded-xl bg-[#D94E00] py-3.5 text-center text-base font-semibold text-white"
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
