// ============================================================================
// Payload Renderer — Auto-generate HTML snippets from typed payloads
// ============================================================================
// When the backend trigger passes raw arrays/objects but the DB template
// expects a pre-rendered _html snippet, these helpers auto-generate the
// markup so the dispatcher never has to fall back to React Email.
//
// Usage inside dispatcher.ts:
//   if (!payload.itemsHtml) vars.items_html = renderOrderItemsHtml(payload.items)
// ============================================================================

import type {
  OrderPlacedCustomerPayload,
  OrderShippedPayload,
  PaymentReceiptPayload,
  ModelValidationPayload,
  StockAlertDigestPayload,
} from './types'

export function renderOrderItemsHtml(
  items: Array<{
    name: string
    material?: string
    color?: string
    quantity: number
    price?: string
    unitPrice?: string
    totalPrice?: string
    variant?: string
  }>
): string {
  if (!items || items.length === 0) return ''
  const rows = items
    .map(
      (it) => {
        const price = it.totalPrice ?? it.price ?? it.unitPrice ?? ''
        const variantLabel = it.variant ? ` · ${escapeHtml(it.variant)}` : ''
        return `<tr style="margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;">
  <td style="width:75%;vertical-align:middle;">
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 4px;" class="email-text">${escapeHtml(it.name)}</p>
    <p style="font-size:13px;color:#6b7280;margin:0;" class="email-muted">${escapeHtml(it.material ?? '')}${it.color ? ` · ${escapeHtml(it.color)}` : ''}${variantLabel} · Qty: ${it.quantity}</p>
  </td>
  <td style="width:25%;text-align:right;vertical-align:middle;">
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(price)}</p>
  </td>
</tr>`
      }
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>`
}

export function renderShippedItemsHtml(
  items: OrderShippedPayload['items']
): string {
  if (!items || items.length === 0) return ''
  const rows = items
    .map(
      (it) =>
        `<tr style="margin-bottom:12px;">
  <td style="width:80%;vertical-align:middle;">
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 4px;" class="email-text">${escapeHtml(it.name)}</p>
    <p style="font-size:13px;color:#6b7280;margin:0;" class="email-muted">${escapeHtml(it.material ?? '')}${it.color ? ` · ${escapeHtml(it.color)}` : ''} · Qty: ${it.quantity}</p>
  </td>
</tr>`
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>`
}

export function renderPricingHtml(
  pricing: PaymentReceiptPayload['pricing']
): string {
  const rows: string[] = []
  rows.push(`<tr style="margin-bottom:8px;"><td><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Subtotal</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(pricing.subtotal)}</p></td></tr>`)
  if (pricing.discount && pricing.discount !== '₹0.00') {
    rows.push(`<tr style="margin-bottom:8px;"><td><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Discount</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:600;color:#16a34a;margin:0;">${escapeHtml(pricing.discount)}</p></td></tr>`)
  }
  if (pricing.shipping && pricing.shipping !== 'Free') {
    rows.push(`<tr style="margin-bottom:8px;"><td><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Shipping</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(pricing.shipping)}</p></td></tr>`)
  }
  if (pricing.tax && pricing.tax !== '₹0.00') {
    rows.push(`<tr style="margin-bottom:8px;"><td><p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">Tax (GST)</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(pricing.tax)}</p></td></tr>`)
  }
  rows.push(`<tr><td colspan="2"><hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;"></td></tr>`)
  rows.push(`<tr><td><p style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0;" class="email-text">Grand Total</p></td><td style="text-align:right;"><p style="font-size:14px;font-weight:700;color:#FF5C1A;margin:0;">${escapeHtml(pricing.grandTotal)}</p></td></tr>`)
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:16px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;" class="email-card">${rows.join('')}</table>`
}

export function renderPaymentHtml(
  payment: PaymentReceiptPayload['payment']
): string {
  const rows: string[] = []
  rows.push(`<tr style="margin-top:12px;"><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Payment Method</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(payment.method)}</p></td><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Transaction ID</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(payment.paymentId)}</p></td></tr>`)
  rows.push(`<tr style="margin-top:12px;"><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Amount Paid</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(payment.amount)}</p></td><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Status</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(payment.status)}</p></td></tr>`)
  rows.push(`<tr style="margin-top:12px;"><td style="width:50%;vertical-align:top;"><p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5;color:#6b7280;margin:0 0 4px;" class="email-muted">Payment Date</p><p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0;" class="email-text">${escapeHtml(payment.date)}</p></td></tr>`)
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 32px 24px;padding:20px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;" class="email-card">${rows.join('')}</table>`
}

export function renderShippingAddressHtml(
  address: PaymentReceiptPayload['shippingAddress']
): string {
  const lines: string[] = []
  lines.push(`<p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 4px;" class="email-text">${escapeHtml(address.name)}</p>`)
  if (address.phone) lines.push(`<p style="font-size:14px;color:#6b7280;margin:0 0 2px;" class="email-muted">${escapeHtml(address.phone)}</p>`)
  lines.push(`<p style="font-size:14px;color:#6b7280;margin:0 0 2px;" class="email-muted">${escapeHtml(address.line1)}</p>`)
  if (address.line2) lines.push(`<p style="font-size:14px;color:#6b7280;margin:0 0 2px;" class="email-muted">${escapeHtml(address.line2)}</p>`)
  lines.push(`<p style="font-size:14px;color:#6b7280;margin:0;" class="email-muted">${escapeHtml(address.city)}, ${escapeHtml(address.state)} — ${escapeHtml(address.pincode)}</p>`)
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 32px 24px;padding:20px;background-color:#f9fafb;border-radius:10px;border:1px solid #e5e7eb;" class="email-card"><tr><td>${lines.join('')}</td></tr></table>`
}

export function renderIssuesHtml(
  issues: ModelValidationPayload['issues']
): string {
  if (!issues || issues.length === 0) return ''
  const list = issues
    .map(
      (issue) =>
        `<p style="font-size:14px;color:#6b7280;margin:4px 0;" class="email-muted">&bull; ${escapeHtml(issue)}</p>`
    )
    .join('')
  return list
}

export function renderStockAlertItemsHtml(
  items: StockAlertDigestPayload['items']
): string {
  if (!items || items.length === 0) return ''
  const rows = items
    .slice(0, 30)
    .map(
      (it) => {
        const tone =
          it.alertType === 'out_of_stock'
            ? 'color:#dc2626;font-weight:700'
            : 'color:#b45309;font-weight:700'
        const statusLabel =
          it.alertType === 'out_of_stock' ? 'Out of stock' : `Low · ${it.stockQuantity} left`
        return `<tr style="margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;">
  <td style="width:70%;vertical-align:middle;">
    <p style="font-size:15px;font-weight:600;color:#1a1a1a;margin:0 0 4px;" class="email-text">${escapeHtml(it.productName)}</p>
    <p style="font-size:13px;color:#6b7280;margin:0;" class="email-muted">${escapeHtml(it.skuCode)}${it.variantLabel ? ` · ${escapeHtml(it.variantLabel)}` : ''}</p>
  </td>
  <td style="width:30%;text-align:right;vertical-align:middle;">
    <p style="font-size:13px;${tone};margin:0;" class="email-text">${escapeHtml(statusLabel)}</p>
  </td>
</tr>`
      }
    )
    .join('')
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${rows}</table>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
