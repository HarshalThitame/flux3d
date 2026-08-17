import { describe, expect, it } from 'vitest'
import { loadInvoiceLogo } from '../logo'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'
import type { BusinessSettings } from '@/lib/admin/business-settings'

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function settingsWith(overrides: Partial<BusinessSettings>): BusinessSettings {
  return { ...FALLBACK_SETTINGS, ...overrides }
}

describe('loadInvoiceLogo', () => {
  it('returns null when no logo is configured', async () => {
    const result = await loadInvoiceLogo(settingsWith({ invoiceLogoUrl: '', logoUrl: '' }))
    expect(result).toBeNull()
  })

  it('reads a relative webp logo from public and converts it to PNG', async () => {
    const result = await loadInvoiceLogo(settingsWith({ invoiceLogoUrl: '/logo.webp' }))
    expect(result).toBeInstanceOf(Buffer)
    expect(result!.subarray(0, 8)).toEqual(PNG_MAGIC)
  })

  it('reads a relative png logo from public unchanged', async () => {
    const result = await loadInvoiceLogo(settingsWith({ invoiceLogoUrl: '/logo.png' }))
    expect(result).toBeInstanceOf(Buffer)
    expect(result!.subarray(0, 8)).toEqual(PNG_MAGIC)
  })

  it('returns null when the logo cannot be resolved', async () => {
    const result = await loadInvoiceLogo(
      settingsWith({ websiteUrl: 'http://127.0.0.1:1', invoiceLogoUrl: '/definitely-missing-logo.png' })
    )
    expect(result).toBeNull()
  })
})
