import { enqueueEmail } from './producer'
import type {
  WelcomeEmailPayload,
  EmailVerificationPayload,
  PasswordResetPayload,
  OrderPlacedCustomerPayload,
  OrderPlacedAdminPayload,
  ModelValidationPayload,
  ProductionStartedPayload,
  OrderShippedPayload,
  DeliveryConfirmationPayload,
  PaymentReceiptPayload,
  PaymentFailedPayload,
  RefundIssuedPayload,
  ContactNotificationPayload,
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
  resetUrl: string
) {
  return enqueueEmail({
    emailType: 'password_reset',
    userId,
    recipient: email,
    customerName,
    resetUrl,
  } as PasswordResetPayload)
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
  return enqueueEmail({
    emailType: 'order_placed_admin',
    recipient: adminEmail,
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
