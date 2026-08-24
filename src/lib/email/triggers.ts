import { enqueueEmail } from './producer'
import { getAdminEmail } from './admin-email'
import type {
  WelcomeEmailPayload,
  EmailVerificationPayload,
  PasswordResetPayload,
  PasswordChangedPayload,
  ReviewThankYouPayload,
  AccountLinkConfirmationPayload,
  OrderPlacedCustomerPayload,
  OrderPlacedAdminPayload,
  ModelValidationPayload,
  ProductionStartedPayload,
  OrderShippedPayload,
  DeliveryConfirmationPayload,
  OutForDeliveryPayload,
  MagicLinkLoginPayload,
  PaymentReceiptPayload,
  PaymentFailedPayload,
  RefundIssuedPayload,
  ContactNotificationPayload,
  StockAlertDigestPayload,
  BackInStockPayload,
} from './types'

// ============================================================================
// Identity Lifecycle Triggers
// ============================================================================

export async function sendWelcomeEmail(userId: string, email: string, customerName: string) {
  return enqueueEmail({
    emailType: 'welcome',
    userId,
    recipient: email,
    customerName,
  } as WelcomeEmailPayload)
}

export async function sendEmailVerification(
  userId: string,
  email: string,
  customerName: string,
  verificationUrl: string
) {
  return enqueueEmail({
    emailType: 'email_verification',
    userId,
    recipient: email,
    customerName,
    verificationUrl,
  } as EmailVerificationPayload)
}

export async function sendPasswordReset(
  userId: string,
  email: string,
  customerName: string,
  resetUrl: string,
  ipAddress: string,
  device: string
) {
  return enqueueEmail({
    emailType: 'password_reset',
    userId,
    recipient: email,
    customerName,
    resetUrl,
    ipAddress,
    device,
  } as PasswordResetPayload)
}

export async function sendPasswordChangedNotification(
  userId: string,
  email: string,
  customerName: string,
  changedAt: string,
  ipAddress: string,
  device: string
) {
  return enqueueEmail({
    emailType: 'password_changed',
    userId,
    recipient: email,
    customerName,
    changedAt,
    ipAddress,
    device,
  } as PasswordChangedPayload)
}

export async function sendAccountLinkConfirmation(
  userId: string,
  email: string,
  customerName: string,
  confirmUrl: string,
  orderCount: number,
  phone: string
) {
  return enqueueEmail({
    emailType: 'account_link_confirmation',
    userId,
    recipient: email,
    customerName,
    confirmUrl,
    orderCount,
    phone,
  } as AccountLinkConfirmationPayload)
}

// ============================================================================
// Order Lifecycle Triggers
// ============================================================================

export async function sendOrderPlacedCustomer(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  total: string,
  items: OrderPlacedCustomerPayload['items'],
  orderUrl: string
) {
  return enqueueEmail({
    emailType: 'order_placed_customer',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    total,
    items,
    orderUrl,
  } as OrderPlacedCustomerPayload)
}

export async function sendOrderPlacedAdmin(
  adminEmail: string,
  orderNumber: string,
  customerEmail: string,
  customerName: string,
  total: string,
  adminOrderUrl: string
) {
  const recipient = adminEmail || await getAdminEmail()
  if (!recipient) {
    console.warn('[email] Cannot send order_placed_admin — no admin email configured')
    return
  }
  return enqueueEmail({
    emailType: 'order_placed_admin',
    recipient,
    orderNumber,
    customerEmail,
    customerName,
    total,
    adminOrderUrl,
  } as OrderPlacedAdminPayload)
}

export async function sendModelValidationResult(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  passed: boolean,
  issues?: string[],
  adminQuoteUrl?: string
) {
  return enqueueEmail({
    emailType: passed ? 'model_validation_pass' : 'model_validation_fail',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    issues,
    adminQuoteUrl,
  } as ModelValidationPayload)
}

export async function sendProductionStarted(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  printBedName?: string,
  estimatedCompletionDate?: string
) {
  return enqueueEmail({
    emailType: 'production_started',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    printBedName,
    estimatedCompletionDate,
  } as ProductionStartedPayload)
}

export async function sendOrderShipped(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  items: OrderShippedPayload['items'],
  trackingNumber: string,
  courierName: string,
  trackingUrl: string,
  estimatedDelivery?: string
) {
  return enqueueEmail({
    emailType: 'order_shipped',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    items,
    trackingNumber,
    courierName,
    trackingUrl,
    estimatedDelivery,
  } as OrderShippedPayload)
}

export async function sendDeliveryConfirmation(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  reviewUrl?: string
) {
  return enqueueEmail({
    emailType: 'delivery_confirmation',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    reviewUrl,
  } as DeliveryConfirmationPayload)
}

export async function sendOutForDelivery(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  tracking?: { number?: string; courierName?: string; url?: string }
) {
  return enqueueEmail({
    emailType: 'out_for_delivery',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    trackingNumber: tracking?.number,
    courierName: tracking?.courierName,
    trackingUrl: tracking?.url,
  } as OutForDeliveryPayload)
}

/**
 * Magic-link login email (guest account claiming).
 *
 * `loginUrl` is a Supabase-generated action link — treat it like a password
 * reset secret: never log it, single-use, short expiry.
 */
export async function sendMagicLinkLogin(
  email: string,
  loginUrl: string,
  expiresInMinutes = 60
) {
  return enqueueEmail({
    emailType: 'magic_link_login',
    recipient: email,
    loginUrl,
    expiresInMinutes,
  } as MagicLinkLoginPayload)
}

export async function sendReviewReminder(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  itemsHtml: string,
  reviewUrl: string
) {
  return enqueueEmail({
    emailType: 'review_reminder',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    itemsHtml,
    reviewUrl,
  } as import('./types').ReviewReminderPayload)
}

export async function sendReviewThankYou(
  userId: string,
  email: string,
  customerName: string,
  productName: string,
  productUrl: string
) {
  return enqueueEmail({
    emailType: 'review_thank_you',
    userId,
    recipient: email,
    customerName,
    productName,
    productUrl,
  } as import('./types').ReviewThankYouPayload)
}

// ============================================================================
// Billing Lifecycle Triggers
// ============================================================================

export async function sendPaymentReceipt(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  orderDate: string,
  orderUrl: string,
  items: PaymentReceiptPayload['items'],
  pricing: PaymentReceiptPayload['pricing'],
  payment: PaymentReceiptPayload['payment'],
  shippingAddress: PaymentReceiptPayload['shippingAddress'],
  orderId?: string,
  orderType?: 'custom' | 'shop',
  receiptUrl?: string
) {
  return enqueueEmail({
    emailType: 'payment_receipt',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    orderDate,
    orderUrl,
    items,
    pricing,
    payment,
    shippingAddress,
    orderId: orderId ?? null,
    orderType: orderType ?? null,
    receiptUrl,
  } as PaymentReceiptPayload)
}

export async function sendPaymentFailed(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  amount: string,
  retryUrl: string
) {
  return enqueueEmail({
    emailType: 'payment_failed',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    amount,
    retryUrl,
  } as PaymentFailedPayload)
}

export async function sendRefundIssued(
  userId: string,
  email: string,
  orderNumber: string,
  customerName: string,
  refundAmount: string,
  refundMethod: string,
  expectedDate?: string
) {
  return enqueueEmail({
    emailType: 'refund_issued',
    userId,
    recipient: email,
    orderNumber,
    customerName,
    refundAmount,
    refundMethod,
    expectedDate,
  } as RefundIssuedPayload)
}

// ============================================================================
// Contact Form Notification
// ============================================================================

export async function sendContactNotification(
  supportEmail: string,
  senderName: string,
  senderEmail: string,
  senderPhone: string,
  message: string
) {
  return enqueueEmail({
    emailType: 'contact_notification',
    recipient: supportEmail,
    senderName,
    senderEmail,
    senderPhone,
    message,
  } as ContactNotificationPayload)
}

// ============================================================================
// Stock Alert Digest (admin)
// ============================================================================

export async function sendStockAlertDigest(
  items: StockAlertDigestPayload['items'],
  alertCount: number,
  lowStockCount: number,
  outOfStockCount: number
) {
  const recipient = await getAdminEmail()
  if (!recipient) {
    console.warn('[email] Cannot send stock_alert — no admin email configured')
    return
  }
  if (items.length === 0) {
    return
  }
  return enqueueEmail({
    emailType: 'stock_alert',
    recipient,
    alertCount,
    lowStockCount,
    outOfStockCount,
    items,
  } as StockAlertDigestPayload)
}

export async function sendBackInStock(
  userId: string | null,
  email: string,
  customerName: string,
  productName: string,
  variantLabel: string,
  productUrl: string
) {
  return enqueueEmail({
    emailType: 'back_in_stock',
    userId,
    recipient: email,
    customerName,
    productName,
    variantLabel,
    productUrl,
  } as BackInStockPayload)
}
