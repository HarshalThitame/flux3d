import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendPaymentReceipt, sendPaymentFailed, sendRefundIssued, sendOrderPlacedCustomer, sendOrderPlacedAdmin } from '@/lib/email/triggers'

/**
 * Payment lifecycle email triggers.
 *
 * These are fire-and-forget: they never throw back into the webhook handler,
 * ensuring that payment state updates are never blocked by email queue issues.
 */

// ============================================================================
// Helpers
// ============================================================================

function formatMoney(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMethod(method: string | null | undefined): string {
  if (!method) return 'Online'
  const map: Record<string, string> = {
    upi: 'UPI',
    card: 'Card',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
    emi: 'EMI',
    paylater: 'Pay Later',
    cardless_emi: 'Cardless EMI',
  }
  return map[method.toLowerCase()] ?? method
}

async function isReceiptAlreadySent(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  orderId: string,
  orderType: 'custom' | 'shop'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('email_logs')
    .select('id')
    .eq('email_type', 'payment_receipt')
    .eq('order_id', orderId)
    .eq('order_type', orderType)
    .in('status', ['sent', 'delivered'])
    .limit(1)

  if (error) {
    console.error('[payments/email] Deduplication check failed:', error)
    return false
  }
  return (data?.length ?? 0) > 0
}

/**
 * Fetch customer email + name from profiles table.
 * The order tables (shelf_orders, orders) do NOT have email/full_name columns.
 */
async function fetchCustomerProfile(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string
): Promise<{ email: string; name: string } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[payments/email] Failed to fetch profile for', userId, error.message)
    return null
  }

  const email = String(data?.email ?? '').trim()
  const name = String(data?.full_name ?? 'Customer').trim()

  if (!email) {
    console.warn('[payments/email] Profile has no email for user', userId)
    return null
  }

  return { email, name }
}

// ============================================================================
// Shop Order Receipt
// ============================================================================

async function sendShopOrderReceipt(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  attempt: {
    id: string
    customer_id: string
    internal_order_id: string
    amount_paise: number
    payment_method: string | null
    provider_payment_id: string | null
  }
) {
  const { data: order } = await supabase
    .from('shelf_orders')
    .select(
      'id, order_number, user_id, items, shipping_address, payment_snapshot, provider_payment_id, payment_method, payment_verified_at, placed_at'
    )
    .eq('id', attempt.internal_order_id)
    .maybeSingle()

  if (!order) {
    console.warn('[payments/email] Shop order not found:', attempt.internal_order_id)
    return
  }

  const row = order as Record<string, unknown>
  const userId = String(row.user_id ?? attempt.customer_id)
  const orderNumber = String(row.order_number ?? attempt.internal_order_id)
  const orderId = String(row.id ?? attempt.internal_order_id)

  // Fetch email + name from profiles (order tables don't have these columns)
  const profile = await fetchCustomerProfile(supabase, userId)
  if (!profile) {
    console.warn('[payments/email] No profile email for shop order', orderNumber, 'user', userId)
    return
  }

  // Deduplication: skip if already sent
  if (await isReceiptAlreadySent(supabase, orderId, 'shop')) {
    console.log('[payments/email] Shop receipt already sent for', orderNumber)
    return
  }

  const snapshot =
    typeof row.payment_snapshot === 'object' && row.payment_snapshot !== null
      ? (row.payment_snapshot as Record<string, unknown>)
      : {}

  const rawItems = Array.isArray(row.items) ? (row.items as Array<Record<string, unknown>>) : []
  const items: Parameters<typeof sendPaymentReceipt>[6] = rawItems.map((it) => ({
    name: String(it.productName ?? it.name ?? 'Product'),
    variant: String(it.variantLabel ?? it.skuCode ?? '').trim() || undefined,
    quantity: Number(it.quantity ?? 1),
    unitPrice: `₹${Number(it.unitPrice ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    totalPrice: `₹${(Number(it.unitPrice ?? 0) * Number(it.quantity ?? 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  }))

  const subtotal = Number(snapshot.subtotal ?? 0)
  const discount = Number(snapshot.discountAmount ?? snapshot.discount_amount ?? 0)
  const shipping = Number(snapshot.shippingCharge ?? snapshot.shipping_charge ?? 0)
  const tax = Number(snapshot.tax ?? 0)
  const grandTotal = Number(snapshot.totalAmount ?? snapshot.total_amount ?? attempt.amount_paise / 100)

  const shippingAddress =
    typeof row.shipping_address === 'object' && row.shipping_address !== null
      ? (row.shipping_address as Record<string, unknown>)
      : {}

  const paymentId = String(row.provider_payment_id ?? attempt.provider_payment_id ?? 'N/A')
  const paymentMethod = formatMethod(String(row.payment_method ?? attempt.payment_method))
  const verifiedAt = String(row.payment_verified_at ?? new Date().toISOString())

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'

  await sendPaymentReceipt(
    userId,
    profile.email,
    orderNumber,
    String(shippingAddress.name ?? profile.name),
    formatDate(String(row.placed_at)),
    `${siteUrl}/3d-shop/order/${orderId}`,
    items,
    {
      subtotal: `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      discount:
        discount > 0
          ? `-₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : '₹0.00',
      shipping: shipping > 0 ? `₹${shipping.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Free',
      tax: `₹${tax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      grandTotal: `₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      method: paymentMethod,
      paymentId,
      amount: formatMoney(attempt.amount_paise),
      date: formatDate(verifiedAt),
      status: 'Paid',
    },
    {
      name: String(shippingAddress.name ?? profile.name),
      phone: String(shippingAddress.phone ?? ''),
      line1: String(shippingAddress.line1 ?? ''),
      line2: String(shippingAddress.line2 ?? '') || null,
      city: String(shippingAddress.city ?? ''),
      state: String(shippingAddress.state ?? ''),
      pincode: String(shippingAddress.pincode ?? ''),
    },
    orderId,
    'shop'
  )

  const orderPlacedItems = rawItems.map(it => ({
    name: String(it.productName ?? it.name ?? 'Product'),
    quantity: Number(it.quantity ?? 1),
    price: `₹${(Number(it.unitPrice ?? 0) * Number(it.quantity ?? 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  }))

  sendOrderPlacedCustomer(userId, profile.email, orderNumber, String(shippingAddress.name ?? profile.name), formatMoney(attempt.amount_paise), orderPlacedItems, `${siteUrl}/3d-shop/order/${orderId}`).catch(() => {})
  sendOrderPlacedAdmin('', orderNumber, profile.email, profile.name, formatMoney(attempt.amount_paise), `${siteUrl}/admin/orders/${orderId}`).catch(() => {})
}

// ============================================================================
// Custom Quote Receipt
// ============================================================================

async function sendCustomQuoteReceipt(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  attempt: {
    id: string
    customer_id: string
    internal_order_id: string
    amount_paise: number
    payment_method: string | null
    provider_payment_id: string | null
  }
) {
  // For custom quotes, internal_order_id is the quote_capture.reference.
  // Look up the capture to find the linked order_id.
  const { data: capture } = await supabase
    .from('quote_captures')
    .select('order_id')
    .eq('reference', attempt.internal_order_id)
    .maybeSingle()

  const firstOrderId = capture?.order_id as string | undefined
  if (!firstOrderId) {
    console.warn('[payments/email] No linked order for capture', attempt.internal_order_id)
    return
  }

  // Fetch the first order to get group_id (for cart orders) and address
  const { data: firstOrder } = await supabase
    .from('orders')
    .select(
      'id, order_number, full_name, user_id, group_id, material, color, quantity, file_url, total_price, final_price, delivery_charge, grand_total, subtotal, cart_discount, coupon_discount, offer_discount, provider_payment_id, payment_method, payment_verified_at, created_at, phone, address_line1, address_line2, city, state, pincode, landmark'
    )
    .eq('id', firstOrderId)
    .maybeSingle()

  if (!firstOrder) {
    console.warn('[payments/email] Custom order not found:', firstOrderId)
    return
  }

  const first = firstOrder as Record<string, unknown>
  const groupId = first.group_id as string | undefined
  const userId = String(first.user_id ?? attempt.customer_id)
  const orderNumber = String(first.order_number ?? firstOrderId)

  // Fetch email + name from profiles (orders table has full_name but NOT email)
  const profile = await fetchCustomerProfile(supabase, userId)
  if (!profile) {
    console.warn('[payments/email] No profile email for custom order', orderNumber, 'user', userId)
    return
  }

  // Deduplication
  if (await isReceiptAlreadySent(supabase, firstOrderId, 'custom')) {
    console.log('[payments/email] Custom quote receipt already sent for', orderNumber)
    return
  }

  // Fetch all order rows (cart orders have multiple rows with same group_id)
  let orderRows: Array<Record<string, unknown>> = [first]
  if (groupId) {
    const { data: groupOrders } = await supabase
      .from('orders')
      .select(
        'id, material, color, quantity, file_url, total_price, final_price, delivery_charge, grand_total, subtotal, cart_discount, coupon_discount, offer_discount'
      )
      .eq('group_id', groupId)

    if (groupOrders && groupOrders.length > 0) {
      orderRows = groupOrders as Array<Record<string, unknown>>
    }
  }

  // Build items
  const items: Parameters<typeof sendPaymentReceipt>[6] = orderRows.map((row) => {
    const qty = Number(row.quantity ?? 1)
    const unitPrice = Number(row.total_price ?? row.final_price ?? 0)
    const fileUrl = String(row.file_url ?? '')
    const fileName = fileUrl.split('/').pop() || 'Model file'
    return {
      name: fileName,
      material: String(row.material ?? ''),
      color: String(row.color ?? ''),
      quantity: qty,
      unitPrice: `₹${unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      totalPrice: `₹${(unitPrice * qty).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    }
  })

  // Aggregate pricing from first row (all rows in a group share the same grand total logic)
  const subtotal = Number(first.subtotal ?? 0)
  const cartDiscount = Number(first.cart_discount ?? 0)
  const couponDiscount = Number(first.coupon_discount ?? 0)
  const offerDiscount = Number(first.offer_discount ?? 0)
  const totalDiscount = cartDiscount + couponDiscount + offerDiscount
  const deliveryCharge = Number(first.delivery_charge ?? 0)
  const grandTotal = Number(first.grand_total ?? attempt.amount_paise / 100)

  const paymentId = String(first.provider_payment_id ?? attempt.provider_payment_id ?? 'N/A')
  const paymentMethod = formatMethod(String(first.payment_method ?? attempt.payment_method))
  const verifiedAt = String(first.payment_verified_at ?? new Date().toISOString())

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'

  await sendPaymentReceipt(
    userId,
    profile.email,
    orderNumber,
    String(first.full_name ?? profile.name),
    formatDate(String(first.created_at)),
    `${siteUrl}/my-orders`,
    items,
    {
      subtotal: `₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      discount:
        totalDiscount > 0
          ? `-₹${totalDiscount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : '₹0.00',
      shipping: deliveryCharge > 0 ? `₹${deliveryCharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'Free',
      tax: '₹0.00',
      grandTotal: `₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    },
    {
      method: paymentMethod,
      paymentId,
      amount: formatMoney(attempt.amount_paise),
      date: formatDate(verifiedAt),
      status: 'Paid',
    },
    {
      name: String(first.full_name ?? profile.name),
      phone: String(first.phone ?? ''),
      line1: String(first.address_line1 ?? ''),
      line2: String(first.address_line2 ?? '') || null,
      city: String(first.city ?? ''),
      state: String(first.state ?? ''),
      pincode: String(first.pincode ?? ''),
    },
    firstOrderId,
    'custom'
  )

  const orderPlacedItems = orderRows.map(row => ({
    name: String(row.file_url ?? '').split('/').pop() || 'Model file',
    material: String(row.material ?? ''),
    color: String(row.color ?? ''),
    quantity: Number(row.quantity ?? 1),
    price: `₹${(Number(row.total_price ?? row.final_price ?? 0) * Number(row.quantity ?? 1)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
  }))

  sendOrderPlacedCustomer(userId, profile.email, orderNumber, String(first.full_name ?? profile.name), formatMoney(attempt.amount_paise), orderPlacedItems, `${siteUrl}/my-orders`).catch(() => {})
  sendOrderPlacedAdmin('', orderNumber, profile.email, profile.name, formatMoney(attempt.amount_paise), `${siteUrl}/admin/orders/${firstOrderId}`).catch(() => {})
}

// ============================================================================
// Public triggers
// ============================================================================

export async function notifyPaymentCaptured(
  attempt: {
    id: string
    customer_id: string
    internal_order_type: 'shop_order' | 'custom_quote'
    internal_order_id: string
    amount_paise: number
    payment_method: string | null
    provider_payment_id?: string | null
  }
) {
  try {
    const supabase = createAdminSupabaseClient()

    if (attempt.internal_order_type === 'shop_order') {
      await sendShopOrderReceipt(supabase, attempt as Parameters<typeof sendShopOrderReceipt>[1])
    } else {
      await sendCustomQuoteReceipt(supabase, attempt as Parameters<typeof sendCustomQuoteReceipt>[1])
    }
  } catch (err) {
    console.error('[payments/email] notifyPaymentCaptured failed:', err)
  }
}

export async function notifyPaymentFailed(
  attempt: {
    id: string
    customer_id: string
    internal_order_type: 'shop_order' | 'custom_quote'
    internal_order_id: string
    amount_paise: number
  }
) {
  try {
    const supabase = createAdminSupabaseClient()
    const table = attempt.internal_order_type === 'shop_order' ? 'shelf_orders' : 'orders'
    const { data: order } = await supabase
      .from(table)
      .select('order_number, user_id')
      .eq('id', attempt.internal_order_id)
      .maybeSingle()

    if (!order) {
      console.warn('[payments/email] Order not found for failed payment:', attempt.internal_order_id)
      return
    }

    const row = order as Record<string, unknown>
    const userId = String(row.user_id ?? attempt.customer_id)
    const orderNumber = String(row.order_number ?? attempt.internal_order_id)

    const profile = await fetchCustomerProfile(supabase, userId)
    if (!profile) {
      console.warn('[payments/email] No profile email for failed payment order', orderNumber)
      return
    }

    const amount = formatMoney(attempt.amount_paise)
    const retryUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'}/orders/${attempt.internal_order_id}/retry`

    await sendPaymentFailed(userId, profile.email, orderNumber, profile.name, amount, retryUrl)
  } catch (err) {
    console.error('[payments/email] notifyPaymentFailed failed:', err)
  }
}

export async function notifyRefundProcessed(
  attempt: {
    id: string
    customer_id: string
    internal_order_type: 'shop_order' | 'custom_quote'
    internal_order_id: string
  },
  refundAmountPaise: number
) {
  try {
    const supabase = createAdminSupabaseClient()
    const table = attempt.internal_order_type === 'shop_order' ? 'shelf_orders' : 'orders'
    const { data: order } = await supabase
      .from(table)
      .select('order_number, user_id')
      .eq('id', attempt.internal_order_id)
      .maybeSingle()

    if (!order) {
      console.warn('[payments/email] Order not found for refund:', attempt.internal_order_id)
      return
    }

    const row = order as Record<string, unknown>
    const userId = String(row.user_id ?? attempt.customer_id)
    const orderNumber = String(row.order_number ?? attempt.internal_order_id)
    const refundAmount = formatMoney(refundAmountPaise)

    const profile = await fetchCustomerProfile(supabase, userId)
    if (!profile) {
      console.warn('[payments/email] No profile email for refund order', orderNumber)
      return
    }

    await sendRefundIssued(
      userId,
      profile.email,
      orderNumber,
      profile.name,
      refundAmount,
      'Razorpay (original payment method)',
      '5-7 business days',
    )
  } catch (err) {
    console.error('[payments/email] notifyRefundProcessed failed:', err)
  }
}
