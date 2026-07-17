import type { BusinessSettings } from '@/lib/admin/business-settings'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'
import { siteUrl } from '@/lib/site'

export type PublicBusinessProfile = {
  brandName: string
  legalName: string
  productName: string
  businessType: string
  businessDescription: string
  websiteUrl: string
  supportEmail: string
  supportPhone: string
  registeredAddress: string
  operatingAddress: string
  jurisdictionCity: string
  jurisdictionState: string
  jurisdictionCountry: string
  businessHours: string
}

function joinAddress(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(', ')
}

export function buildPublicBusinessProfile(settings: BusinessSettings): PublicBusinessProfile {
  const brandName = settings.brandName || settings.businessName || FALLBACK_SETTINGS.businessName
  const legalName = settings.legalBusinessName || settings.businessName || FALLBACK_SETTINGS.legalBusinessName
  const supportEmail = settings.supportEmail || settings.primaryEmail || FALLBACK_SETTINGS.supportEmail
  const supportPhone = settings.primaryPhone || settings.whatsappNumber || FALLBACK_SETTINGS.primaryPhone
  const address = joinAddress([
    settings.addressLine1 || FALLBACK_SETTINGS.addressLine1,
    settings.addressLine2 || undefined,
    settings.city || FALLBACK_SETTINGS.city,
    settings.state || FALLBACK_SETTINGS.state,
    settings.postalCode || FALLBACK_SETTINGS.postalCode,
    settings.country || FALLBACK_SETTINGS.country,
  ])

  return {
    brandName,
    legalName,
    productName: 'Custom 3D printing and custom manufacturing services',
    businessType: settings.businessType || '3D printing service business',
    businessDescription: settings.businessDescription || FALLBACK_SETTINGS.businessDescription,
    websiteUrl: settings.websiteUrl || siteUrl,
    supportEmail,
    supportPhone,
    registeredAddress: address,
    operatingAddress: address,
    jurisdictionCity: settings.city || FALLBACK_SETTINGS.city,
    jurisdictionState: settings.state || FALLBACK_SETTINGS.state,
    jurisdictionCountry: settings.country || FALLBACK_SETTINGS.country,
    businessHours: settings.businessHours || FALLBACK_SETTINGS.businessHours,
  }
}

export function validatePublicBusinessProfile(profile: PublicBusinessProfile) {
  const missing: string[] = []

  if (!profile.brandName.trim()) missing.push('brandName')
  if (!profile.legalName.trim()) missing.push('legalName')
  if (!profile.productName.trim()) missing.push('productName')
  if (!profile.businessDescription.trim()) missing.push('businessDescription')
  if (!profile.websiteUrl.trim()) missing.push('websiteUrl')
  if (!profile.supportEmail.trim()) missing.push('supportEmail')
  if (!profile.supportPhone.trim()) missing.push('supportPhone')
  if (!profile.registeredAddress.trim()) missing.push('registeredAddress')
  if (!profile.jurisdictionCity.trim()) missing.push('jurisdictionCity')
  if (!profile.jurisdictionState.trim()) missing.push('jurisdictionState')
  if (!profile.jurisdictionCountry.trim()) missing.push('jurisdictionCountry')

  return missing
}
