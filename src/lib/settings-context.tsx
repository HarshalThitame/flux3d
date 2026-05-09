'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import type { BusinessSettings } from '@/lib/admin/business-settings'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'

const FALLBACK = FALLBACK_SETTINGS

type SettingsContextValue = {
  settings: BusinessSettings
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: FALLBACK,
  loading: true,
  error: null,
  refresh: async () => {},
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(FALLBACK)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetched = useRef(false)

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/public/settings')
      if (!res.ok) {
        setSettings(FALLBACK)
        return
      }
      const json = await res.json() as { settings: BusinessSettings }
      if (json.settings) {
        setSettings(json.settings)
      }
    } catch {
      setSettings(FALLBACK)
    } finally {
      setLoading(false)
      fetched.current = true
    }
  }, [])

  useEffect(() => {
    if (fetched.current) return
    fetchSettings()
  }, [fetchSettings])

  const refresh = useCallback(async () => {
    setLoading(true)
    await fetchSettings()
  }, [fetchSettings])

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refresh }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useBusinessSettings(): SettingsContextValue {
  return useContext(SettingsContext)
}
