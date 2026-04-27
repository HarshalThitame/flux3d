'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { AppUserProfile } from '@/lib/auth/server'

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

export default function NavbarClient({
  transparent = false,
  user,
}: NavbarClientProps) {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/services', label: 'Services' },
    { href: '/materials', label: 'Materials' },
    { href: '/gallery', label: 'Gallery' },
    { href: '/pricing', label: 'Pricing' },
  ]

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-4 transition-colors md:px-12 md:py-5 ${
          transparent
            ? 'border-b border-[rgba(255,255,255,0.07)] bg-[#050810]/85 backdrop-blur-xl'
            : 'border-b border-[rgba(255,255,255,0.07)] bg-[#050810]/95 backdrop-blur-xl'
        }`}
      >
        <Link href="/" className="flex items-center" aria-label="Flux3D home">
          <Image
            src="/logo.png"
            alt="Flux3D Additive Innovation"
            width={578}
            height={432}
            priority
            className="h-10 w-auto md:h-12"
          />
        </Link>

        <ul className="hidden list-none gap-6 md:flex lg:gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-[#7a82a0] no-underline transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                href="/saved-quotes"
                className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
              >
                Saved Quotes
              </Link>
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-2 py-2 pr-4 transition-colors hover:bg-white/[0.07]"
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5C1A] text-xs font-bold text-white">
                    {getInitials(user.name)}
                  </span>
                )}
                <span className="text-left">
                  <span className="block text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                    Signed in
                  </span>
                  <span className="block text-sm font-medium text-white">{user.name}</span>
                </span>
              </Link>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-[#c9d0e7] transition-colors hover:border-white/20 hover:text-white"
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.07]"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-[#FF5C1A] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-88 md:px-[1.4rem] md:py-[0.55rem]"
              >
                Create Account
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-white md:hidden"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 animate-fadeIn bg-[#050810]/95 backdrop-blur-lg"
            onClick={() => setIsOpen(false)}
          />

          <div className="animate-slideDown absolute top-20 left-4 right-4 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0d1120] p-6">
            {user && (
              <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">
                  Signed in
                </div>
                <div className="mt-2 text-lg font-medium text-white">{user.name}</div>
                <div className="mt-1 text-sm text-[#93a0c4]">{user.email}</div>
              </div>
            )}

            <ul className="space-y-4">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="block text-lg font-medium text-[#7a82a0] transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {user ? (
              <div className="mt-6 space-y-3">
                <Link
                  href="/quote"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-lg bg-[#FF5C1A] py-3 text-center font-medium text-white"
                >
                  Open Quote Workspace
                </Link>
                <Link
                  href="/saved-quotes"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 text-center font-medium text-white"
                >
                  Saved Quotes
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 text-center font-medium text-white"
                >
                  Profile
                </Link>
                <form action="/auth/logout" method="post">
                  <button
                    type="submit"
                    className="block w-full rounded-lg border border-white/10 bg-transparent py-3 text-center font-medium text-[#c9d0e7]"
                  >
                    Log out
                  </button>
                </form>
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-lg border border-white/10 bg-white/[0.03] py-3 text-center font-medium text-white"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-lg bg-[#FF5C1A] py-3 text-center font-medium text-white"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
