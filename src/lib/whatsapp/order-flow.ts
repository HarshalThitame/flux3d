import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getSettings } from '@/lib/settings'
import {
  calculateShopTax,
  calculateShopTotal,
  roundMoney,
} from '@/lib/shop/pricing'
import { calculateShippingFromRules } from '@/lib/shop/shipping'
import { normalizeShippingAddress, placeShopOrder, type PlaceOrderItemInput } from '@/lib/shop/place-order'
import { getOrCreateWhatsappCustomer } from '@/lib/whatsapp/customer'
import {
  getOrderSession,
  saveOrderSession,
  clearOrderSession,
  logWhatsAppMessageToDb,
} from '@/lib/whatsapp/session'
import {
  sendWhatsAppButtons,
  sendWhatsAppList,
  sendWhatsAppText,
  sendWhatsAppPaymentLink,
  mapCatalogItemToSku,
} from '@/lib/whatsapp/messages'
import { createWhatsappPaymentLink } from '@/lib/whatsapp/payment'

export const ORDERING_ENABLED = (process.env.WHATSAPP_ORDERING_ENABLED?.trim() || 'true') !== 'false'

export type OrderInteraction =
  | {
      kind: 'list' | 'button' | 'product'
      id: string
      title: string
    }
  | {
      kind: 'order'
      items: Array<{ productRetailerId: string; quantity: number }>
    }

type ProductRow = Record<string, unknown>
type SkuRow = {
  id: string
  product_id: string
  sku_code: string
  variant_combination?: Record<string, unknown> | null
  price: number
  stock_quantity: number
  weight_grams?: number | null
  is_available?: boolean | null
  variant_label?: string | null
}

type CartItem = {
  productId: string
  productName: string
  skuId: string
  skuCode: string
  variantLabel: string
  unitPrice: number
  weightGrams: number
  quantity: number
}

type OrderState = {
  productId?: string
  productName?: string
  skuId?: string
  skuCode?: string
  variantLabel?: string
  unitPrice?: number
  quantity?: number
  items?: CartItem[]
  address?: Partial<{
    name: string
    phone: string
    line1: string
    line2: string
    city: string
    state: string
    pincode: string
  }>
  orderId?: string
  orderNumber?: string
  totalAmount?: number
}

const BUY_INTENT_RE = /(buy|purchase|checkout|place an? order|place order|i want to order|want to buy|order now|add to cart|get (one|this)|start order|order a|order the)/i

export type OrderCartItemInput = { productRetailerId: string; quantity: number }

export function parseOrderCartItems(raw: unknown): OrderCartItemInput[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const productRetailerId = String(record?.product_retailer_id ?? '')
      const quantity = Number(record?.quantity ?? 0)
      if (!productRetailerId || !Number.isInteger(quantity) || quantity <= 0) return null
      return { productRetailerId, quantity }
    })
    .filter((item): item is OrderCartItemInput => item !== null)
}

export function isBuyIntent(text: string): boolean {
  return BUY_INTENT_RE.test(text.trim())
}

export function isCancelIntent(text: string, interaction: OrderInteraction | null): boolean {
  if (interaction && interaction.kind !== 'order' && interaction.id === 'cancel') return true
  return /^(cancel|cancel order|never mind|forget it|stop)$/i.test(text.trim())
}

export function parseQuantity(text: string): number | null {
  const match = text.trim().match(/^\d{1,3}$/)
  if (!match) return null
  const qty = Number(match[0])
  if (!Number.isInteger(qty) || qty <= 0 || qty > 99) return null
  return qty
}

export function phoneToTenDigit(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10)
}

async function loadBrowseProducts(): Promise<Array<{ id: string; name: string; basePrice: number }>> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_products')
    .select('id, name, base_price')
    .eq('is_active', true)
    .eq('is_archived', false)
    .limit(10)

  if (error) {
    console.error('[whatsapp] browse products query failed:', error)
    return []
  }
  return (data ?? [])
    .filter((p: ProductRow) => Number(p.base_price ?? 0) > 0)
    .map((p: ProductRow) => ({
      id: String(p.id),
      name: String(p.name ?? 'Product'),
      basePrice: Number(p.base_price),
    }))
}

async function loadProductWithSkus(productId: string): Promise<{ product: ProductRow; skus: SkuRow[] } | null> {
  const supabase = createAdminSupabaseClient()
  const { data: product, error } = await supabase
    .from('shelf_products')
    .select('id, name, base_price, description, slug')
    .eq('id', productId)
    .eq('is_active', true)
    .eq('is_archived', false)
    .maybeSingle()

  if (error || !product) return null

  const { data: skuData } = await supabase
    .from('shelf_skus')
    .select('id, product_id, sku_code, variant_combination, price, stock_quantity, weight_grams, is_available')
    .eq('product_id', productId)

  const skus = (skuData ?? [])
    .filter((s: SkuRow) => s.is_available !== false && Number(s.stock_quantity ?? 0) > 0)
    .map((s: SkuRow) => ({ ...s, price: Number(s.price) }))

  return { product, skus }
}

async function loadSkuByCode(skuCode: string): Promise<{ product: ProductRow; sku: SkuRow } | null> {
  const supabase = createAdminSupabaseClient()
  const { data: sku, error } = await supabase
    .from('shelf_skus')
    .select('id, product_id, sku_code, variant_combination, price, stock_quantity, weight_grams, is_available')
    .eq('sku_code', skuCode)
    .maybeSingle()

  if (error || !sku) return null
  if (sku.is_available === false || Number(sku.stock_quantity ?? 0) <= 0) return null

  const { data: product } = await supabase
    .from('shelf_products')
    .select('id, name, base_price, description, slug')
    .eq('id', sku.product_id)
    .eq('is_active', true)
    .eq('is_archived', false)
    .maybeSingle()

  if (!product) return null
  return { product, sku: { ...sku, price: Number(sku.price) } }
}

function variantLabelOf(sku: SkuRow): string {
  const combo = sku.variant_combination
  if (combo && typeof combo === 'object' && Object.keys(combo).length) {
    return Object.entries(combo)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
  }
  return sku.variant_label || 'Standard'
}

function money(value: number): string {
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function checkPaymentStatus(orderId: string): Promise<boolean> {
  const supabase = createAdminSupabaseClient()
  const { data: order } = await supabase
    .from('shelf_orders')
    .select('payment_status')
    .eq('id', orderId)
    .maybeSingle()
  return order?.payment_status === 'paid'
}

async function buildOrderPreview(state: OrderState) {
  const settings = await getSettings()
  const items = state.items ?? []
  const subtotal = roundMoney(
    items.length > 0
      ? items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
      : (state.unitPrice ?? 0) * (state.quantity ?? 1)
  )
  const totalWeightGrams = items.reduce((sum, item) => sum + (item.weightGrams ?? 0) * item.quantity, 0)
  const address = state.address ?? {}
  const shippingResult = await calculateShippingFromRules({
    pincode: address.pincode ?? '',
    state: address.state ?? '',
    subtotal,
    weightGrams: totalWeightGrams,
    settings,
  })
  const shippingCharge = shippingResult.available ? shippingResult.chargePaise / 100 : 0
  const tax = calculateShopTax(subtotal, settings)
  const total = calculateShopTotal(subtotal, 0, shippingCharge, tax)
  return { subtotal, shippingCharge, tax, total, available: shippingResult.available, reason: shippingResult.reason }
}

export type OrderFlowResult = {
  handled: boolean
}

export async function handleOrderFlow(params: {
  phone: string
  userId: string | null
  interaction?: OrderInteraction | null
  text?: string | null
  profileName?: string | null
}): Promise<OrderFlowResult> {
  if (!ORDERING_ENABLED) return { handled: false }

  const { phone, userId, interaction = null, text = null, profileName = null } = params
  const incomingText = (text ?? '').trim()

  const sendAndLog = async (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => {
    const result =
      kind === 'list'
        ? await sendWhatsAppList(phone, extra as never)
        : kind === 'buttons'
          ? await sendWhatsAppButtons(phone, extra as never)
          : await sendWhatsAppText(phone, body, { previewUrl: Boolean(extra?.previewUrl) })
    await logWhatsAppMessageToDb({
      userId,
      sender: phone,
      direction: 'outgoing',
      messageText: body,
      automated: true,
      triggerEvent: 'order_flow',
    })
    return result
  }

  // Cancel intent clears any session immediately.
  if (isCancelIntent(incomingText, interaction)) {
    await clearOrderSession(phone)
    await sendAndLog('text', 'Order cancelled. Anything else I can help you with?')
    return { handled: true }
  }

  const session = await getOrderSession(phone)

  // ── No session: decide whether to start ordering ──
  if (!session) {
    if (interaction?.kind === 'order') {
      // Customer sent a WhatsApp catalog cart (multi-item). productRetailerId === sku_code.
      await handleCartOrder(phone, userId, interaction.items, sendAndLog)
      return { handled: true }
    }

    if (interaction?.kind === 'product') {
      // Catalog card tapped: product.id is the Meta catalog item id → resolve to sku.
      const skuCode = await mapCatalogItemToSku(interaction.id)
      if (!skuCode) {
        await sendAndLog('text', "I couldn't find that item in the catalog. Let me show you what's available:")
        await showBrowse(phone, userId, sendAndLog)
        return { handled: true }
      }
      const found = await loadSkuByCode(skuCode)
      if (!found) {
        await sendAndLog('text', 'That item is currently out of stock. Let me show you what is available:')
        await showBrowse(phone, userId, sendAndLog)
        return { handled: true }
      }
      const skuId = found.sku.id
      const state: OrderState = {
        productId: String(found.product.id),
        productName: String(found.product.name ?? 'Product'),
        skuId,
        skuCode: found.sku.sku_code,
        variantLabel: variantLabelOf(found.sku),
        unitPrice: found.sku.price,
        address: { phone: phoneToTenDigit(phone) },
      }
      await saveOrderSession(phone, 'quantity', state)
      await askQuantity(phone, userId, state)
      return { handled: true }
    }

    if (isBuyIntent(incomingText) || interaction?.id === 'order:start') {
      await showBrowse(phone, userId, sendAndLog)
      return { handled: true }
    }

    return { handled: false }
  }

  // ── Session exists: route by step ──
  const state = (session.state ?? {}) as OrderState

  switch (session.step) {
    case 'browse': {
      if (interaction?.kind === 'list' && interaction.id.startsWith('prod:')) {
        const productId = interaction.id.slice('prod:'.length)
        await selectProduct(phone, userId, productId, state, sendAndLog)
      } else if (incomingText) {
        const matches = await searchProducts(incomingText)
        if (!matches.length) {
          await sendAndLog('text', "I couldn't find a product matching that. Here's our catalog:")
        }
        await showBrowse(phone, userId, sendAndLog, matches)
      }
      return { handled: true }
    }

    case 'variant': {
      if (interaction?.kind === 'list' && interaction.id.startsWith('var:')) {
        const skuId = interaction.id.slice('var:'.length)
        const sku = await loadSkuById(skuId)
        if (sku) {
          state.skuId = sku.id
          state.skuCode = sku.sku_code
          state.variantLabel = variantLabelOf(sku)
          state.unitPrice = sku.price
          state.address = { ...(state.address ?? {}), phone: phoneToTenDigit(phone) }
          await saveOrderSession(phone, 'quantity', state)
          await askQuantity(phone, userId, state)
        } else {
          await sendAndLog('text', 'That variant is unavailable. Please pick another one.')
        }
      } else {
        await sendAndLog('text', 'Please choose a variant from the list above.')
      }
      return { handled: true }
    }

    case 'quantity': {
      const qty = interaction && interaction.kind !== 'order' && interaction.id.startsWith('qty:')
        ? parseQuantity(interaction.id.slice('qty:'.length))
        : parseQuantity(incomingText)
      if (qty == null) {
        await sendAndLog('text', 'Please enter a number (1 to 99) or tap a quantity button.')
        return { handled: true }
      }
      state.quantity = qty
      state.address = { ...(state.address ?? {}), phone: phoneToTenDigit(phone) }
      await saveOrderSession(phone, 'address_name', state)
      await sendAndLog('text', `Great, ${qty} x ${state.productName ?? 'item'} (${state.variantLabel ?? 'Standard'}) = ${money(roundMoney((state.unitPrice ?? 0) * qty))} before shipping.\n\nPlease share the **delivery name** (full name of the person receiving the order):`)
      return { handled: true }
    }

    case 'address_name': {
      if (!incomingText) return { handled: true }
      state.address = { ...(state.address ?? {}), name: incomingText.slice(0, 80) }
      await saveOrderSession(phone, 'address_line1', state)
      await sendAndLog('text', `Thanks, ${incomingText.slice(0, 40)}.\n\nNow your **full delivery address (house no., street, area)**:`)
      return { handled: true }
    }

    case 'address_line1': {
      if (!incomingText) return { handled: true }
      state.address = { ...(state.address ?? {}), line1: incomingText.slice(0, 160) }
      await saveOrderSession(phone, 'address_city', state)
      await sendAndLog('text', 'Got it. Now your **city**:')
      return { handled: true }
    }

    case 'address_city': {
      if (!incomingText) return { handled: true }
      state.address = { ...(state.address ?? {}), city: incomingText.slice(0, 60) }
      await saveOrderSession(phone, 'address_state', state)
      await sendAndLog('text', 'And your **state**:')
      return { handled: true }
    }

    case 'address_state': {
      if (!incomingText) return { handled: true }
      state.address = { ...(state.address ?? {}), state: incomingText.slice(0, 60) }
      await saveOrderSession(phone, 'address_pincode', state)
      await sendAndLog('text', 'Finally, your **6-digit pincode**:')
      return { handled: true }
    }

    case 'address_pincode': {
      const pincode = incomingText.replace(/\D/g, '').slice(0, 6)
      if (!/^\d{6}$/.test(pincode)) {
        await sendAndLog('text', 'Please enter a valid 6-digit pincode (e.g. 400001):')
        return { handled: true }
      }
      state.address = { ...(state.address ?? {}), pincode }
      await saveOrderSession(phone, 'confirm', state)
      await showConfirm(phone, userId, state, sendAndLog)
      return { handled: true }
    }

    case 'confirm': {
      if (interaction?.kind === 'button') {
        if (interaction.id === 'confirm:yes') {
          await placeOrderAndSendPaymentLink(phone, userId, state, profileName, sendAndLog)
          return { handled: true }
        }
        if (interaction.id === 'confirm:no' || interaction.id === 'change') {
          await saveOrderSession(phone, 'browse', {})
          await showBrowse(phone, userId, sendAndLog)
          return { handled: true }
        }
        if (interaction.id === 'cancel') {
          await clearOrderSession(phone)
          await sendAndLog('text', 'Order cancelled. Anything else I can help you with?')
          return { handled: true }
        }
      }
      await sendAndLog('text', 'Please tap **Confirm** to place the order, **Change** to start over, or **Cancel**.')
      return { handled: true }
    }

    case 'payment_pending': {
      const orderNumber = state.orderNumber ?? 'your order'
      const orderId = state.orderId ?? orderNumber

      if (incomingText && incomingText.toLowerCase() === 'status') {
        const paid = await checkPaymentStatus(orderId)
        if (paid) {
          await clearOrderSession(phone)
          await sendAndLog('text', [
            `✅ *Payment received!*`,
            `Order #${orderNumber}`,
            '',
            'Your order is being prepared. We will notify you here as it ships.',
          ].join('\n'))
          return { handled: true }
        }
        await sendAndLog('text', [
          `Payment for Order #${orderNumber} is still pending.`,
          '',
          'Check the payment link you received earlier, or visit:',
          `/3d-shop/order/${orderId}`,
        ].join('\n'))
        return { handled: true }
      }

      await sendAndLog('text', [
        `Payment for Order #${orderNumber} is being processed.`,
        '',
        'You can check the payment status on our website:',
        `/3d-shop/order/${orderId}`,
        '',
        'Or reply **status** to check again.',
      ].join('\n'))
      return { handled: true }
    }

    default: {
      await clearOrderSession(phone)
      return { handled: false }
    }
  }
}

async function handleCartOrder(
  phone: string,
  userId: string | null,
  items: Array<{ productRetailerId: string; quantity: number }>,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>,
) {
  const resolved: CartItem[] = []
  const unavailable: string[] = []

  for (const item of items) {
    const found = await loadSkuByCode(item.productRetailerId)
    if (!found) {
      unavailable.push(item.productRetailerId)
      continue
    }
    resolved.push({
      productId: String(found.product.id),
      productName: String(found.product.name ?? 'Product'),
      skuId: found.sku.id,
      skuCode: found.sku.sku_code,
      variantLabel: variantLabelOf(found.sku),
      unitPrice: found.sku.price,
      weightGrams: Number(found.sku.weight_grams ?? 0),
      quantity: item.quantity,
    })
  }

  if (resolved.length === 0) {
    await sendAndLog('text', 'Sorry, none of the items in your cart are available right now. Here is what we have:')
    await showBrowse(phone, userId, sendAndLog)
    return
  }

  if (unavailable.length > 0) {
    await sendAndLog('text', `Note: ${unavailable.length} item(s) from your cart are currently unavailable and were skipped.`)
  }

  const subtotal = roundMoney(resolved.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
  const lines = [
    '🛒 *Cart received!*',
    '',
    ...resolved.map((item) => `• ${item.productName} (${item.variantLabel}) × ${item.quantity} = ${money(roundMoney(item.unitPrice * item.quantity))}`),
    '',
    `Subtotal: ${money(subtotal)}`,
    '',
    'Please share the **delivery name** (full name of the person receiving the order):',
  ]

  const state: OrderState = {
    items: resolved,
    address: { phone: phoneToTenDigit(phone) },
  }
  await saveOrderSession(phone, 'address_name', state)
  await sendAndLog('text', lines.join('\n'))
}

async function showBrowse(
  phone: string,
  userId: string | null,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>,
  products?: Array<{ id: string; name: string; basePrice: number }>
) {
  const list = products ?? await loadBrowseProducts()
  if (!list.length) {
    await sendAndLog('text', 'No products are available right now. Please check back soon!')
    return
  }

  await saveOrderSession(phone, 'browse', {})
  await sendAndLog('text', '🛒 *Let me help you order!* Here are our current products:')
  await sendWhatsAppList(phone, {
    header: 'Choose a product',
    body: 'Tap a product to see its variants and price.',
    footer: 'Or just type a product name.',
    buttonText: 'View products',
    sections: [
      {
        title: 'Available now',
        rows: list.map((p) => ({
          id: `prod:${p.id}`,
          title: p.name.slice(0, 24),
          description: `From ${money(p.basePrice)}`,
        })),
      },
    ],
  })
  await logWhatsAppMessageToDb({
    userId,
    sender: phone,
    direction: 'outgoing',
    messageText: 'Product list sent',
    automated: true,
    triggerEvent: 'order_flow',
  })
}

async function searchProducts(query: string): Promise<Array<{ id: string; name: string; basePrice: number }>> {
  const supabase = createAdminSupabaseClient()
  const terms = query.split(/\s+/).filter((t) => t.length >= 3)
  if (!terms.length) return []
  const conditions = terms.map((t) => `name.ilike.%${t}%`)
  const { data, error } = await supabase
    .from('shelf_products')
    .select('id, name, base_price')
    .eq('is_active', true)
    .eq('is_archived', false)
    .or(conditions.join(','))
    .limit(10)
  if (error || !data?.length) return []
  return (data as ProductRow[])
    .filter((p: ProductRow) => Number(p.base_price ?? 0) > 0)
    .map((p: ProductRow) => ({
      id: String(p.id),
      name: String(p.name ?? 'Product'),
      basePrice: Number(p.base_price),
    }))
}

async function selectProduct(
  phone: string,
  userId: string | null,
  productId: string,
  state: OrderState,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>
) {
  const found = await loadProductWithSkus(productId)
  if (!found) {
    await sendAndLog('text', 'Sorry, that product is no longer available. Here are the others:')
    await showBrowse(phone, userId, sendAndLog)
    return
  }

  if (found.skus.length === 1) {
    const sku = found.skus[0]
    state.productId = productId
    state.productName = String(found.product.name ?? 'Product')
    state.skuId = sku.id
    state.skuCode = sku.sku_code
    state.variantLabel = variantLabelOf(sku)
    state.unitPrice = sku.price
    state.address = { ...(state.address ?? {}), phone: phoneToTenDigit(phone) }
    await saveOrderSession(phone, 'quantity', state)
    await askQuantity(phone, userId, state)
    return
  }

  state.productId = productId
  state.productName = String(found.product.name ?? 'Product')
  await saveOrderSession(phone, 'variant', state)
  await sendWhatsAppList(phone, {
    header: state.productName!.slice(0, 24),
    body: 'Choose a variant:',
    buttonText: 'Choose variant',
    sections: [
      {
        title: 'Variants',
        rows: found.skus.map((sku) => ({
          id: `var:${sku.id}`,
          title: variantLabelOf(sku).slice(0, 24),
          description: `${money(sku.price)} · ${sku.stock_quantity} in stock`,
        })),
      },
    ],
  })
  await logWhatsAppMessageToDb({
    userId,
    sender: phone,
    direction: 'outgoing',
    messageText: 'Variant list sent',
    automated: true,
    triggerEvent: 'order_flow',
  })
}

async function loadSkuById(skuId: string): Promise<SkuRow | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_skus')
    .select('id, product_id, sku_code, variant_combination, price, stock_quantity, weight_grams, is_available')
    .eq('id', skuId)
    .maybeSingle()
  if (error || !data) return null
  if (data.is_available === false || Number(data.stock_quantity ?? 0) <= 0) return null
  return { ...data, price: Number(data.price) }
}

async function askQuantity(
  phone: string,
  userId: string | null,
  state: OrderState
) {
  await sendWhatsAppButtons(phone, {
    header: 'Quantity',
    body: `How many of ${state.productName ?? 'this item'} (${money(state.unitPrice ?? 0)} each) would you like?`,
    buttons: [
      { id: 'qty:1', title: '1' },
      { id: 'qty:2', title: '2' },
      { id: 'qty:3', title: '3' },
    ],
  })
  await logWhatsAppMessageToDb({
    userId,
    sender: phone,
    direction: 'outgoing',
    messageText: 'Quantity buttons sent',
    automated: true,
    triggerEvent: 'order_flow',
  })
}

async function showConfirm(
  phone: string,
  userId: string | null,
  state: OrderState,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>
) {
  const preview = await buildOrderPreview(state)
  const address = state.address ?? {}

  const itemLines = (state.items?.length ?? 0) > 0
    ? state.items!.map((item) => `• ${item.productName} (${item.variantLabel}) × ${item.quantity} = ${money(roundMoney(item.unitPrice * item.quantity))}`)
    : [`Product: ${state.productName ?? ''} (${state.variantLabel ?? 'Standard'})`, `Quantity: ${state.quantity}`]

  const lines = [
    '🧾 *ORDER SUMMARY*',
    '',
    ...itemLines,
    `Subtotal: ${money(preview.subtotal)}`,
  ]
  if (preview.available && preview.shippingCharge > 0) lines.push(`Shipping: ${money(preview.shippingCharge)}`)
  if (preview.available && preview.tax > 0) lines.push(`Tax: ${money(preview.tax)}`)
  if (!preview.available) lines.push(`Delivery: not available to this pincode (${preview.reason ?? ''})`)
  lines.push('', `*Total: ${money(preview.total)}*`, '')
  lines.push('📍 *Delivery to:*')
  lines.push(`${address.name ?? ''}`)
  lines.push(`${address.line1 ?? ''}`)
  lines.push(`${[address.city, address.state, address.pincode].filter(Boolean).join(', ')}`)
  lines.push(`${address.phone ? `Phone: ${address.phone}` : ''}`)

  await sendAndLog('text', lines.join('\n'))

  if (!preview.available) {
    await saveOrderSession(phone, 'address_pincode', state)
    await sendAndLog('text', 'Unfortunately we cannot deliver to this pincode yet. Please provide a different pincode or a nearby delivery address:')
    return
  }

  await sendWhatsAppButtons(phone, {
    body: 'Tap **Confirm** to place the order, or **Change** to modify.',
    buttons: [
      { id: 'confirm:yes', title: 'Confirm ✅' },
      { id: 'confirm:no', title: 'Change' },
      { id: 'cancel', title: 'Cancel' },
    ],
  })
  await logWhatsAppMessageToDb({
    userId,
    sender: phone,
    direction: 'outgoing',
    messageText: 'Confirm buttons sent',
    automated: true,
    triggerEvent: 'order_flow',
  })
}

async function placeOrderAndSendPaymentLink(
  phone: string,
  userId: string | null,
  state: OrderState,
  profileName: string | null,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>
) {
  const address = state.address ?? {}

  const rawOrderItems = (state.items?.length ?? 0) > 0
    ? state.items!.map((item) => ({ productId: item.productId, skuId: item.skuId, quantity: item.quantity }))
    : [{ productId: state.productId!, skuId: state.skuId, quantity: state.quantity }]

  if (rawOrderItems.length === 0 || rawOrderItems.some((item) => !item.productId || !item.skuId || !item.quantity)) {
    await sendAndLog('text', 'Something went wrong with your order. Please start again.')
    await clearOrderSession(phone)
    return
  }

  const orderItems: PlaceOrderItemInput[] = rawOrderItems.map((item) => ({
    productId: item.productId!,
    skuId: item.skuId!,
    quantity: item.quantity!,
  }))

  // Ensure a customer account exists for the order.
  const customer = await getOrCreateWhatsappCustomer(phone, { name: address.name || profileName || undefined })
  if (!customer.userId) {
    await sendAndLog('text', 'Sorry, we could not create your order right now. Please try again in a minute.')
    return
  }
  const effectiveUserId = customer.userId

  const shippingAddress = normalizeShippingAddress({
    name: address.name ?? 'WhatsApp Customer',
    phone: address.phone ?? phoneToTenDigit(phone),
    line1: address.line1 ?? '',
    line2: '',
    city: address.city ?? '',
    state: address.state ?? '',
    pincode: address.pincode ?? '',
  })

  try {
    const result = await placeShopOrder({
      userId: effectiveUserId,
      items: orderItems,
      shippingAddress,
      source: 'whatsapp',
      paymentProvider: 'razorpay',
    })

    await clearOrderSession(phone)

    await sendAndLog('text', [
      '✅ *Order placed!*',
      `Order #${result.orderNumber}`,
      `Total: ${money(result.totalAmount)}`,
      '',
      'Complete your payment with the link below:',
    ].join('\n'))

    const paymentLink = await createWhatsappPaymentLink({
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      userId: effectiveUserId,
      amountPaise: Math.round(result.totalAmount * 100),
      customerName: shippingAddress.name,
      customerPhone: shippingAddress.phone,
    })

    if (paymentLink) {
      const sent = await sendWhatsAppPaymentLink(
        phone,
        paymentLink.shortUrl,
        `🔗 *Payment link for order ${result.orderNumber}*`
      )
      if (!sent.ok) {
        await sendAndLog('text', `Pay here for order ${result.orderNumber}: ${paymentLink.shortUrl}`)
      }
    } else {
      await sendAndLog('text', 'Our payment link service is temporarily unavailable. We will send your payment link shortly.')
    }

    await saveOrderSession(phone, 'payment_pending', {
      ...state,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      totalAmount: result.totalAmount,
    })

    await sendAndLog('text', 'Your order is confirmed on our website too. We will notify you here once payment is received and as it ships.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to place order.'
    console.error('[whatsapp] Order placement failed:', message)
    await saveOrderSession(phone, 'confirm', state)
    await sendAndLog('text', `Sorry, we could not place the order: ${message}. Tap **Change** to adjust or **Cancel**.`)
  }
}
