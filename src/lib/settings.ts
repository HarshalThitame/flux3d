import "server-only";
import { createAdminSupabaseClient } from "@/lib/admin/server";
import type {
  BusinessSettings,
  BusinessSettingsRow,
} from "@/lib/admin/business-settings";
import {
  FALLBACK_SETTINGS,
  getFallbackSettings,
} from "@/lib/settings-fallback";

const FALLBACK = FALLBACK_SETTINGS;

export { getFallbackSettings };

function n(value: string | null | undefined): string {
  return value ?? "";
}

function bool(value: boolean | null | undefined): boolean {
  return value ?? false;
}

function num(value: number | null | undefined): number {
  return value ?? 0;
}

function parseCartDiscountTiers(
  value: unknown,
  fallback: BusinessSettings["cartDiscountTiers"],
): BusinessSettings["cartDiscountTiers"] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const tiers = value
    .map((tier) => {
      if (!tier || typeof tier !== "object") return null;
      const record = tier as Record<string, unknown>;
      const minCartValue = Number(record.min_cart_value ?? record.minCartValue);
      const discountPercent = Number(
        record.discount_percent ?? record.discountPercent,
      );

      if (!Number.isFinite(minCartValue) || !Number.isFinite(discountPercent)) {
        return null;
      }

      return {
        minCartValue: Math.max(0, minCartValue),
        discountPercent: Math.max(0, discountPercent),
      };
    })
    .filter((tier): tier is BusinessSettings["cartDiscountTiers"][number] =>
      Boolean(tier),
    )
    .sort((left, right) => left.minCartValue - right.minCartValue);

  return tiers.length > 0 ? tiers : fallback;
}

function parsePostProcessingMultipliers(
  value: unknown,
  fallback: BusinessSettings["postProcessingMultipliers"],
): BusinessSettings["postProcessingMultipliers"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallback;
  }

  return Object.entries(value as Record<string, unknown>).reduce<
    BusinessSettings["postProcessingMultipliers"]
  >(
    (acc, [key, raw]) => {
      const next = Number(raw);
      acc[key] = Number.isFinite(next)
        ? Math.max(0, next)
        : (fallback[key] ?? 0);
      return acc;
    },
    { ...fallback },
  );
}

function mapRow(row: BusinessSettingsRow): BusinessSettings {
  return {
    id: row.id,
    businessName: n(row.business_name) || FALLBACK.businessName,
    legalBusinessName: n(row.legal_business_name) || FALLBACK.legalBusinessName,
    brandName: n(row.brand_name) || FALLBACK.brandName,
    tagline: n(row.tagline) || FALLBACK.tagline,
    businessDescription:
      n(row.business_description) || FALLBACK.businessDescription,
    gstNumber: n(row.gst_number),
    panNumber: n(row.pan_number),
    cinNumber: n(row.cin_number),
    msmeNumber: n(row.msme_number),
    businessType: n(row.business_type),
    primaryEmail: n(row.primary_email) || FALLBACK.primaryEmail,
    supportEmail: n(row.support_email) || FALLBACK.supportEmail,
    salesEmail: n(row.sales_email) || FALLBACK.salesEmail,
    billingEmail: n(row.billing_email) || FALLBACK.billingEmail,
    primaryPhone: n(row.primary_phone) || FALLBACK.primaryPhone,
    whatsappNumber: n(row.whatsapp_number) || FALLBACK.whatsappNumber,
    alternatePhone: n(row.alternate_phone),
    tollFreeNumber: n(row.toll_free_number),
    addressLine1: n(row.address_line_1) || FALLBACK.addressLine1,
    addressLine2: n(row.address_line_2),
    landmark: n(row.landmark),
    city: n(row.city) || FALLBACK.city,
    state: n(row.state) || FALLBACK.state,
    country: n(row.country) || FALLBACK.country,
    postalCode: n(row.postal_code) || FALLBACK.postalCode,
    billingSameAsOffice: bool(row.billing_same_as_office),
    billingAddressLine1: n(row.billing_address_line_1),
    billingAddressLine2: n(row.billing_address_line_2),
    billingCity: n(row.billing_city),
    billingState: n(row.billing_state),
    billingCountry: n(row.billing_country),
    billingPostalCode: n(row.billing_postal_code),
    instagramUrl: n(row.instagram_url) || FALLBACK.instagramUrl,
    facebookUrl: n(row.facebook_url),
    linkedinUrl: n(row.linkedin_url) || FALLBACK.linkedinUrl,
    twitterUrl: n(row.twitter_url) || FALLBACK.twitterUrl,
    youtubeUrl: n(row.youtube_url) || FALLBACK.youtubeUrl,
    threadsUrl: n(row.threads_url),
    pinterestUrl: n(row.pinterest_url),
    githubUrl: n(row.github_url),
    websiteUrl: n(row.website_url),
    logoUrl: n(row.logo_url) || FALLBACK.logoUrl,
    darkLogoUrl: n(row.dark_logo_url),
    faviconUrl: n(row.favicon_url) || FALLBACK.faviconUrl,
    invoiceLogoUrl: n(row.invoice_logo_url),
    emailLogoUrl: n(row.email_logo_url),
    primaryColor: n(row.primary_color) || FALLBACK.primaryColor,
    secondaryColor: n(row.secondary_color) || FALLBACK.secondaryColor,
    invoicePrefix: n(row.invoice_prefix) || FALLBACK.invoicePrefix,
    quotationPrefix: n(row.quotation_prefix) || FALLBACK.quotationPrefix,
    invoiceStartNumber:
      num(row.invoice_start_number) || FALLBACK.invoiceStartNumber,
    quotationStartNumber:
      num(row.quotation_start_number) || FALLBACK.quotationStartNumber,
    shopInvoicePrefix: n(row.shop_invoice_prefix) || FALLBACK.shopInvoicePrefix,
    shopInvoiceStartNumber:
      num(row.shop_invoice_start_number) || FALLBACK.shopInvoiceStartNumber,
    currency: n(row.currency) || FALLBACK.currency,
    currencySymbol: n(row.currency_symbol) || FALLBACK.currencySymbol,
    taxPercentage: row.tax_percentage ?? FALLBACK.taxPercentage,
    gstEnabled: row.gst_enabled ?? FALLBACK.gstEnabled,
    cgstPercent: row.cgst_percent ?? FALLBACK.cgstPercent,
    sgstPercent: row.sgst_percent ?? FALLBACK.sgstPercent,
    sacHsnCode: n(row.sac_hsn_code),
    paymentTerms: n(row.payment_terms),
    bankAccountName: n(row.bank_account_name),
    bankName: n(row.bank_name),
    accountNumber: n(row.account_number),
    ifscCode: n(row.ifsc_code),
    upiId: n(row.upi_id),
    upiQrCodeUrl: n(row.upi_qr_code_url),
    whatsappOrderNumber:
      n(row.whatsapp_order_number) || FALLBACK.whatsappOrderNumber,
    whatsappSupportNumber:
      n(row.whatsapp_support_number) || FALLBACK.whatsappSupportNumber,
    defaultWhatsappTemplate: n(row.default_whatsapp_template),
    autoReplyMessage: n(row.auto_reply_message),
    businessHours: n(row.business_hours) || FALLBACK.businessHours,
    supportAvailabilityMessage: n(row.support_availability_message),
    metaTitle: n(row.meta_title) || FALLBACK.metaTitle,
    metaDescription: n(row.meta_description) || FALLBACK.metaDescription,
    metaKeywords: n(row.meta_keywords) || FALLBACK.metaKeywords,
    ogImageUrl: n(row.og_image_url) || FALLBACK.ogImageUrl,
    twitterImageUrl: n(row.twitter_image_url),
    canonicalUrl: n(row.canonical_url),
    robotsIndex: bool(row.robots_index),
    smtpHost: n(row.smtp_host),
    smtpPort: num(row.smtp_port),
    smtpUsername: n(row.smtp_username),
    smtpPassword: n(row.smtp_password),
    smtpSenderName: n(row.smtp_sender_name),
    smtpSenderEmail: n(row.smtp_sender_email),
    resendApiKey: n(row.resend_api_key),
    resendSenderDomain:
      n(row.resend_sender_domain) || FALLBACK.resendSenderDomain,
    resendSenderName: n(row.resend_sender_name) || FALLBACK.resendSenderName,
    resendSenderEmail: n(row.resend_sender_email) || FALLBACK.resendSenderEmail,
    resendWebhookSecret: n(row.resend_webhook_secret),
    complaintsEmail: n(row.complaints_email) || FALLBACK.complaintsEmail,
    privacyPolicyUrl: n(row.privacy_policy_url),
    termsUrl: n(row.terms_url),
    refundPolicyUrl: n(row.refund_policy_url),
    shippingPolicyUrl: n(row.shipping_policy_url),
    workingDays: n(row.working_days) || FALLBACK.workingDays,
    workingHours: n(row.working_hours) || FALLBACK.workingHours,
    holidayMessage: n(row.holiday_message),
    emergencyContact: n(row.emergency_contact),
    orderProcessingTime:
      n(row.order_processing_time) || FALLBACK.orderProcessingTime,
    deliveryChargeThreshold:
      row.delivery_charge_threshold ?? FALLBACK.deliveryChargeThreshold,
    defaultDeliveryCharge:
      row.default_delivery_charge ?? FALLBACK.defaultDeliveryCharge,
    shopMinimumOrderValue:
      row.shop_min_order_value ?? FALLBACK.shopMinimumOrderValue,
    overheadPercentage: row.overhead_percent ?? FALLBACK.overheadPercentage,
    marginPercentage: row.margin_percentage ?? FALLBACK.marginPercentage,
    materialMarkupPercent:
      row.material_markup_percent ?? FALLBACK.materialMarkupPercent,
    printSpeedGramsPerHour:
      row.print_speed_grams_per_hour ?? FALLBACK.printSpeedGramsPerHour,
    postProcessingMultipliers: parsePostProcessingMultipliers(
      row.post_processing_multipliers,
      FALLBACK.postProcessingMultipliers,
    ),
    cartDiscountEnabled:
      row.cart_discount_enabled ?? FALLBACK.cartDiscountEnabled,
    cartDiscountTiers: parseCartDiscountTiers(
      row.cart_discount_tiers,
      FALLBACK.cartDiscountTiers,
    ),
    minimumOrderValue: row.minimum_order_value ?? FALLBACK.minimumOrderValue,
    gstInclusivePricing:
      row.gst_inclusive_pricing ?? FALLBACK.gstInclusivePricing,
    pickupAvailable: bool(row.pickup_available),
    paymentsEnabled: bool(row.payments_enabled ?? true),
    razorpayEnabled: bool(row.razorpay_enabled ?? true),
    razorpayKeyId: n(row.razorpay_key_id),
    razorpayEnvironment: n(row.razorpay_environment),
    razorpayCheckoutName: n(row.razorpay_checkout_name),
    razorpayCheckoutDescription: n(row.razorpay_checkout_description),
    razorpayBrandColor: n(row.razorpay_brand_color),
    razorpayPaymentMethods: n(row.razorpay_payment_methods),
    razorpayTimeoutMinutes: num(row.razorpay_timeout_minutes),
    razorpayOrderBufferMinutes: num(row.razorpay_order_buffer_minutes),
    razorpayWebhookHealthy: bool(row.razorpay_webhook_healthy),
    razorpayLastConnectionCheckAt: n(row.razorpay_last_connection_check_at),
    razorpayLastConnectionStatus: n(row.razorpay_last_connection_status),
    razorpayLastConnectionMessage: n(row.razorpay_last_connection_message),
    razorpayRefundPermissionMode: n(row.razorpay_refund_permission_mode),
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

let cachedSettings: { data: BusinessSettings | null; expiry: number } | null =
  null;
const CACHE_TTL_MS = 60_000;

export async function getCachedBusinessSettings(): Promise<BusinessSettings | null> {
  const now = Date.now();

  // Return cached data immediately if available (don't wait for refresh)
  if (cachedSettings && now < cachedSettings.expiry) {
    return cachedSettings.data;
  }

  try {
    const supabase = createAdminSupabaseClient();
    // Race the query against a 4-second timeout
    const queryPromise = supabase
      .from("business_settings")
      .select("*")
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    const timeoutPromise = new Promise<{ data: null; error: { code: string } }>(
      (resolve) =>
        setTimeout(
          () => resolve({ data: null, error: { code: "TIMEOUT" } }),
          4000,
        ),
    );
    const raceResult = await Promise.race([queryPromise, timeoutPromise]);
    const { data, error } = raceResult as {
      data: unknown;
      error: { code: string } | null;
    };

    if (error) {
      if (error.code === "42P01") {
        cachedSettings = { data: null, expiry: now + CACHE_TTL_MS };
        return null;
      }
      return cachedSettings?.data ?? null;
    }

    if (!data) {
      cachedSettings = { data: null, expiry: now + CACHE_TTL_MS };
      return null;
    }

    const result = mapRow(data as BusinessSettingsRow);
    cachedSettings = { data: result, expiry: now + CACHE_TTL_MS };
    return result;
  } catch {
    return cachedSettings?.data ?? null;
  }
}

export function invalidateSettingsCache() {
  cachedSettings = null;
}

export async function getSettings(): Promise<BusinessSettings> {
  const settings = await getCachedBusinessSettings();
  return settings ?? FALLBACK;
}

export type PublicBusinessSettings = Omit<
  BusinessSettings,
  | "smtpHost"
  | "smtpPort"
  | "smtpUsername"
  | "smtpPassword"
  | "smtpSenderName"
  | "smtpSenderEmail"
  | "accountNumber"
  | "ifscCode"
  | "bankAccountName"
  | "bankName"
  | "upiId"
  | "upiQrCodeUrl"
  | "resendApiKey"
  | "resendWebhookSecret"
>;

export async function getPublicSettings(): Promise<PublicBusinessSettings> {
  const settings = await getSettings();
  const publicSettings = { ...settings };
  delete (publicSettings as Record<string, unknown>).smtpHost;
  delete (publicSettings as Record<string, unknown>).smtpPort;
  delete (publicSettings as Record<string, unknown>).smtpUsername;
  delete (publicSettings as Record<string, unknown>).smtpPassword;
  delete (publicSettings as Record<string, unknown>).smtpSenderName;
  delete (publicSettings as Record<string, unknown>).smtpSenderEmail;
  delete (publicSettings as Record<string, unknown>).accountNumber;
  delete (publicSettings as Record<string, unknown>).ifscCode;
  delete (publicSettings as Record<string, unknown>).bankAccountName;
  delete (publicSettings as Record<string, unknown>).bankName;
  delete (publicSettings as Record<string, unknown>).upiId;
  delete (publicSettings as Record<string, unknown>).upiQrCodeUrl;
  delete (publicSettings as Record<string, unknown>).resendApiKey;
  delete (publicSettings as Record<string, unknown>).resendWebhookSecret;
  return publicSettings as PublicBusinessSettings;
}
