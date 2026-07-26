import type { ReactNode } from 'react'
import Navbar from '@/components/Navbar'

export default function ShopShell({
  children,
  transparentNav = false,
}: {
  children: ReactNode
  transparentNav?: boolean
}) {
  return (
    <div className="shop-luxury flex min-h-screen flex-col bg-[var(--shop-bg-base)] text-[var(--shop-text-secondary)]">
      <Navbar transparent={transparentNav} />
      {children}
    </div>
  )
}
