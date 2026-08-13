import { normalizeSiteUrl, getConfiguredSiteUrl } from '@/lib/site'
import type { EmailType } from '../../../types/database'

// ============================================================================
// Email Job Payloads — union discriminated by emailType
// ============================================================================

export type BaseEmailPayload = {
  emailType: EmailType
  userId?: string | null
  recipient: string
  subject?: string
  logId?: string
  orderId?: string | null
  orderType?: 'custom' | 'shop' | null
}

export type WelcomeEmailPayload = BaseEmailPayload & {
  emailType: 'welcome'
  customerName: string
}

export type EmailVerificationPayload = BaseEmailPayload & {
  emailType: 'email_verification'
  customerName: string
  verificationUrl: string
}

export type PasswordResetPayload = BaseEmailPayload & {
  emailType: 'password_reset'
  customerName: string
  resetUrl: string
  /** IP address of the device that requested the reset (for the "wasn't you" notice) */
  ipAddress: string
  /** Human-readable device label, e.g. "Chrome on Windows" */
  device: string
}

export type PasswordChangedPayload = BaseEmailPayload & {
  emailType: 'password_changed'
  customerName: string
  /** Localized timestamp of when the password was changed, e.g. "13 Aug 2026, 21:45" */
  changedAt: string
  /** IP address of the device that changed the password */
  ipAddress: string
  /** Human-readable device label, e.g. "Chrome on Windows" */
  device: string
}

export type AccountLinkConfirmationPayload = BaseEmailPayload & {
  emailType: 'account_link_confirmation'
  customerName: string
  confirmUrl: string
  orderCount: number
  phone: string
}

export type OrderPlacedCustomerPayload = BaseEmailPayload & {
  emailType: 'order_placed_customer'
  orderNumber: string
  customerName: string
  total: string
  items: { name: string; material?: string; color?: string; quantity: number; price: string }[]
  orderUrl: string
  /** Pre-rendered HTML list of order items (optional — backend can inject) */
  itemsHtml?: string
}

export type OrderPlacedAdminPayload = BaseEmailPayload & {
  emailType: 'order_placed_admin'
  orderNumber: string
  customerEmail: string
  customerName: string
  total: string
  adminOrderUrl: string
}

export type ModelValidationPayload = BaseEmailPayload & {
  emailType: 'model_validation_pass' | 'model_validation_fail'
  orderNumber: string
  customerName: string
  issues?: string[]
  adminQuoteUrl?: string
  /** Pre-rendered HTML list of validation issues (for fail emails) */
  issuesHtml?: string
}

export type ProductionStartedPayload = BaseEmailPayload & {
  emailType: 'production_started'
  orderNumber: string
  customerName: string
  printBedName?: string
  estimatedCompletionDate?: string
}

export type OrderShippedPayload = BaseEmailPayload & {
  emailType: 'order_shipped'
  orderNumber: string
  customerName: string
  items: { name: string; material?: string; color?: string; quantity: number; imageUrl?: string }[]
  trackingNumber: string
  courierName: string
  trackingUrl: string
  estimatedDelivery?: string
  /** Pre-rendered HTML list of shipped items (optional — backend can inject) */
  itemsHtml?: string
}

export type DeliveryConfirmationPayload = BaseEmailPayload & {
  emailType: 'delivery_confirmation'
  orderNumber: string
  customerName: string
  reviewUrl?: string
}

export type PaymentReceiptPayload = BaseEmailPayload & {
  emailType: 'payment_receipt'
  orderNumber: string
  customerName: string
  orderDate: string
  orderUrl: string
  items: {
    name: string
    material?: string
    color?: string
    quantity: number
    unitPrice: string
    totalPrice: string
    variant?: string
  }[]
  pricing: {
    subtotal: string
    discount: string
    shipping: string
    tax: string
    grandTotal: string
  }
  payment: {
    method: string
    paymentId: string
    amount: string
    date: string
    status: string
  }
  shippingAddress: {
    name: string
    phone: string
    line1: string
    line2?: string | null
    city: string
    state: string
    pincode: string
  }
  receiptUrl?: string
  /** Pre-rendered HTML snippets (optional — backend can inject instead of raw arrays) */
  itemsHtml?: string
  pricingHtml?: string
  paymentHtml?: string
  shippingAddressHtml?: string
}

export type PaymentFailedPayload = BaseEmailPayload & {
  emailType: 'payment_failed'
  orderNumber: string
  customerName: string
  amount: string
  retryUrl: string
}

export type RefundIssuedPayload = BaseEmailPayload & {
  emailType: 'refund_issued'
  orderNumber: string
  customerName: string
  refundAmount: string
  refundMethod: string
  expectedDate?: string
}

export type ContactNotificationPayload = BaseEmailPayload & {
  emailType: 'contact_notification'
  senderName: string
  senderEmail: string
  senderPhone: string
  message: string
}

export type StockAlertDigestItem = {
  productName: string
  skuCode: string
  variantLabel: string
  stockQuantity: number
  threshold: number
  alertType: 'low_stock' | 'out_of_stock'
}

export type StockAlertDigestPayload = BaseEmailPayload & {
  emailType: 'stock_alert'
  alertCount: number
  lowStockCount: number
  outOfStockCount: number
  items: StockAlertDigestItem[]
  /** Pre-rendered HTML list of stock alerts (optional) */
  itemsHtml?: string
}

export type BackInStockPayload = BaseEmailPayload & {
  emailType: 'back_in_stock'
  customerName: string
  productName: string
  variantLabel: string
  productUrl: string
}

export type EmailJobPayload =
  | WelcomeEmailPayload
  | EmailVerificationPayload
  | PasswordResetPayload
  | PasswordChangedPayload
  | AccountLinkConfirmationPayload
  | OrderPlacedCustomerPayload
  | OrderPlacedAdminPayload
  | ModelValidationPayload
  | ProductionStartedPayload
  | OrderShippedPayload
  | DeliveryConfirmationPayload
  | PaymentReceiptPayload
  | PaymentFailedPayload
  | RefundIssuedPayload
  | ContactNotificationPayload
  | StockAlertDigestPayload
  | BackInStockPayload

// ============================================================================
// Dispatcher result shape
// ============================================================================
export type DispatchResult =
  | { ok: true; messageId: string; resendId?: string }
  | { ok: false; error: string }

// ============================================================================
// QStash configuration
// ============================================================================
const baseUrl = normalizeSiteUrl(getConfiguredSiteUrl())

export const QSTASH_ENDPOINT = baseUrl ? `${baseUrl}/api/email/send` : '/api/email/send'
