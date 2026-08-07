'use client'

import { useEffect } from 'react'

/**
 * Permanently pins the application to the light theme.
 * Sets `data-theme="light"` on <html> so all semantic tokens in
 * globals.css resolve consistently. There is no dark mode.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', 'light')
    root.style.colorScheme = 'light'
  }, [])

  return <>{children}</>
}
