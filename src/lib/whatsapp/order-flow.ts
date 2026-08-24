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
  sendWhatsAppFlow,
  mapCatalogItemToSku,
} from '@/lib/whatsapp/messages'
import { createWhatsappPaymentLink } from '@/lib/whatsapp/payment'
import { notifyWhatsAppPaymentLink } from '@/lib/whatsapp/notifications'
import {
  validateName,
  validateLine1,
  validateCity,
  validateState,
  validatePincode,
  type FieldValidation,
} from '@/lib/whatsapp/address-validator'

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn()
      if (result && typeof result === 'object' && 'ok' in result && result.ok === false) {
        const errorMsg = String((result as Record<string, unknown>).error ?? 'Unknown failure')
        const err = new Error(errorMsg)
        lastError = err
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)))
          continue
        }
        throw err
      }
      return result
    } catch (err) {
      lastError = err
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)))
      }
    }
  }
  throw lastError
}

export const ORDERING_ENABLED = (process.env.WHATSAPP_ORDERING_ENABLED?.trim() || 'true') !== 'false'

export const ADDRESS_FLOW_CTA = 'Fill Address'

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
  | {
      kind: 'flow_response'
      data: Record<string, unknown>
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
  if (interaction && interaction.kind !== 'order' && interaction.kind !== 'flow_response' && interaction.id === 'cancel') return true
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

async function getBrandName(): Promise<string> {
  try {
    const settings = await getSettings()
    return settings.brandName || settings.businessName || 'Flux3D'
  } catch {
    return 'Flux3D'
  }
}

async function getCustomerFirstName(phone: string): Promise<string | null> {
  try {
    const supabase = createAdminSupabaseClient()
    const normalized = phone.replace(/\D/g, '')
    if (!normalized) return null
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .or(`phone_number.eq.${normalized},phone_number.eq.+${normalized}`)
      .maybeSingle()
    const fullName = typeof data?.full_name === 'string' ? data.full_name.trim() : ''
    if (!fullName) return null
    const first = fullName.split(/\s+/)[0]
    return first || null
  } catch {
    return null
  }
}

export function firstNameOf(customerName: string | null | undefined): string | null {
  const trimmed = (customerName ?? '').trim()
  if (!trimmed) return null
  const first = trimmed.split(/\s+/)[0]
  return first || null
}

export function playfulGreeting(name: string | null, brand: string): string {
  return `👋 Heyy${name ? ` ${name}` : ''}! Welcome to ${brand} ✨`
}

export function playfulInvalidInput(validation: FieldValidation, value: string): string {
  const raw = (value ?? '').trim()
  if (!raw) return 'Oh! This field is missing 👀\n\nPlease share it and we\u2019ll keep moving. We\u2019re almost there! 🙌'
  return `Oops 🙈 "${raw.slice(0, 60)}" doesn't look right.\n\n${validation.error ?? 'Please try that again.'}`
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

async function checkShipmentStatus(
  orderId: string,
): Promise<{ fulfilmentStatus: string; trackingNumber?: string; courierName?: string } | null> {
  const supabase = createAdminSupabaseClient()
  const { data: order } = await supabase
    .from('shelf_orders')
    .select('fulfilment_status, tracking_number, courier_name')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return null
  const status = order.fulfilment_status
  if (status === 'pending' || status === 'confirmed' || status === 'processing' || status === 'packed') return null
  return {
    fulfilmentStatus: status,
    trackingNumber: order.tracking_number ?? undefined,
    courierName: order.courier_name ?? undefined,
  }
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
    let result: { ok: boolean; status?: number; error?: string }
    try {
      result = await withRetry(() =>
        kind === 'list'
          ? sendWhatsAppList(phone, extra as never)
          : kind === 'buttons'
            ? sendWhatsAppButtons(phone, extra as never)
            : sendWhatsAppText(phone, body, { previewUrl: Boolean(extra?.previewUrl) }),
      )
    } catch (err) {
      console.error(`[whatsapp] Failed to send ${kind} message after retries:`, err instanceof Error ? err.message : String(err))
      await logWhatsAppMessageToDb({
        userId,
        sender: phone,
        direction: 'outgoing',
        messageText: body,
        automated: true,
        triggerEvent: 'order_flow',
      })
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
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
    await sendAndLog('text', 'Order cancelled — no stress! 😊 Anything else I can help you with?')
    return { handled: true }
  }

  const session = await getOrderSession(phone)

  // A new WhatsApp catalog cart always (re)starts the order flow, from any step.
  if (interaction?.kind === 'order') {
    await clearOrderSession(phone)
    await handleCartOrder(phone, userId, interaction.items, sendAndLog)
    return { handled: true }
  }

  // Track order command: /track <orderId> or /track <orderNumber>
  const trackMatch = incomingText.match(/^\/track\s+(.+)$/i)
  if (trackMatch) {
    const query = trackMatch[1].trim()
    await handleTrackOrder(phone, userId, query, sendAndLog)
    return { handled: true }
  }

  // ── No session: decide whether to start ordering ──
  if (!session) {
    if (interaction?.kind === 'product') {
      // Try to load SKU directly using interaction.id (in case it is already the sku_code)
      let found = await loadSkuByCode(interaction.id)
      if (!found) {
        // Fallback: resolve Meta catalog item id to retailer_id (sku_code)
        const skuCode = await mapCatalogItemToSku(interaction.id)
        if (skuCode) {
          found = await loadSkuByCode(skuCode)
        }
      }

      if (!found) {
        await sendAndLog('text', "I couldn't find that item in the catalog or it is out of stock. Let me show you what's available:")
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

    if (isBuyIntent(incomingText) || (interaction && interaction.kind !== 'flow_response' && interaction.id === 'order:start')) {
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
      const qty =
        interaction && interaction.kind !== 'flow_response' && interaction.id.startsWith('qty:')
          ? parseQuantity(interaction.id.slice('qty:'.length))
          : parseQuantity(incomingText)
      if (qty == null) {
        await sendAndLog('text', 'Please enter a number (1 to 99) or tap a quantity button.')
        return { handled: true }
      }
      state.quantity = qty
      state.address = { ...(state.address ?? {}), phone: phoneToTenDigit(phone) }
      await saveOrderSession(phone, 'address_flow', state)
      await sendAddressFlow(phone, sendAndLog)
      await sendAndLog('text', `Great, ${qty} x ${state.productName ?? 'item'} (${state.variantLabel ?? 'Standard'}) = ${money(roundMoney((state.unitPrice ?? 0) * qty))} before shipping.`)
      return { handled: true }
    }

    case 'address_flow': {
      if (interaction?.kind === 'flow_response') {
        const data = interaction.data
        const fields: Array<{ valid: FieldValidation; label: string; value: string }> = [
          { label: 'full name', value: typeof data.full_name === 'string' ? data.full_name : '', valid: validateName(typeof data.full_name === 'string' ? data.full_name : '') },
          { label: 'address (house no / street / area)', value: typeof data.line1 === 'string' ? data.line1 : '', valid: validateLine1(typeof data.line1 === 'string' ? data.line1 : '') },
          { label: 'city', value: typeof data.city === 'string' ? data.city : '', valid: validateCity(typeof data.city === 'string' ? data.city : '') },
          { label: 'state', value: typeof data.state === 'string' ? data.state : '', valid: validateState(typeof data.state === 'string' ? data.state : '') },
          { label: 'pincode', value: typeof data.pincode === 'string' ? data.pincode : '', valid: validatePincode(typeof data.pincode === 'string' ? data.pincode : '') },
        ]
        const invalid = fields.find((f) => !f.valid.valid)
        if (invalid) {
          await sendAndLog('text', playfulInvalidInput(invalid.valid, invalid.value))
          await sendAddressFlow(phone, sendAndLog)
          return { handled: true }
        }
        state.address = {
          ...(state.address ?? {}),
          name: (typeof data.full_name === 'string' ? data.full_name : '').trim().slice(0, 80),
          line1: (typeof data.line1 === 'string' ? data.line1 : '').trim().slice(0, 160),
          line2: (typeof data.line2 === 'string' ? data.line2.trim() : '').slice(0, 160) || undefined,
          city: (typeof data.city === 'string' ? data.city : '').trim().slice(0, 60),
          state: (typeof data.state === 'string' ? data.state : '').trim().slice(0, 60),
          pincode: (typeof data.pincode === 'string' ? data.pincode : '').replace(/\D/g, '').slice(0, 6),
        }
        const availability = await checkPincodeAvailability(state)
        if (!availability.available) {
          await sendAndLog('text', availability.reason)
          return { handled: true }
        }
        await saveOrderSession(phone, 'confirm', state)
        await showConfirm(phone, userId, state, sendAndLog)
        return { handled: true }
      }
      // Text fallback: if the customer replies with text instead of opening the flow.
      if (incomingText) {
        await saveOrderSession(phone, 'address_name', state)
        await handleAddressName(phone, state, incomingText, sendAndLog)
        return { handled: true }
      }
      await sendAddressFlow(phone, sendAndLog)
      return { handled: true }
    }

    case 'address_name': {
      if (!incomingText) {
        await sendAndLog('text', "First up — who's the lucky human receiving this? 😄\n(Full name, please!)")
        return { handled: true }
      }
      await handleAddressName(phone, state, incomingText, sendAndLog)
      return { handled: true }
    }

    case 'address_line1': {
      if (!incomingText) return { handled: true }
      const validation = validateLine1(incomingText)
      if (!validation.valid) {
        await sendAndLog('text', playfulInvalidInput(validation, incomingText))
        return { handled: true }
      }
      const line1 = incomingText.slice(0, 160).trim()
      state.address = { ...(state.address ?? {}), line1 }
      await saveOrderSession(phone, 'address_line2', state)
      await sendAndLog('text', [
        'Got it, logged! 📝',
        '',
        '🗺️ Any landmark nearby? Think "Near ZP School" or "Opposite Blue Gate"',
        '',
        'Why: our delivery riders LOVE landmarks — it\u2019s basically their GPS backup plan 😅',
        '',
        '(or type *skip*, no worries!)',
      ].join('\n'))
      return { handled: true }
    }

    case 'address_line2': {
      if (!incomingText) return { handled: true }
      if (!/^(skip|none|n\/a|no)$/i.test(incomingText.trim())) {
        state.address = { ...(state.address ?? {}), line2: incomingText.slice(0, 160) }
      }
      await saveOrderSession(phone, 'address_city', state)
      await sendAndLog('text', [
        'Almost building your full address map 🧩',
        '',
        '🏙️ Which city are we delivering to?',
      ].join('\n'))
      return { handled: true }
    }

    case 'address_city': {
      if (!incomingText) return { handled: true }
      const validation = validateCity(incomingText)
      if (!validation.valid) {
        await sendAndLog('text', playfulInvalidInput(validation, incomingText))
        return { handled: true }
      }
      const city = incomingText.slice(0, 60).trim()
      state.address = { ...(state.address ?? {}), city }
      await saveOrderSession(phone, 'address_state', state)
      await sendAndLog('text', [
        'Nice! One more location piece 🌏',
        '',
        '📍 Your state? Full name or short code works —',
        'e.g. Maharashtra or MH',
        '',
        'Why it helps: we pick the fastest courier route + correct tax invoice 🧾',
      ].join('\n'))
      return { handled: true }
    }

    case 'address_state': {
      if (!incomingText) return { handled: true }
      const validation = validateState(incomingText)
      if (!validation.valid) {
        await sendAndLog('text', playfulInvalidInput(validation, incomingText))
        return { handled: true }
      }
      const stateName = incomingText.slice(0, 60).trim()
      state.address = { ...(state.address ?? {}), state: stateName }
      await saveOrderSession(phone, 'address_pincode', state)
      await sendAndLog('text', [
        'Home stretch! 🏁',
        '',
        '🔢 Your 6-digit pincode please —',
        'it\u2019s the secret code that tells our delivery partner EXACTLY which route to zoom down 🛵💨',
      ].join('\n'))
      return { handled: true }
    }

    case 'address_pincode': {
      if (!incomingText) return { handled: true }
      const validation = validatePincode(incomingText)
      if (!validation.valid) {
        await sendAndLog('text', playfulInvalidInput(validation, incomingText))
        return { handled: true }
      }
      const pincode = incomingText.replace(/\D/g, '').slice(0, 6)
      state.address = { ...(state.address ?? {}), pincode }

      // Verify delivery availability for this pincode before continuing
      const availability = await checkPincodeAvailability(state)
      if (!availability.available) {
        await sendAndLog('text', availability.reason)
        return { handled: true }
      }

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
          await sendAndLog('text', 'Order cancelled — no stress! 😊 Anything else I can help you with?')
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
            '🎊 *CHA-CHING! Payment received!*',
            `Order #${orderNumber}`,
            '',
            'Your order is being packed with love 📦💕',
            'We\u2019ll ping you here the second it ships, tracking link included! 🚀',
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

      const shipmentInfo = await checkShipmentStatus(orderId)
      if (shipmentInfo) {
        await sendAndLog('text', [
          `📦 *Order #${orderNumber}*`,
          `Fulfillment: ${shipmentInfo.fulfilmentStatus}`,
          shipmentInfo.trackingNumber ? `Tracking: ${shipmentInfo.trackingNumber}` : '',
          shipmentInfo.courierName ? `Courier: ${shipmentInfo.courierName}` : '',
          '',
          'Your order is on its way!',
        ].filter(Boolean).join('\n'))
        await clearOrderSession(phone)
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

async function handleTrackOrder(
  phone: string,
  userId: string | null,
  query: string,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>,
): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { data: order } = await supabase
    .from('shelf_orders')
    .select('id, order_number, order_status, fulfilment_status, payment_status, tracking_number, courier_name, tracking_url')
    .or(`order_number.eq.${query},id.eq.${query}`)
    .maybeSingle()

  if (!order) {
    await sendAndLog('text', `No order found for "${query}". Check the order number or try again.`)
    return
  }

  const status = order.fulfilment_status ?? order.order_status ?? 'unknown'
  const lines = [
    `📦 *Order #${order.order_number}*`,
    `Status: ${status}`,
    `Payment: ${order.payment_status ?? 'unknown'}`,
  ]

  if (order.tracking_number) {
    lines.push(`Tracking: ${order.tracking_number}`)
    lines.push(`Courier: ${order.courier_name ?? 'N/A'}`)
    if (order.tracking_url) lines.push(`Track live: ${order.tracking_url}`)
  }

  lines.push('', `View full details: /3d-shop/order/${order.id}`)

  await sendAndLog('text', lines.join('\n'))
}

async function checkPincodeAvailability(state: OrderState): Promise<{ available: boolean; reason: string }> {
  const pincode = state.address?.pincode
  const addressState = state.address?.state
  if (!pincode || !addressState) {
    return { available: true, reason: '' }
  }

  let subtotal = 0
  let weightGrams = 0
  if (state.items?.length) {
    for (const item of state.items) {
      subtotal += item.unitPrice * item.quantity
      weightGrams += item.weightGrams * item.quantity
    }
  } else {
    subtotal = (state.unitPrice ?? 0) * (state.quantity ?? 1)
  }
  subtotal = roundMoney(subtotal)

  try {
    const settings = await getSettings()
    const result = await calculateShippingFromRules({
      pincode,
      state: addressState,
      subtotal,
      weightGrams,
      settings,
    })
    return {
      available: result.available,
      reason: result.available
        ? ''
        : `${result.reason ?? 'Sorry, we cannot deliver to this pincode yet.'} Please share a different pincode or reach us at support for alternatives.`,
    }
  } catch (error) {
    console.error('[order-flow] Pincode availability check failed:', error)
    return { available: true, reason: '' }
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
  const brand = await getBrandName()
  const customerName = await getCustomerFirstName(phone)
  const itemLines = resolved.map((item) => {
    const amount = money(roundMoney(item.unitPrice * item.quantity))
    return [
      `• ${item.productName} (${item.variantLabel})`,
      `   Qty: ${item.quantity}  →  ${amount}`,
    ].join('\n')
  })
  const lines = [
    playfulGreeting(firstNameOf(customerName), brand),
    'Your cart just got a serious upgrade 🛍️',
    '',
    '━━━━━━━━━━━━━━━',
    ...itemLines,
    '━━━━━━━━━━━━━━━',
    '',
    `Subtotal: ${money(subtotal)}`,
    '',
    "Let's get this beauty to your doorstep! 🚚",
    'I just need 60 seconds of info from you — pinky promise, no boring forms 🤞',
  ]

  const state: OrderState = {
    items: resolved,
    address: { phone: phoneToTenDigit(phone) },
  }
  await saveOrderSession(phone, 'address_flow', state)
  await sendAndLog('text', lines.join('\n'))
  await sendAddressFlow(phone, sendAndLog)
}

async function showBrowse(
  phone: string,
  userId: string | null,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>,
  products?: Array<{ id: string; name: string; basePrice: number }>
) {
  const list = products && products.length > 0 ? products : await loadBrowseProducts()
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

async function handleAddressName(
  phone: string,
  state: OrderState,
  incomingText: string,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>,
) {
  const validation = validateName(incomingText)
  if (!validation.valid) {
    await sendAndLog('text', playfulInvalidInput(validation, incomingText))
    return
  }
  const name = incomingText.slice(0, 80).trim()
  state.address = { ...(state.address ?? {}), name }
  await saveOrderSession(phone, 'address_line1', state)
  await sendAndLog('text', [
    `Nice to meet you, ${name.slice(0, 40)}! ✅😎`,
    '',
    '📦 Now, where should your goodies call home?',
    'Drop your house/flat no., street & area below.',
    '',
    'Why we ask: this is exactly what goes on the shipping label — precision here = no lost packages! 🎯',
    '',
    'e.g. "80, Sawargaon, Tal. Chandanapuri Road"',
  ].join('\n'))
}

/**
 * Sends the WhatsApp Flow address form. Falls back to a plain text prompt
 * if no flow is configured or the send fails.
 */
export async function sendAddressFlow(
  phone: string,
  sendAndLog: (kind: 'text' | 'list' | 'buttons', body: string, extra?: Record<string, unknown>) => Promise<unknown>,
) {
  const flowId = process.env.WHATSAPP_ADDRESS_FLOW_ID?.trim() || ''
  if (!flowId) {
    await sendAndLog('text', "First up — who's the lucky human receiving this? 😄\n(Full name, please!)")
    return
  }
  const result = await sendWhatsAppFlow(phone, {
    flowId,
    flowToken: crypto.randomUUID(),
    cta: ADDRESS_FLOW_CTA,
    body: 'Tap below to fill in your delivery address.',
  })
  if (!result.ok) {
    await sendAndLog('text', "First up — who's the lucky human receiving this? 😄\n(Full name, please!)")
  }
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
    '🎉 Boom! Here\u2019s everything, all wrapped up:',
    '',
    '🧾 *ORDER SUMMARY*',
    '',
    ...itemLines,
    `Subtotal: ${money(preview.subtotal)}`,
  ]
  if (preview.available && preview.shippingCharge > 0) lines.push(`Shipping: ${money(preview.shippingCharge)}`)
  if (preview.available && preview.tax > 0) lines.push(`Tax: ${money(preview.tax)}`)
  if (!preview.available) lines.push(`Delivery: not available to this pincode (${preview.reason ?? ''})`)
  lines.push('', `*Total: ${money(preview.total)}*`, '')
  lines.push('📍 *Delivering to:*')
  lines.push(`${address.name ?? ''}`)
  lines.push(`${address.line1 ?? ''}`)
  if (address.line2) lines.push(`${address.line2}`)
  lines.push(`${[address.city, address.state, address.pincode].filter(Boolean).join(', ')}`)
  lines.push(`${address.phone ? `Phone: ${address.phone}` : ''}`)
  lines.push('', 'Everything looking spot on? 👀')

  await sendAndLog('text', lines.join('\n'))

  if (!preview.available) {
    await saveOrderSession(phone, 'address_pincode', state)
    await sendAndLog('text', 'Unfortunately we cannot deliver to this pincode yet. Please provide a different pincode or a nearby delivery address:')
    return
  }

  await sendWhatsAppButtons(phone, {
    body: 'Tap **Confirm & Pay** to lock in your order, **Edit Info** to fix anything, or **Cancel**.',
    buttons: [
      { id: 'confirm:yes', title: '🎯 Confirm & Pay' },
      { id: 'confirm:no', title: '✏️ Edit Info' },
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
    line2: address.line2 ?? '',
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
      '🥳 *Order Locked In!*',
      '',
      `Order ID: #${result.orderNumber}`,
      `Total: ${money(result.totalAmount)}`,
      '',
      "You're SO close to owning this! 🏺✨",
      'Tap below to pay securely — the link stays fresh for the next 15 mins ⏳',
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
      // Approved PAYMENT_LINK template primary (works outside the 24h window);
      // session-text fallback for in-window delivery if the template cannot send.
      const templateSent = await notifyWhatsAppPaymentLink({
        phone,
        orderNumber: result.orderNumber,
        paymentLink: paymentLink.shortUrl,
        userId: effectiveUserId,
      }).catch((err) => {
        console.error('[whatsapp] Payment link template failed:', err)
        return false
      })

      if (!templateSent) {
        const sent = await withRetry(() =>
          sendWhatsAppPaymentLink(
            phone,
            paymentLink.shortUrl,
            `🔗 *Tap here to pay for order ${result.orderNumber} securely*`
          ),
        )
        if (!sent.ok) {
          await sendAndLog('text', `Pay here for order ${result.orderNumber}: ${paymentLink.shortUrl}`)
        }
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

    await sendAndLog('text', "We\u2019ll ping you here the moment payment lands — and again the second it ships! 🚀")
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to place order.'
    console.error('[whatsapp] Order placement failed:', message)
    await clearOrderSession(phone)
    await sendAndLog('text', `Oops 🙈 we could not place the order just now: ${message}. No payment was taken — please try again in a minute, or tap **Edit Info** to review your details.`)
  }
}
