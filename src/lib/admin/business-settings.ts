import { createAdminSupabaseClient } from '@/lib/admin/server'

export type BusinessSettings = {
  id: string
  businessName: string
  legalBusinessName: string
  brandName: string
  tagline: string
  businessDescription: string
  gstNumber: string
  panNumber: string
  cinNumber: string
  msmeNumber: string
  businessType: string

  primaryEmail: string
  supportEmail: string
  salesEmail: string
  billingEmail: string
  primaryPhone: string
  whatsappNumber: string
  alternatePhone: string
  tollFreeNumber: string

  addressLine1: string
  addressLine2: string
  landmark: string
  city: string
  state: string
  country: string
  postalCode: string
  billingSameAsOffice: boolean
  billingAddressLine1: string
  billingAddressLine2: string
  billingCity: string
  billingState: string
  billingCountry: string
  billingPostalCode: string

  instagramUrl: string
  facebookUrl: string
  linkedinUrl: string
  twitterUrl: string
  youtubeUrl: string
  threadsUrl: string
  pinterestUrl: string
  githubUrl: string
  websiteUrl: string

  logoUrl: string
  darkLogoUrl: string
  faviconUrl: string
  invoiceLogoUrl: string
  emailLogoUrl: string
  primaryColor: string
  secondaryColor: string

  invoicePrefix: string
  quotationPrefix: string
  invoiceStartNumber: number
  quotationStartNumber: number
  currency: string
  currencySymbol: string
  taxPercentage: number
  sacHsnCode: string
  paymentTerms: string
  bankAccountName: string
  bankName: string
  accountNumber: string
  ifscCode: string
  upiId: string
  upiQrCodeUrl: string

  whatsappOrderNumber: string
  whatsappSupportNumber: string
  defaultWhatsappTemplate: string
  autoReplyMessage: string
  businessHours: string
  supportAvailabilityMessage: string

  metaTitle: string
  metaDescription: string
  metaKeywords: string
  ogImageUrl: string
  twitterImageUrl: string
  canonicalUrl: string
  robotsIndex: boolean

  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPassword: string
  smtpSenderName: string
  smtpSenderEmail: string

  privacyPolicyUrl: string
  termsUrl: string
  refundPolicyUrl: string
  shippingPolicyUrl: string

  workingDays: string
  workingHours: string
  holidayMessage: string
  emergencyContact: string
  orderProcessingTime: string
  deliveryChargeThreshold: number
  defaultDeliveryCharge: number
  pickupAvailable: boolean
  codAvailable: boolean

  createdAt: string
  updatedAt: string
}

export type BusinessSettingsRow = {
  id: string
  business_name: string | null
  legal_business_name: string | null
  brand_name: string | null
  tagline: string | null
  business_description: string | null
  gst_number: string | null
  pan_number: string | null
  cin_number: string | null
  msme_number: string | null
  business_type: string | null

  primary_email: string | null
  support_email: string | null
  sales_email: string | null
  billing_email: string | null
  primary_phone: string | null
  whatsapp_number: string | null
  alternate_phone: string | null
  toll_free_number: string | null

  address_line_1: string | null
  address_line_2: string | null
  landmark: string | null
  city: string | null
  state: string | null
  country: string | null
  postal_code: string | null
  billing_same_as_office: boolean | null
  billing_address_line_1: string | null
  billing_address_line_2: string | null
  billing_city: string | null
  billing_state: string | null
  billing_country: string | null
  billing_postal_code: string | null

  instagram_url: string | null
  facebook_url: string | null
  linkedin_url: string | null
  twitter_url: string | null
  youtube_url: string | null
  threads_url: string | null
  pinterest_url: string | null
  github_url: string | null
  website_url: string | null

  logo_url: string | null
  dark_logo_url: string | null
  favicon_url: string | null
  invoice_logo_url: string | null
  email_logo_url: string | null
  primary_color: string | null
  secondary_color: string | null

  invoice_prefix: string | null
  quotation_prefix: string | null
  invoice_start_number: number | null
  quotation_start_number: number | null
  currency: string | null
  currency_symbol: string | null
  tax_percentage: number | null
  sac_hsn_code: string | null
  payment_terms: string | null
  bank_account_name: string | null
  bank_name: string | null
  account_number: string | null
  ifsc_code: string | null
  upi_id: string | null
  upi_qr_code_url: string | null

  whatsapp_order_number: string | null
  whatsapp_support_number: string | null
  default_whatsapp_template: string | null
  auto_reply_message: string | null
  business_hours: string | null
  support_availability_message: string | null

  meta_title: string | null
  meta_description: string | null
  meta_keywords: string | null
  og_image_url: string | null
  twitter_image_url: string | null
  canonical_url: string | null
  robots_index: boolean | null

  smtp_host: string | null
  smtp_port: number | null
  smtp_username: string | null
  smtp_password: string | null
  smtp_sender_name: string | null
  smtp_sender_email: string | null

  privacy_policy_url: string | null
  terms_url: string | null
  refund_policy_url: string | null
  shipping_policy_url: string | null

  working_days: string | null
  working_hours: string | null
  holiday_message: string | null
  emergency_contact: string | null
  order_processing_time: string | null
  delivery_charge_threshold: number | null
  default_delivery_charge: number | null
  pickup_available: boolean | null
  cod_available: boolean | null

  created_at: string | null
  updated_at: string | null
}

function n(value: string | null | undefined): string {
  return value ?? ''
}

function bool(value: boolean | null | undefined): boolean {
  return value ?? false
}

function num(value: number | null | undefined): number {
  return value ?? 0
}

export function mapBusinessSettingsRow(row: BusinessSettingsRow): BusinessSettings {
  return {
    id: row.id,
    businessName: n(row.business_name),
    legalBusinessName: n(row.legal_business_name),
    brandName: n(row.brand_name),
    tagline: n(row.tagline),
    businessDescription: n(row.business_description),
    gstNumber: n(row.gst_number),
    panNumber: n(row.pan_number),
    cinNumber: n(row.cin_number),
    msmeNumber: n(row.msme_number),
    businessType: n(row.business_type),

    primaryEmail: n(row.primary_email),
    supportEmail: n(row.support_email),
    salesEmail: n(row.sales_email),
    billingEmail: n(row.billing_email),
    primaryPhone: n(row.primary_phone),
    whatsappNumber: n(row.whatsapp_number),
    alternatePhone: n(row.alternate_phone),
    tollFreeNumber: n(row.toll_free_number),

    addressLine1: n(row.address_line_1),
    addressLine2: n(row.address_line_2),
    landmark: n(row.landmark),
    city: n(row.city),
    state: n(row.state),
    country: n(row.country),
    postalCode: n(row.postal_code),
    billingSameAsOffice: bool(row.billing_same_as_office),
    billingAddressLine1: n(row.billing_address_line_1),
    billingAddressLine2: n(row.billing_address_line_2),
    billingCity: n(row.billing_city),
    billingState: n(row.billing_state),
    billingCountry: n(row.billing_country),
    billingPostalCode: n(row.billing_postal_code),

    instagramUrl: n(row.instagram_url),
    facebookUrl: n(row.facebook_url),
    linkedinUrl: n(row.linkedin_url),
    twitterUrl: n(row.twitter_url),
    youtubeUrl: n(row.youtube_url),
    threadsUrl: n(row.threads_url),
    pinterestUrl: n(row.pinterest_url),
    githubUrl: n(row.github_url),
    websiteUrl: n(row.website_url),

    logoUrl: n(row.logo_url),
    darkLogoUrl: n(row.dark_logo_url),
    faviconUrl: n(row.favicon_url),
    invoiceLogoUrl: n(row.invoice_logo_url),
    emailLogoUrl: n(row.email_logo_url),
    primaryColor: n(row.primary_color),
    secondaryColor: n(row.secondary_color),

    invoicePrefix: n(row.invoice_prefix),
    quotationPrefix: n(row.quotation_prefix),
    invoiceStartNumber: num(row.invoice_start_number),
    quotationStartNumber: num(row.quotation_start_number),
    currency: n(row.currency),
    currencySymbol: n(row.currency_symbol),
    taxPercentage: num(row.tax_percentage),
    sacHsnCode: n(row.sac_hsn_code),
    paymentTerms: n(row.payment_terms),
    bankAccountName: n(row.bank_account_name),
    bankName: n(row.bank_name),
    accountNumber: n(row.account_number),
    ifscCode: n(row.ifsc_code),
    upiId: n(row.upi_id),
    upiQrCodeUrl: n(row.upi_qr_code_url),

    whatsappOrderNumber: n(row.whatsapp_order_number),
    whatsappSupportNumber: n(row.whatsapp_support_number),
    defaultWhatsappTemplate: n(row.default_whatsapp_template),
    autoReplyMessage: n(row.auto_reply_message),
    businessHours: n(row.business_hours),
    supportAvailabilityMessage: n(row.support_availability_message),

    metaTitle: n(row.meta_title),
    metaDescription: n(row.meta_description),
    metaKeywords: n(row.meta_keywords),
    ogImageUrl: n(row.og_image_url),
    twitterImageUrl: n(row.twitter_image_url),
    canonicalUrl: n(row.canonical_url),
    robotsIndex: bool(row.robots_index),

    smtpHost: n(row.smtp_host),
    smtpPort: num(row.smtp_port),
    smtpUsername: n(row.smtp_username),
    smtpPassword: n(row.smtp_password),
    smtpSenderName: n(row.smtp_sender_name),
    smtpSenderEmail: n(row.smtp_sender_email),

    privacyPolicyUrl: n(row.privacy_policy_url),
    termsUrl: n(row.terms_url),
    refundPolicyUrl: n(row.refund_policy_url),
    shippingPolicyUrl: n(row.shipping_policy_url),

    workingDays: n(row.working_days),
    workingHours: n(row.working_hours),
    holidayMessage: n(row.holiday_message),
    emergencyContact: n(row.emergency_contact),
    orderProcessingTime: n(row.order_processing_time),
    deliveryChargeThreshold: num(row.delivery_charge_threshold),
    defaultDeliveryCharge: num(row.default_delivery_charge),
    pickupAvailable: bool(row.pickup_available),
    codAvailable: bool(row.cod_available),

    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

export function toSnakeCase(data: Partial<BusinessSettings>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const map: Record<string, string> = {
    businessName: 'business_name',
    legalBusinessName: 'legal_business_name',
    brandName: 'brand_name',
    tagline: 'tagline',
    businessDescription: 'business_description',
    gstNumber: 'gst_number',
    panNumber: 'pan_number',
    cinNumber: 'cin_number',
    msmeNumber: 'msme_number',
    businessType: 'business_type',
    primaryEmail: 'primary_email',
    supportEmail: 'support_email',
    salesEmail: 'sales_email',
    billingEmail: 'billing_email',
    primaryPhone: 'primary_phone',
    whatsappNumber: 'whatsapp_number',
    alternatePhone: 'alternate_phone',
    tollFreeNumber: 'toll_free_number',
    addressLine1: 'address_line_1',
    addressLine2: 'address_line_2',
    landmark: 'landmark',
    city: 'city',
    state: 'state',
    country: 'country',
    postalCode: 'postal_code',
    billingSameAsOffice: 'billing_same_as_office',
    billingAddressLine1: 'billing_address_line_1',
    billingAddressLine2: 'billing_address_line_2',
    billingCity: 'billing_city',
    billingState: 'billing_state',
    billingCountry: 'billing_country',
    billingPostalCode: 'billing_postal_code',
    instagramUrl: 'instagram_url',
    facebookUrl: 'facebook_url',
    linkedinUrl: 'linkedin_url',
    twitterUrl: 'twitter_url',
    youtubeUrl: 'youtube_url',
    threadsUrl: 'threads_url',
    pinterestUrl: 'pinterest_url',
    githubUrl: 'github_url',
    websiteUrl: 'website_url',
    logoUrl: 'logo_url',
    darkLogoUrl: 'dark_logo_url',
    faviconUrl: 'favicon_url',
    invoiceLogoUrl: 'invoice_logo_url',
    emailLogoUrl: 'email_logo_url',
    primaryColor: 'primary_color',
    secondaryColor: 'secondary_color',
    invoicePrefix: 'invoice_prefix',
    quotationPrefix: 'quotation_prefix',
    invoiceStartNumber: 'invoice_start_number',
    quotationStartNumber: 'quotation_start_number',
    currency: 'currency',
    currencySymbol: 'currency_symbol',
    taxPercentage: 'tax_percentage',
    sacHsnCode: 'sac_hsn_code',
    paymentTerms: 'payment_terms',
    bankAccountName: 'bank_account_name',
    bankName: 'bank_name',
    accountNumber: 'account_number',
    ifscCode: 'ifsc_code',
    upiId: 'upi_id',
    upiQrCodeUrl: 'upi_qr_code_url',
    whatsappOrderNumber: 'whatsapp_order_number',
    whatsappSupportNumber: 'whatsapp_support_number',
    defaultWhatsappTemplate: 'default_whatsapp_template',
    autoReplyMessage: 'auto_reply_message',
    businessHours: 'business_hours',
    supportAvailabilityMessage: 'support_availability_message',
    metaTitle: 'meta_title',
    metaDescription: 'meta_description',
    metaKeywords: 'meta_keywords',
    ogImageUrl: 'og_image_url',
    twitterImageUrl: 'twitter_image_url',
    canonicalUrl: 'canonical_url',
    robotsIndex: 'robots_index',
    smtpHost: 'smtp_host',
    smtpPort: 'smtp_port',
    smtpUsername: 'smtp_username',
    smtpPassword: 'smtp_password',
    smtpSenderName: 'smtp_sender_name',
    smtpSenderEmail: 'smtp_sender_email',
    privacyPolicyUrl: 'privacy_policy_url',
    termsUrl: 'terms_url',
    refundPolicyUrl: 'refund_policy_url',
    shippingPolicyUrl: 'shipping_policy_url',
    workingDays: 'working_days',
    workingHours: 'working_hours',
    holidayMessage: 'holiday_message',
    emergencyContact: 'emergency_contact',
    orderProcessingTime: 'order_processing_time',
    deliveryChargeThreshold: 'delivery_charge_threshold',
    defaultDeliveryCharge: 'default_delivery_charge',
    pickupAvailable: 'pickup_available',
    codAvailable: 'cod_available',
  }

  for (const [camel, snake] of Object.entries(map)) {
    if (camel in data) {
      result[snake] = (data as Record<string, unknown>)[camel]
    }
  }

  return result
}

export async function getBusinessSettings(): Promise<BusinessSettings | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (error) {
    if (error.code === '42P01') return null
    throw new Error(error.message)
  }

  if (!data) return null
  return mapBusinessSettingsRow(data as BusinessSettingsRow)
}

export async function upsertBusinessSettings(data: Partial<BusinessSettings>): Promise<BusinessSettings> {
  const supabase = createAdminSupabaseClient()
  const snakeData = toSnakeCase(data)
  snakeData.updated_at = new Date().toISOString()

  const existing = await getBusinessSettings()
  let result

  if (existing) {
    const { data: updated, error } = await supabase
      .from('business_settings')
      .update(snakeData)
      .eq('id', existing.id)
      .is('deleted_at', null)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    result = updated
  } else {
    snakeData.created_at = new Date().toISOString()
    const { data: created, error } = await supabase
      .from('business_settings')
      .insert(snakeData)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    result = created
  }

  return mapBusinessSettingsRow(result as BusinessSettingsRow)
}
