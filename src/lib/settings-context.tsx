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

export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode
  initialSettings?: BusinessSettings
}) {
  const [settings, setSettings] = useState<BusinessSettings>(initialSettings ?? FALLBACK)
  const [loading, setLoading] = useState(initialSettings ? false : true)
  const [error, setError] = useState<string | null>(null)
  const fetched = useRef(Boolean(initialSettings))

  const fetchSettings = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/public/settings')
      if (!res.ok) {
        setSettings(FALLBACK)
        setError('Failed to load business settings.')
        return
      }
      const json = await res.json() as { settings: BusinessSettings }
      if (json.settings) {
        setSettings(json.settings)
      }
    } catch {
      setSettings(FALLBACK)
      setError('Failed to load business settings.')
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
