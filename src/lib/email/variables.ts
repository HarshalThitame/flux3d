// ============================================================================
// Known Variables Registry
// ============================================================================
// Maps each email_type to its expected variable names.
// Used by:
//   - Seed script to know what {{vars}} to inject
//   - Admin UI autocomplete dropdown
//   - Backend triggers to know what data to pre-render into snippets
//
// Arrays / loops are pre-rendered into HTML snippets by the backend trigger
// and passed as a single variable (e.g. {{items_html}}).
// ============================================================================

export type EmailVariableMeta = {
  name: string
  description: string
  example: string
}

export const KNOWN_VARIABLES: Record<string, EmailVariableMeta[]> = {
  welcome: [
    { name: 'customer_name', description: 'Customer first name or full name', example: 'Rutik' },
  ],
  email_verification: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'verification_url', description: 'Link to verify email address', example: 'https://flux3d.in/verify?token=abc' },
  ],
  password_reset: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'reset_url', description: 'Password reset link (valid 1 hour)', example: 'https://flux3d.in/reset?token=abc123' },
  ],
  account_link_confirmation: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'confirm_url', description: 'One-time confirmation link (valid 15 min)', example: 'https://flux3d.in/link/confirm?token=abc123' },
    { name: 'order_count', description: 'Number of guest orders that will be imported', example: '3' },
  ],
  order_placed_customer: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Human-readable order number', example: 'F3D-2026-001234' },
    { name: 'order_total', description: 'Formatted grand total', example: '₹2,499.00' },
    { name: 'items_html', description: 'Pre-rendered HTML list of order items', example: '<tr>…</tr>' },
    { name: 'order_url', description: 'Customer-facing order detail URL', example: 'https://flux3d.in/orders/abc' },
  ],
  order_placed_admin: [
    { name: 'order_number', description: 'Human-readable order number', example: 'F3D-2026-001234' },
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'customer_email', description: 'Customer email address', example: 'rutik@example.com' },
    { name: 'order_total', description: 'Formatted grand total', example: '₹2,499.00' },
    { name: 'admin_order_url', description: 'Admin order review URL', example: 'https://flux3d.in/admin/orders/abc' },
  ],
  model_validation_pass: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Order number', example: 'F3D-2026-001234' },
    { name: 'admin_quote_url', description: 'Admin quote review URL', example: 'https://flux3d.in/admin/quotes/abc' },
  ],
  model_validation_fail: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Order number', example: 'F3D-2026-001234' },
    { name: 'issues_html', description: 'Pre-rendered HTML list of validation issues', example: '<li>Non-manifold edges</li>' },
    { name: 'admin_quote_url', description: 'Admin quote review URL', example: 'https://flux3d.in/admin/quotes/abc' },
  ],
  production_started: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Order number', example: 'F3D-2026-001234' },
    { name: 'print_bed_name', description: 'Printer / bed assigned', example: 'Bed-A (Prusa XL)' },
    { name: 'estimated_completion_date', description: 'Estimated print finish date', example: '15 Aug 2026' },
  ],
  order_shipped: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Order number', example: 'F3D-2026-001234' },
    { name: 'items_html', description: 'Pre-rendered HTML list of shipped items', example: '<tr>…</tr>' },
    { name: 'tracking_number', description: 'Courier tracking number', example: 'AWB123456789' },
    { name: 'courier_name', description: 'Courier company name', example: 'Delhivery' },
    { name: 'tracking_url', description: 'Tracking link', example: 'https://delhivery.com/track/AWB123' },
    { name: 'estimated_delivery', description: 'Estimated delivery date', example: '18 Aug 2026' },
  ],
  delivery_confirmation: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Order number', example: 'F3D-2026-001234' },
    { name: 'review_url', description: 'Optional review / feedback URL', example: 'https://flux3d.in/review/abc' },
  ],
  payment_receipt: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Order number', example: 'F3D-2026-001234' },
    { name: 'order_date', description: 'Formatted order date', example: '10 Aug 2026' },
    { name: 'order_url', description: 'Order detail URL', example: 'https://flux3d.in/orders/abc' },
    { name: 'items_html', description: 'Pre-rendered HTML list of items', example: '<tr>…</tr>' },
    { name: 'pricing_html', description: 'Pre-rendered HTML pricing breakdown', example: '<tr>…</tr>' },
    { name: 'payment_html', description: 'Pre-rendered HTML payment details', example: '<tr>…</tr>' },
    { name: 'shipping_address_html', description: 'Pre-rendered HTML shipping address', example: '<p>…</p>' },
    { name: 'receipt_url', description: 'Optional PDF receipt download URL', example: 'https://flux3d.in/receipts/abc.pdf' },
  ],
  payment_failed: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Order number', example: 'F3D-2026-001234' },
    { name: 'amount', description: 'Formatted failed amount', example: '₹2,499.00' },
    { name: 'retry_url', description: 'Payment retry link', example: 'https://flux3d.in/orders/abc/retry' },
  ],
  refund_issued: [
    { name: 'customer_name', description: 'Customer name', example: 'Rutik' },
    { name: 'order_number', description: 'Order number', example: 'F3D-2026-001234' },
    { name: 'refund_amount', description: 'Formatted refund amount', example: '₹2,499.00' },
    { name: 'refund_method', description: 'Refund method / gateway', example: 'Razorpay (original payment method)' },
    { name: 'expected_date', description: 'Expected refund arrival date', example: '5-7 business days' },
  ],
  contact_notification: [
    { name: 'sender_name', description: 'Contact form submitter name', example: 'Rutik' },
    { name: 'sender_email', description: 'Contact form submitter email', example: 'rutik@example.com' },
    { name: 'sender_phone', description: 'Contact form submitter phone', example: '+91 98765 43210' },
    { name: 'message', description: 'Message body (HTML-escaped)', example: 'Hello, I have a question…' },
  ],
}

export const EMAIL_TYPE_META: Record<string, { category: string; description: string; subject: string }> = {
  welcome: { category: 'transactional', description: 'Sent when a new user signs up', subject: 'Welcome to Flux3D!' },
  email_verification: { category: 'transactional', description: 'Sent after sign-up to verify email', subject: 'Verify your email address' },
  password_reset: { category: 'transactional', description: 'Sent when user requests password reset', subject: 'Reset your Flux3D password' },
  account_link_confirmation: { category: 'transactional', description: 'Sent to confirm a WhatsApp/website account link', subject: 'Confirm your WhatsApp account link' },
  order_placed_customer: { category: 'transactional', description: 'Order confirmation sent to customer', subject: 'Order {{order_number}} confirmed — Flux3D' },
  order_placed_admin: { category: 'admin', description: 'New order alert sent to admin team', subject: '[Admin] New order {{order_number}}' },
  model_validation_pass: { category: 'transactional', description: '3D model passed validation', subject: 'Your 3D model for order {{order_number}} passed validation' },
  model_validation_fail: { category: 'transactional', description: '3D model failed validation with issues', subject: 'Action needed: 3D model issue for order {{order_number}}' },
  production_started: { category: 'transactional', description: 'Printing has begun', subject: 'Production started for order {{order_number}}' },
  order_shipped: { category: 'transactional', description: 'Order dispatched with tracking', subject: 'Your order {{order_number}} has shipped' },
  delivery_confirmation: { category: 'transactional', description: 'Order delivered confirmation', subject: 'Order {{order_number}} delivered — how did we do?' },
  payment_receipt: { category: 'transactional', description: 'Payment confirmation with receipt', subject: 'Payment receipt for order {{order_number}}' },
  payment_failed: { category: 'transactional', description: 'Payment failure with retry link', subject: 'Payment failed for order {{order_number}}' },
  refund_issued: { category: 'transactional', description: 'Refund processed notification', subject: 'Refund issued for order {{order_number}}' },
  contact_notification: { category: 'support', description: 'Contact form submission to support team', subject: 'New contact form submission from {{sender_name}}' },
}

export function getVariableNames(emailType: string): string[] {
  return (KNOWN_VARIABLES[emailType] ?? []).map((v) => v.name)
}
